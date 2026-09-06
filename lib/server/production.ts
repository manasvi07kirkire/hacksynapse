import { createPrivateKey } from "node:crypto";
import { getConfig } from "./config";
import { fail } from "./errors";
import { isFreeModel } from "../llm/free-models";

export function productionRequirements() {
  getConfig();
  const missing = [
    "DATABASE_URL",
    "DIRECT_URL",
    "GITHUB_APP_ID",
    "GITHUB_APP_PRIVATE_KEY",
    "GITHUB_APP_SLUG",
    "GITHUB_APP_WEBHOOK_SECRET",
    "OPENROUTER_API_KEY",
    "NEXT_PUBLIC_APP_URL",
  ].filter((name) => !process.env[name]);
  if (missing.length)
    fail(
      503,
      "PRODUCTION_CONFIG_REQUIRED",
      `Configure required environment variables: ${missing.join(", ")}.`,
    );
  const preferred = process.env.OPENROUTER_MODEL?.trim();
  if (preferred && !isFreeModel(preferred))
    fail(
      503,
      "LLM_CONFIG_INVALID",
      "OPENROUTER_MODEL must be a :free OpenRouter model ID.",
    );
  if (
    !/^\d+$/.test(process.env.GITHUB_APP_ID!) ||
    process.env.GITHUB_APP_WEBHOOK_SECRET!.length < 32
  )
    fail(
      503,
      "GITHUB_CONFIG_INVALID",
      "Configure a numeric App ID and a webhook secret of at least 32 characters.",
    );
  try {
    const key = createPrivateKey(
      process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    );
    if (
      key.asymmetricKeyType !== "rsa" ||
      (key.asymmetricKeyDetails?.modulusLength || 0) < 2048
    )
      throw new Error();
    const app = new URL(process.env.NEXT_PUBLIC_APP_URL!);
    if (app.protocol !== "https:" || app.username || app.password)
      throw new Error();
    for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
      const connection = new URL(process.env[name]!);
      if (
        !connection.protocol.startsWith("postgres") ||
        !connection.password ||
        connection.searchParams.get("sslmode") !== "require"
      )
        throw new Error();
    }
  } catch {
    fail(
      503,
      "PRODUCTION_CONFIG_INVALID",
      "Use an RSA App key, HTTPS application URL and TLS PostgreSQL connections.",
    );
  }
}
