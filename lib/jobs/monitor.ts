import { db } from "../db";
export async function workerPulse(id: string, status = "RUNNING") {
  await db.$executeRaw`INSERT INTO "WorkerHeartbeat" (id,"seenAt",status) VALUES (${id},clock_timestamp(),${status}) ON CONFLICT (id) DO UPDATE SET "seenAt"=clock_timestamp(), status=${status}`;
}
export async function queueHealth(projectId?: string) {
  const [workers, counts, oldest, stale] = await Promise.all([
    db.$queryRaw<
      { count: bigint }[]
    >`SELECT count(*) FROM "WorkerHeartbeat" WHERE status='RUNNING' AND "seenAt">clock_timestamp()-interval '90 seconds'`,
    db.analysisJob.groupBy({
      by: ["status"],
      where: { ...(projectId ? { projectId } : {}) },
      _count: true,
    }),
    db.analysisJob.findFirst({
      where: { status: "QUEUED", ...(projectId ? { projectId } : {}) },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    db.analysisJob.count({
      where: {
        status: "RUNNING",
        leaseUntil: { lt: new Date() },
        ...(projectId ? { projectId } : {}),
      },
    }),
  ]);
  return {
    activeWorkers: Number(workers[0].count),
    jobs: Object.fromEntries(counts.map((c) => [c.status, c._count])),
    oldestQueuedSeconds: oldest
      ? Math.max(
          0,
          Math.floor((Date.now() - oldest.createdAt.getTime()) / 1000),
        )
      : 0,
    expiredLeases: stale,
  };
}
