#!/usr/bin/env node
/** Start the analysis worker against production Supabase + Vercel API config. */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const env: Record<string, string> = {};
for (const line of readFileSync(resolve(root, ".env"), "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const match =
    /^([A-Z0-9_]+)=(?:\"(.*)\"|'(.*)'|([^#\s]+))$/.exec(trimmed);
  if (match) env[match[1]] = match[2] ?? match[3] ?? match[4] ?? "";
}

Object.assign(env, {
  NODE_ENV: "production",
  SEARCHOPS_LOCAL_DEMO: "false",
  SEARCHOPS_ALLOW_PAT: "false",
  SEARCHOPS_ALLOW_PRIVATE_CRAWL: "false",
  NEXT_PUBLIC_APP_URL: "https://searchops-vert.vercel.app",
  OPENROUTER_MODEL: "liquid/lfm-2.5-2.6b:free",
});

// Prefer the pooler URL for local workers; Supabase direct (5432) is often unreachable off-Vercel.
if (env.DATABASE_URL && !env.DATABASE_URL.includes("connection_limit=")) {
  env.DATABASE_URL = `${env.DATABASE_URL}${env.DATABASE_URL.includes("?") ? "&" : "?"}connection_limit=2`;
}

const child = spawn("node", ["--import", "tsx", "scripts/worker.ts"], {
  cwd: root,
  env: { ...process.env, ...env },
  stdio: "inherit",
});

child.on("exit", (code) => process.exit(code ?? 0));
