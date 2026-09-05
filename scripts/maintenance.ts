import { db } from "../lib/db";
import { getConfig } from "../lib/server/config";
import { logEvent } from "../lib/server/errors";
async function main() {
  getConfig();
  await db.rateBucket.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  logEvent({
    event: "maintenance_completed",
    outcome: "expired_rate_buckets_removed",
  });
}
main()
  .catch(() => {
    logEvent({ event: "maintenance_failed", code: "DATABASE_UNAVAILABLE" });
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
