import { z } from "zod";
export const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
export const sha = z
  .string()
  .regex(/^[0-9a-fA-F]{40}$/)
  .transform((v) => v.toLowerCase());
export const repo = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})\/[a-zA-Z0-9_.-]{1,100}$/)
  .refine((v) => !v.endsWith("/.") && !v.endsWith("/.."))
  .transform((v) => v.toLowerCase());
export const selector = z.object({
  projectId: id.optional(),
  repo: repo.optional(),
});
export const text = z.string().trim().min(1).max(500);
export const branch = z
  .string()
  .min(1)
  .max(200)
  .refine(
    (v) =>
      !/[\s~^:?*\[\\\x00-\x1f]/.test(v) &&
      !v.includes("..") &&
      !v.includes("@{") &&
      !v.includes("//") &&
      !v
        .split("/")
        .some((p) => p.startsWith(".") || p.endsWith(".lock") || !p) &&
      !v.endsWith(".") &&
      v !== "@",
  );
export const routePath = z
  .string()
  .max(500)
  .refine(
    (v) =>
      v.startsWith("/") &&
      !v.startsWith("//") &&
      !/[\\?#\x00-\x20]/.test(v) &&
      !/%(?:2e|2f|5c|25)/i.test(v) &&
      !v.split("/").includes(".."),
  );
export const url = z
  .string()
  .max(2048)
  .url()
  .refine((v) => {
    const u = new URL(v);
    return (
      ["http:", "https:"].includes(u.protocol) &&
      !u.username &&
      !u.password &&
      !u.hash
    );
  });
export const pageQuery = selector
  .extend({
    deployNumber: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: id.optional(),
    detail: z.enum(["summary", "full"]).default("full"),
  })
  .strict();
