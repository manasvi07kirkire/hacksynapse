import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { db } from "../db";
import { authenticate, Actor } from "../auth/api-key";
import { AppError, errorCode, fail, logEvent } from "./errors";
export async function readBody(req: Request, max = 65536): Promise<string> {
  if (Number(req.headers.get("content-length")) > max)
    fail(413, "BODY_TOO_LARGE", "Request body is too large.");
  const reader = req.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    void reader.cancel();
  }, 10000);
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        fail(413, "BODY_TOO_LARGE", "Request body is too large.");
      }
      chunks.push(value);
    }
    if (timedOut) fail(408, "BODY_TIMEOUT", "Request body timed out.");
    return new TextDecoder("utf-8", { fatal: true }).decode(
      Buffer.concat(chunks),
    );
  } finally {
    clearTimeout(timer);
  }
}
export async function jsonBody<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<z.output<S>> {
  if (
    req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    fail(415, "CONTENT_TYPE", "Use application/json.");
  let value: unknown;
  try {
    value = JSON.parse(await readBody(req));
  } catch (e) {
    if (e instanceof AppError) throw e;
    fail(400, "INVALID_JSON", "Invalid JSON body.");
  }
  return schema.parse(value);
}
export function query<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
): z.output<S> {
  const params = new URL(req.url).searchParams;
  if (Array.from(params.keys()).some((k) => params.getAll(k).length > 1))
    fail(400, "INVALID_INPUT", "Duplicate query parameter.");
  return schema.parse(Object.fromEntries(params));
}
export async function rateLimit(key: string, limit = 60) {
  try {
    const window = Math.floor(Date.now() / 60000);
    const bucket = await db.rateBucket.upsert({
      where: {
        key: createHash("sha256").update(`${key}:${window}`).digest("hex"),
      },
      create: {
        key: createHash("sha256").update(`${key}:${window}`).digest("hex"),
        expiresAt: new Date((window + 2) * 60000),
      },
      update: { count: { increment: 1 } },
    });
    if (bucket.count > limit)
      fail(429, "RATE_LIMITED", "Too many requests. Retry in one minute.");
  } catch (e) {
    if (e instanceof AppError && e.code === "RATE_LIMITED") throw e;
    logEvent({
      event: "rate_limit_skipped",
      code: e instanceof Error ? e.message : "DATABASE_UNAVAILABLE",
    });
  }
}
export function api(
  handler: (req: Request, actor: Actor, requestId: string) => Promise<unknown>,
  options: { public?: boolean; limit?: number; status?: number } = {},
) {
  return async (req: Request) => {
    const requestId = randomUUID();
    const started = Date.now();
    const headers = {
      "Cache-Control": "no-store, private",
      "X-Request-Id": requestId,
      "X-Content-Type-Options": "nosniff",
    };
    try {
      const actor = options.public
        ? { id: "public", admin: false }
        : authenticate(req);
      if (!options.public)
        await rateLimit(
          `${actor.id}:${new URL(req.url).pathname}`,
          options.limit,
        );
      const result = await handler(req, actor, requestId);
      if (result instanceof Response) {
        Object.entries(headers).forEach(([k, v]) => result.headers.set(k, v));
        return result;
      }
      return Response.json(result, { status: options.status || 200, headers });
    } catch (e) {
      const err =
        e instanceof AppError
          ? e
          : e instanceof z.ZodError
            ? new AppError(400, "INVALID_INPUT", "Invalid request parameters.")
            : new AppError(
                500,
                "INTERNAL_ERROR",
                "Operation failed. Use the request ID when contacting the operator.",
              );
      logEvent({
        event: "request_failed",
        requestId,
        code: errorCode(err),
        durationMs: Date.now() - started,
      });
      return Response.json(
        { error: err.message, code: err.code, requestId },
        {
          status: err.status,
          headers: {
            ...headers,
            ...(err.status === 429 ? { "Retry-After": "60" } : {}),
          },
        },
      );
    }
  };
}
