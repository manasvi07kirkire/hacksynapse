import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const envFile = readFileSync(".env", "utf8");
const env: Record<string, string> = {};
for (const line of envFile.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const match =
    /^([A-Z0-9_]+)=(?:\"(.*)\"|'(.*)'|([^#\s]+))$/.exec(trimmed);
  if (match) env[match[1]] = match[2] ?? match[3] ?? match[4] ?? "";
}

/** Supabase transaction pooler for Vercel serverless (port 6543, limit 1). */
function vercelDatabaseUrl(directUrl: string): string {
  return directUrl
    .replace("@aws-0-ap-southeast-2.pooler.supabase.com:5432/", "@aws-0-ap-southeast-2.pooler.supabase.com:6543/")
    .replace(/\?.*$/, "")
    .concat(
      "?pgbouncer=true&connection_limit=1&pool_timeout=20&connect_timeout=10&sslmode=require",
    );
}

const productionSafe: Record<string, string> = {
  SEARCHOPS_LOCAL_DEMO: "false",
  SEARCHOPS_ALLOW_PRIVATE_CRAWL: "false",
  SEARCHOPS_ALLOW_PAT: "false",
  OPENROUTER_MODEL: "liquid/lfm-2.5-2.6b:free",
  NEXT_PUBLIC_APP_URL: "https://searchops-vert.vercel.app",
};

const values: Record<string, string> = {
  ...productionSafe,
  DIRECT_URL: env.DIRECT_URL,
  DATABASE_URL: vercelDatabaseUrl(env.DIRECT_URL || env.DATABASE_URL),
  SEARCHOPS_API_KEY: env.SEARCHOPS_API_KEY,
  SEARCHOPS_PROJECT_KEYS: env.SEARCHOPS_PROJECT_KEYS || "{}",
  OPENROUTER_API_KEY: env.OPENROUTER_API_KEY,
  GITHUB_APP_ID: env.GITHUB_APP_ID,
  GITHUB_APP_SLUG: env.GITHUB_APP_SLUG,
  GITHUB_APP_WEBHOOK_SECRET: env.GITHUB_APP_WEBHOOK_SECRET,
  GITHUB_APP_PRIVATE_KEY: env.GITHUB_APP_PRIVATE_KEY,
  ALLOW_LLM_FALLBACK: env.ALLOW_LLM_FALLBACK || "false",
};

function upsert(name: string, value: string) {
  spawnSync("npx", ["vercel", "env", "rm", name, "production", "--yes"], {
    stdio: "inherit",
    shell: true,
  });
  const result = spawnSync(
    "npx",
    ["vercel", "env", "add", name, "production"],
    {
      input: value,
      encoding: "utf8",
      shell: true,
    },
  );
  if (result.status !== 0) {
    console.error(`Failed to set ${name}`);
    process.exitCode = 1;
    return;
  }
  console.info(`Set ${name} on production`);
}

for (const [key, value] of Object.entries(values)) {
  if (!value) {
    console.warn(`Skipping ${key}: missing value`);
    continue;
  }
  upsert(key, value);
}

console.info("Done. Redeploy production for changes to take effect.");
