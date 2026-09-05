import { createHash, randomUUID } from "node:crypto";
import { db } from "../db";
import { transactionRetry } from "../jobs/queue";
import { fail, logEvent } from "./errors";
export const hash = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
export async function operation<T>(
  projectId: string,
  actor: string,
  action: string,
  identity: unknown,
  parameters: unknown,
  run: (key: string) => Promise<T>,
): Promise<T> {
  const key = hash({ projectId, action, identity });
  const requestHash = hash(parameters);
  const token = randomUUID();
  const claimed = await transactionRetry(() =>
    db.$transaction(
      async (tx) => {
        const existing = await tx.operation.findUnique({ where: { key } });
        if (existing) {
          if (existing.requestHash !== requestHash)
            fail(
              409,
              "IDEMPOTENCY_CONFLICT",
              "This operation has different parameters.",
            );
          if (existing.status === "COMPLETE")
            return { replay: existing.response };
          if (existing.leaseUntil > new Date())
            fail(409, "OPERATION_RUNNING", "Operation is already running.");
          await tx.operation.update({
            where: { key },
            data: {
              leaseToken: token,
              leaseUntil: new Date(Date.now() + 300000),
              status: "RUNNING",
            },
          });
        } else
          await tx.operation.create({
            data: {
              key,
              projectId,
              actor,
              action,
              requestHash,
              leaseToken: token,
              leaseUntil: new Date(Date.now() + 300000),
            },
          });
        return { replay: null };
      },
      { isolationLevel: "Serializable" },
    ),
  );
  if (claimed.replay) return JSON.parse(claimed.replay) as T;
  try {
    const result = await run(key);
    await db.operation.update({
      where: { key, leaseToken: token },
      data: { status: "COMPLETE", response: JSON.stringify(result) },
    });
    return result;
  } catch (e) {
    await db.operation
      .updateMany({
        where: { key, leaseToken: token },
        data: { status: "FAILED", leaseUntil: new Date(0) },
      })
      .catch(() =>
        logEvent({
          event: "operation_cleanup_failed",
          code: "DATABASE_UNAVAILABLE",
        }),
      );
    throw e;
  }
}
