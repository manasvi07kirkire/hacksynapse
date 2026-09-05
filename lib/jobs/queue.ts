import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db, dbTransaction } from "../db";
import { sha, branch } from "../server/validation";
import { AppError, fail } from "../server/errors";
import { configurationKey } from "../projects/configuration";
export const ANALYSIS_VERSION = "analysis-v2";
export const jobPayload = z
  .object({
    sha,
    baseSha: sha.optional(),
    ref: branch,
    commitMsg: z.string().max(500),
    author: z.string().max(100),
    forced: z.boolean().default(false),
  })
  .strict();
export type JobPayload = z.infer<typeof jobPayload>;
export async function transactionRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (
        !(e instanceof Prisma.PrismaClientKnownRequestError) ||
        !["P2034", "P2002"].includes(e.code) ||
        attempt >= 4
      )
        throw e;
      await new Promise((r) =>
        setTimeout(r, 20 * 2 ** attempt + Math.random() * 30),
      );
    }
  }
}
export async function enqueueAnalysis(
  projectId: string,
  input: JobPayload,
  delivery?: { id: string; event: string; repo: string },
  analysisVersion = ANALYSIS_VERSION,
) {
  const payload = jobPayload.parse(input);
  return transactionRetry(() =>
    db.$transaction(
      async (tx) => {
        if (delivery) {
          const existing = await tx.webhookDelivery.findUnique({
            where: { id: delivery.id },
            include: { job: true },
          });
          if (existing) {
            if (
              existing.repo !== delivery.repo ||
              existing.event !== delivery.event ||
              existing.job.projectId !== projectId
            )
              fail(409, "DELIVERY_CONFLICT", "Delivery identity conflicts.");
            return existing.job;
          }
        }
        // Atomic row increment serializes both dedup and deployment number allocation per project.
        const project = await tx.project.update({
          where: { id: projectId, enabled: true },
          data: { deployCounter: { increment: 1 } },
        });
        const version = `${analysisVersion}-${configurationKey(project)}`;
        let deployment = await tx.deployment.findUnique({
          where: {
            projectId_sha_analysisVersion: {
              projectId,
              sha: payload.sha,
              analysisVersion: version,
            },
          },
        });
        if (deployment)
          await tx.project.update({
            where: { id: projectId },
            data: { deployCounter: { decrement: 1 } },
          });
        else
          deployment = await tx.deployment.create({
            data: {
              projectId,
              sha: payload.sha,
              ref: payload.ref,
              deployNumber: project.deployCounter,
              commitMsg: payload.commitMsg,
              author: payload.author,
              status: "QUEUED",
              analysisVersion: version,
            },
          });
        const job = await tx.analysisJob.upsert({
          where: { deploymentId: deployment.id },
          update: {},
          create: {
            projectId,
            deploymentId: deployment.id,
            payload: JSON.stringify(payload),
          },
        });
        if (delivery)
          await tx.webhookDelivery.create({
            data: { ...delivery, jobId: job.id },
          });
        return job;
      },
      { isolationLevel: "ReadCommitted", ...dbTransaction },
    ),
  );
}
export const LEASE_MS = 180000;
export async function claimJob() {
  return db.$transaction(
    async (tx) => {
    const [{ now }] = await tx.$queryRaw<
      { now: Date }[]
    >`SELECT clock_timestamp() AS now`;
    const candidates = await tx.$queryRaw<
      { id: string }[]
    >`SELECT p.id FROM "Project" p WHERE p.enabled = true AND (p."leaseUntil" IS NULL OR p."leaseUntil" < ${now}) AND EXISTS (SELECT 1 FROM "AnalysisJob" j WHERE j."projectId" = p.id AND j.status IN ('QUEUED','RUNNING')) ORDER BY p."createdAt", p.id FOR UPDATE SKIP LOCKED LIMIT 20`;
    for (const p of candidates) {
      const job = await tx.analysisJob.findFirst({
        where: { projectId: p.id, status: { in: ["QUEUED", "RUNNING"] } },
        orderBy: [{ deployment: { deployNumber: "asc" } }, { id: "asc" }],
      });
      if (
        !job ||
        job.availableAt > now ||
        (job.leaseUntil && job.leaseUntil > now)
      )
        continue;
      if (job.attempts >= 3) {
        await tx.analysisJob.update({
          where: { id: job.id },
          data: {
            status: "FAILED",
            errorCode: "RETRIES_EXHAUSTED",
            leaseToken: null,
            leaseUntil: null,
          },
        });
        await tx.deployment.update({
          where: { id: job.deploymentId },
          data: {
            status: "FAILED",
            errorCode: "RETRIES_EXHAUSTED",
            completedAt: now,
          },
        });
        await tx.project.update({
          where: { id: p.id },
          data: { leaseToken: null, leaseUntil: null },
        });
        continue;
      }
      const leaseToken = randomUUID();
      const leaseUntil = new Date(Date.now() + LEASE_MS);
      await tx.project.update({
        where: { id: p.id },
        data: { leaseToken, leaseUntil },
      });
      await tx.deployment.update({
        where: { id: job.deploymentId },
        data: { status: "RUNNING", startedAt: now, errorCode: null },
      });
      return tx.analysisJob.update({
        where: { id: job.id },
        data: {
          status: "RUNNING",
          attempts: { increment: 1 },
          leaseToken,
          leaseUntil,
        },
      });
    }
    return null;
  }, dbTransaction);
}
export async function heartbeat(job: {
  id: string;
  projectId: string;
  leaseToken: string | null;
}) {
  return db.$transaction(async (tx) => {
    const leaseUntil = new Date(Date.now() + LEASE_MS);
    const p = await tx.project.updateMany({
      where: {
        id: job.projectId,
        leaseToken: job.leaseToken,
        leaseUntil: { gt: new Date() },
      },
      data: { leaseUntil },
    });
    if (p.count !== 1)
      throw new AppError(409, "LEASE_LOST", "Job lease expired.");
    await tx.analysisJob.update({
      where: { id: job.id, leaseToken: job.leaseToken },
      data: { leaseUntil },
    });
  }, dbTransaction);
}
