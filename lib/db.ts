import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [], // Errors are emitted through the sanitized application event logger.
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
