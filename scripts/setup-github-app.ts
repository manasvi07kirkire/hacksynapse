import { createServer } from "node:http";
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://searchops-vert.vercel.app";
const WEBHOOK_URL = `${APP_URL.replace(/\/$/, "")}/api/webhooks/github`;
const CALLBACK_PORT = Number(process.env.GITHUB_APP_CALLBACK_PORT || 9876);
const CALLBACK_URL = `http://127.0.0.1:${CALLBACK_PORT}/callback`;
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

function openBrowser(path: string) {
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", path], { detached: true, stdio: "ignore" });
  } else if (process.platform === "darwin") {
    spawn("open", [path], { detached: true, stdio: "ignore" });
  } else {
    spawn("xdg-open", [path], { detached: true, stdio: "ignore" });
  }
}

function pushVercelEnv(key: string, value: string, target: "production" | "preview") {
  const result = spawnSync(
    "npx",
    ["vercel", "env", "add", key, target, "--force", "--yes"],
    {
      cwd: ROOT,
      input: value,
      encoding: "utf8",
      shell: true,
      stdio: ["pipe", "inherit", "inherit"],
    },
  );
  if (result.status !== 0) throw new Error(`Failed to set Vercel env ${key} (${target})`);
}

function updateLocalEnv(vars: Record<string, string>) {
  const envPath = join(ROOT, ".env");
  let text = "";
  try {
    text = readFileSync(envPath, "utf8");
  } catch {
    text = "";
  }
  for (const [key, value] of Object.entries(vars)) {
    const line = `${key}="${value.replace(/"/g, '\\"')}"`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    text = pattern.test(text)
      ? text.replace(pattern, line)
      : `${text.trimEnd()}\n${line}\n`;
  }
  writeFileSync(envPath, text.endsWith("\n") ? text : `${text}\n`, "utf8");
}

async function convertManifest(code: string) {
  const res = await fetch(
    `https://api.github.com/app-manifests/${encodeURIComponent(code)}/conversions`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "searchops-setup",
      },
    },
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `GitHub manifest conversion failed (${res.status}): ${JSON.stringify(data)}`,
    );
  }
  return data as {
    id: number;
    slug: string;
    pem: string;
    webhook_secret: string;
    html_url?: string;
  };
}

async function main() {
  const htmlPath = join(ROOT, "scripts", "register-github-app.html");
  if (!readFileSync(htmlPath, "utf8").includes("SearchOps")) {
    throw new Error(`Missing ${htmlPath}`);
  }

  console.info("SearchOps GitHub App setup");
  console.info(`Webhook URL: ${WEBHOOK_URL}`);
  console.info(`Callback:    ${CALLBACK_URL}`);
  console.info("");
  console.info("1. This terminal will wait for GitHub to redirect back.");
  console.info("2. Your browser will open — click Register on GitHub, then Create GitHub App.");
  console.info("");

  openBrowser(htmlPath);

  const code = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timed out waiting for GitHub callback (5 minutes).")),
      5 * 60 * 1000,
    );
    const server = createServer((req, res) => {
      const url = new URL(req.url || "/", CALLBACK_URL);
      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const manifestCode = url.searchParams.get("code");
      if (!manifestCode) {
        res.writeHead(400);
        res.end("Missing code");
        reject(new Error("GitHub callback missing code parameter."));
        clearTimeout(timer);
        server.close();
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        "<html><body><h1>SearchOps GitHub App registered</h1><p>You can close this tab and return to the terminal.</p></body></html>",
      );
      clearTimeout(timer);
      server.close();
      resolve(manifestCode);
    });
    server.listen(CALLBACK_PORT, "127.0.0.1", () => {
      console.info(`Listening for GitHub callback on ${CALLBACK_URL}`);
    });
    server.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  console.info("Exchanging manifest code for app credentials…");
  const app = await convertManifest(code);
  const privateKeyOneLine = app.pem.replace(/\r?\n/g, "\\n");
  const envVars = {
    GITHUB_APP_ID: String(app.id),
    GITHUB_APP_SLUG: app.slug,
    GITHUB_APP_WEBHOOK_SECRET: app.webhook_secret,
    GITHUB_APP_PRIVATE_KEY: privateKeyOneLine,
  };

  console.info(`App ID:   ${app.id}`);
  console.info(`Slug:     ${app.slug}`);
  console.info(`Install:  https://github.com/apps/${app.slug}/installations/new`);

  updateLocalEnv(envVars);
  console.info("Updated local .env");

  for (const target of ["production", "preview"] as const) {
    for (const [key, value] of Object.entries(envVars)) {
      console.info(`Setting Vercel ${key} (${target})…`);
      pushVercelEnv(key, value, target);
    }
  }

  console.info("Redeploying production…");
  const deploy = spawnSync("npx", ["vercel", "deploy", "--prod", "--yes"], {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
    stdio: "inherit",
  });
  if (deploy.status !== 0) {
    console.warn("Vercel redeploy failed — env vars are set; run: npx vercel deploy --prod --yes");
  }

  console.info("");
  console.info("Done. Install the app on your repositories:");
  console.info(`  https://github.com/apps/${app.slug}/installations/new`);
  console.info("Then reconnect projects in SearchOps /connect with the installation ID if needed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
