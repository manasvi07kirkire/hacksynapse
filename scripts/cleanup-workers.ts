import { PrismaClient } from "@prisma/client";

async function main() {
  const db = new PrismaClient();
  await db.$queryRaw`SELECT 1`;
  console.log("DB ok");
  const stopped = await db.$executeRaw`
    UPDATE "WorkerHeartbeat"
    SET status = 'STOPPED'
    WHERE status = 'RUNNING'
  `;
  console.log("Stopped stale worker rows:", stopped);
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
