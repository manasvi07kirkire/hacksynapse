import EmbeddedPostgres from "embedded-postgres";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
async function main() {
  if (process.platform === "win32")
    process.env.PATH = `${process.env.SystemRoot || "C:\\Windows"}\\System32;${process.env.PATH || ""}`;
  const dir = resolve(".test-data", randomUUID());
  await mkdir(dir, { recursive: true });
  const port = 15432 + Math.floor(Math.random() * 10000);
  const password = randomUUID();
  const pg = new EmbeddedPostgres({
    databaseDir: dir,
    user: "searchops_test",
    password,
    port,
    persistent: true,
    authMethod: "scram-sha-256",
    onLog: () => {},
    onError: () => {},
  });
  let started = false;
  try {
    await pg.initialise();
    await pg.start();
    started = true;
    await pg.createDatabase("searchops_test");
    const url = `postgresql://searchops_test:${password}@127.0.0.1:${port}/searchops_test`;
    const client = pg.getPgClient();
    await client.connect();
    // Upgrade a legacy fixture through the same SQL migrations used by deployment.
    await client.query("CREATE DATABASE searchops_upgrade");
    await client.end();
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      DATABASE_URL: url,
      DIRECT_URL: url,
      SEARCHOPS_API_KEY: "test-operator-key-with-at-least-32-characters",
      SEARCHOPS_TEST_DATABASE: "true",
      SEARCHOPS_LOCAL_DEMO: "true",
      SEARCHOPS_ALLOW_PRIVATE_CRAWL: "true",
      SEARCHOPS_ALLOW_PAT: "true",
      GITHUB_TOKEN: "test-only-token",
      NODE_ENV: "test",
    };
    const run = (args: string[]) =>
      new Promise<void>((resolve, reject) => {
        const p = spawn(process.execPath, args, {
          env,
          stdio: "inherit",
          windowsHide: true,
        });
        p.on("error", reject);
        p.on("exit", (code) =>
          code === 0
            ? resolve()
            : reject(new Error(`Test command exited ${code}`)),
        );
      });
    await run(["node_modules/prisma/build/index.js", "migrate", "deploy"]);
    await run([
      "--import",
      "tsx",
      "--test",
      "--test-concurrency=1",
      "tests/integration.test.ts",
    ]);
  } finally {
    if (started && process.platform === "win32") {
      // pg_ctl requests a graceful stop, avoiding orphaned PG18 I/O workers from taskkill.
      const ctl = resolve(
        "node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe",
      );
      await new Promise<void>((resolve, reject) => {
        const child = spawn(
          ctl,
          ["-D", dir, "stop", "-m", "fast", "-w", "-t", "15"],
          { windowsHide: true, stdio: "ignore" },
        );
        child.on("error", reject);
        child.on("exit", (code) =>
          code === 0
            ? resolve()
            : reject(new Error("Test PostgreSQL shutdown failed")),
        );
      });
      // The cluster is confirmed stopped. Prevent the library's exit hook from
      // taskkilling an already-exited (potentially recycled) PID a second time.
      pg.stop = async () => {};
    } else await pg.stop();
  }
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : "Test database failure");
    process.exit(1);
  });
