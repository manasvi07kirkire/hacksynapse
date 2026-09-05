import { runOneJob } from "../lib/pipeline/run-deployment-analysis";
import { db } from "../lib/db";
import { getConfig } from "../lib/server/config";
import { logEvent } from "../lib/server/errors";
import { randomUUID } from "node:crypto";
import { workerPulse, queueHealth } from "../lib/jobs/monitor";
import { productionRequirements } from "../lib/server/production";
async function main() {
  getConfig();
  if (process.env.NODE_ENV === "production") productionRequirements();
  const workerId = randomUUID();
  await workerPulse(workerId);
  let heartbeatMisses = 0;
  const pulse = setInterval(() => {
    void workerPulse(workerId)
      .then(() => {
        heartbeatMisses = 0;
      })
      .catch(() => {
        heartbeatMisses += 1;
      });
  }, 15000);
  let lastMonitor = 0;
  let stopping = false;
  process.on("SIGINT", () => {
    stopping = true;
  });
  process.on("SIGTERM", () => {
    stopping = true;
  });
  try {
    while (!stopping) {
      if (heartbeatMisses >= 10) throw new Error("Heartbeat failed");
      try {
        if (Date.now() - lastMonitor > 60000) {
          const health = await queueHealth();
          logEvent({ event: "queue_health", outcome: JSON.stringify(health) });
          if (health.oldestQueuedSeconds > 300 || health.expiredLeases > 0)
            logEvent({ event: "queue_alert", code: "QUEUE_STALLED" });
          lastMonitor = Date.now();
        }
        if (!(await runOneJob())) await new Promise((r) => setTimeout(r, 1000));
      } catch (e) {
        logEvent({
          event: "worker_loop_error",
          code: e instanceof Error ? e.message : "unknown",
        });
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  } finally {
    clearInterval(pulse);
    await workerPulse(workerId, "STOPPED").catch(() => {});
    await db.$disconnect();
  }
}
main().catch(async (e) => {
  logEvent({
    event: "worker_stopped",
    code: "WORKER_FATAL",
    outcome: e instanceof Error ? e.message : "unknown",
  });
  await db.$disconnect();
  process.exitCode = 1;
});
