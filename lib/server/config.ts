import { z } from "zod";
import { AppError } from "./errors";

const schema = z.object({
  NODE_ENV: z.string().optional(),
  SEARCHOPS_API_KEY: z.string().min(32),
  SEARCHOPS_PROJECT_KEYS: z.string().default("{}"),
  SEARCHOPS_LOCAL_DEMO: z.enum(["true", "false"]).default("false"),
  SEARCHOPS_ALLOW_PRIVATE_CRAWL: z.enum(["true", "false"]).default("false"),
  SEARCHOPS_ALLOW_PAT: z.enum(["true", "false"]).default("false"),
  ALLOW_LLM_FALLBACK: z.enum(["false"]).default("false"),
  USE_PLAYWRIGHT: z.enum(["false"]).default("false"),
});
export function getConfig() {
  if (typeof window !== "undefined")
    throw new Error("Server configuration cannot be used in a browser.");
  const parsed = schema.safeParse(process.env);
  if (!parsed.success)
    throw new AppError(
      503,
      "CONFIGURATION_REQUIRED",
      "Server configuration is incomplete or unsafe.",
    );
  const c = parsed.data;
  if (
    c.NODE_ENV === "production" &&
    [
      c.SEARCHOPS_LOCAL_DEMO,
      c.SEARCHOPS_ALLOW_PRIVATE_CRAWL,
      c.SEARCHOPS_ALLOW_PAT,
    ].includes("true")
  )
    throw new AppError(
      503,
      "UNSAFE_CONFIGURATION",
      "Production configuration is unsafe.",
    );
  if (
    c.NODE_ENV === "production" &&
    (!/^postgres(?:ql)?:\/\//.test(process.env.DATABASE_URL || "") ||
      !/^postgres(?:ql)?:\/\//.test(process.env.DIRECT_URL || ""))
  )
    throw new AppError(
      503,
      "DATABASE_CONFIGURATION_REQUIRED",
      "Configure PostgreSQL runtime and direct migration connections.",
    );
  let keys: Record<string, string>;
  try {
    keys = z
      .record(z.string().min(32))
      .parse(JSON.parse(c.SEARCHOPS_PROJECT_KEYS));
  } catch {
    throw new AppError(
      503,
      "CONFIGURATION_REQUIRED",
      "Project credentials are invalid.",
    );
  }
  const values = Object.values(keys);
  if (
    values.includes(c.SEARCHOPS_API_KEY) ||
    new Set(values).size !== values.length
  )
    throw new AppError(
      503,
      "CONFIGURATION_REQUIRED",
      "Project credentials must be distinct.",
    );
  return { ...c, projectKeys: keys };
}
