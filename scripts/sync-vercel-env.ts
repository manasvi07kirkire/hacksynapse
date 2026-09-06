import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const appUrl = process.argv[2] || "https://searchops-vert.vercel.app";
const envPath = join(root, ".env");

function parseEnv(text: string) {
  const vars: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key) vars[key] = val;
  }
  return vars;
}

const vars = parseEnv(readFileSync(envPath, "utf8"));
vars.NEXT_PUBLIC_APP_URL = appUrl;
vars.SEARCHOPS_ALLOW_PAT = "false";
vars.SEARCHOPS_LOCAL_DEMO = "false";
vars.SEARCHOPS_ALLOW_PRIVATE_CRAWL = "false";
if (vars.DATABASE_URL?.includes(":5432/")) {
  vars.DATABASE_URL = vars.DATABASE_URL.replace(":5432/", ":6543/");
}

const skip = new Set(["NODE_ENV"]);
const targets = ["production", "preview"] as const;

for (const target of targets) {
  for (const [key, value] of Object.entries(vars)) {
    if (skip.has(key) || !value) continue;
    console.info(`Setting ${key} (${target})...`);
    const result = spawnSync(
      "npx",
      ["vercel", "env", "add", key, target, "--force", "--yes"],
      {
        cwd: root,
        input: value,
        encoding: "utf8",
        shell: true,
        stdio: ["pipe", "inherit", "inherit"],
      },
    );
    if (result.status !== 0) {
      console.error(`Failed to set ${key} for ${target}`);
      process.exitCode = 1;
    }
  }
}

console.info("Environment sync complete. Redeploy with: npx vercel deploy --prod --yes");
