import { api } from "../../../lib/server/api";
import { db } from "../../../lib/db";
import { queueHealth } from "../../../lib/jobs/monitor";
import { productionRequirements } from "../../../lib/server/production";
import { fail } from "../../../lib/server/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = api(async () => {
  await db.$queryRaw`SELECT 1`;
  if (process.env.NODE_ENV === "production") {
    productionRequirements();
    const health = await queueHealth();
    if (!health.activeWorkers || health.oldestQueuedSeconds > 300)
      fail(
        503,
        "WORKER_NOT_READY",
        "Analysis worker is unavailable or backlogged.",
      );
  }
  return { status: "ready" };
});
