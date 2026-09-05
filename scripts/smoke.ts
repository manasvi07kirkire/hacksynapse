import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";

async function main() {
  const reservation = createServer();
  await new Promise<void>((resolve, reject) => {
    reservation.once("error", reject);
    reservation.listen(0, "127.0.0.1", resolve);
  });
  const address = reservation.address();
  assert.ok(address && typeof address !== "string");
  const port = address.port;
  await new Promise<void>((resolve) => reservation.close(() => resolve()));
  const child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "-H",
      "127.0.0.1",
      "-p",
      String(port),
    ],
    {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        NODE_ENV: "production",
        SEARCHOPS_API_KEY: randomUUID(),
        SEARCHOPS_PROJECT_KEYS: "{}",
        SEARCHOPS_LOCAL_DEMO: "false",
        SEARCHOPS_ALLOW_PRIVATE_CRAWL: "false",
        SEARCHOPS_ALLOW_PAT: "false",
        ALLOW_LLM_FALLBACK: "false",
        USE_PLAYWRIGHT: "false",
        DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/unused",
        DIRECT_URL: "postgresql://unused:unused@127.0.0.1:1/unused",
      },
    },
  );
  let output = "";
  child.stdout.on("data", (data: Buffer) => {
    output = (output + data.toString()).slice(-4000);
  });
  child.stderr.on("data", (data: Buffer) => {
    output = (output + data.toString()).slice(-4000);
  });
  const exited = new Promise<void>((resolve) =>
    child.once("exit", () => resolve()),
  );
  const origin = `http://127.0.0.1:${port}`;
  const get = async (path: string) => {
    try {
      return await fetch(origin + path, { signal: AbortSignal.timeout(10000) });
    } catch (cause) {
      throw new Error(`HTTP smoke failed at ${path}: ${output}`, { cause });
    }
  };
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null)
        throw new Error(`Smoke server exited: ${output}`);
      try {
        ready = (
          await fetch(origin + "/api/health", {
            signal: AbortSignal.timeout(1000),
          })
        ).ok;
      } catch {
        /* Startup is bounded below. */
      }
      if (ready) break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    assert.ok(ready, `Smoke server did not become ready: ${output}`);
    let passed = 0;
    for (const path of [
      "/",
      "/connect",
      "/watch",
      "/graph",
      "/geo",
      "/seo-advisor",
      "/remediation",
    ]) {
      const response = await get(path);
      assert.equal(response.status, 200, path);
      assert.match(response.headers.get("content-type") || "", /text\/html/);
      assert.match(await response.text(), /SearchOps/i);
      passed++;
    }
    const health = await get("/api/health");
    assert.deepEqual(await health.json(), { status: "ok" });
    assert.equal(health.headers.get("cache-control"), "no-store");
    passed++;
    for (const path of ["/api/projects", "/api/readiness"]) {
      const response = await get(path);
      assert.equal(response.status, 401, path);
      assert.equal(response.headers.get("cache-control"), "no-store, private");
      assert.ok(response.headers.get("x-request-id"));
      assert.equal((await response.json()).code, "UNAUTHORIZED");
      passed++;
    }
    console.info(
      `PRODUCTION HTTP SMOKE: ${passed}/10 passed. Rendering and auth only; interactive browser behavior and live services not tested.`,
    );
  } finally {
    child.kill();
    await exited;
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
