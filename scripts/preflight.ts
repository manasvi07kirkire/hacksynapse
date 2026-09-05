import { productionRequirements } from "../lib/server/production";
import { db } from "../lib/db";
import { AppError } from "../lib/server/errors";
async function main() {
  productionRequirements();
  console.info("PASS production environment invariants (values redacted)");
  if (process.argv.includes("--database")) {
    await db.$queryRaw`SELECT 1`;
    await db.workerHeartbeat.count();
    await db.recovery.count();
    console.info("PASS PostgreSQL connectivity and production schema");
  }
}
main()
  .catch((error) => {
    console.error(
      error instanceof AppError
        ? `${error.code}: ${error.message}`
        : "PREFLIGHT_FAILED: verify database access and deployed migrations.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
