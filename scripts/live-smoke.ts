// Explicit operator command; no secrets or provider response bodies are printed.
import assert from "node:assert/strict";
const origin = process.env.NEXT_PUBLIC_APP_URL;
const projectId = process.env.SEARCHOPS_SMOKE_PROJECT_ID;
async function main() {
  assert.ok(
    origin && new URL(origin).protocol === "https:",
    "Set HTTPS NEXT_PUBLIC_APP_URL",
  );
  assert.ok(
    projectId && process.env.SEARCHOPS_API_KEY,
    "Set SEARCHOPS_SMOKE_PROJECT_ID and SEARCHOPS_API_KEY",
  );
  const request = async (path: string, body?: unknown) => {
    const res = await fetch(new URL(path, origin), {
      method: body ? "POST" : "GET",
      redirect: "error",
      headers: {
        "x-searchops-key": process.env.SEARCHOPS_API_KEY!,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });
    const data = await res.json();
    assert.ok(
      res.ok,
      `${path.split("?")[0]}: ${res.status} ${String(data.code || "FAILED")}`,
    );
    return data;
  };
  await request("/api/health");
  await request("/api/readiness");
  const health = await request(
    `/api/operations?projectId=${encodeURIComponent(projectId)}`,
  );
  assert.ok(health.activeWorkers > 0, "No active worker");
  for (const route of ["deployments", "jobs", "geo", "seo-scan"])
    await request(`/api/${route}?projectId=${encodeURIComponent(projectId)}`);
  console.info(
    "PASS live liveness, authenticated readiness, worker and scoped data routes",
  );
  if (process.argv.includes("--analyze")) {
    const job = await request("/api/run-analysis", { projectId });
    for (let i = 0; i < 120; i++) {
      const { jobs } = await request(
        `/api/jobs?projectId=${encodeURIComponent(projectId)}`,
      );
      const state = jobs.find((j: { id: string }) => j.id === job.jobId);
      if (state?.status === "COMPLETE") {
        const result = await request(
          `/api/deployments?projectId=${encodeURIComponent(projectId)}`,
        );
        const deployment = result.deployments.find(
          (d: { id: string }) => d.id === job.deploymentId,
        );
        assert.ok(
          deployment && ["HEALTHY", "REGRESSION"].includes(deployment.status),
          "Analysis was degraded; verify target revision markers",
        );
        console.info(`PASS live analysis: ${deployment.status}`);
        return;
      }
      assert.ok(
        !["FAILED", "CANCELLED"].includes(state?.status),
        "Analysis terminated unsuccessfully",
      );
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    throw new Error("Live analysis timed out");
  }
}
main().catch((error) => {
  console.error(
    error instanceof assert.AssertionError
      ? error.message
      : "LIVE_SMOKE_FAILED: inspect authorized job status and request logs.",
  );
  process.exitCode = 1;
});
