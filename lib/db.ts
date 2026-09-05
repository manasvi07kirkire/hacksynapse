import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Interactive transactions require session/direct Postgres, not transaction pooler mode. */
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/** Shared options for long-running worker transactions on Supabase. */
export const dbTransaction = {
  maxWait: 20_000,
  timeout: 120_000,
} as const;
