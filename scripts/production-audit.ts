/**
 * Full production audit for searchops-vert.vercel.app
 * Run: node --env-file=.env --import tsx scripts/production-audit.ts
 */

const ORIGIN = process.env.PRODUCTION_URL || "https://searchops-vert.vercel.app";
const API_KEY = process.env.SEARCHOPS_API_KEY;

type Result = {
  name: string;
  ok: boolean;
  status?: number;
  code?: string;
  detail?: string;
};

const results: Result[] = [];

function record(
  name: string,
  ok: boolean,
  extra: Partial<Result> = {},
) {
  results.push({ name, ok, ...extra });
  const mark = ok ? "PASS" : "FAIL";
  console.log(
    `${mark}  ${name}${extra.status ? ` (${extra.status}${extra.code ? ` ${extra.code}` : ""})` : ""}${extra.detail ? ` — ${extra.detail}` : ""}`,
  );
}

async function req(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    expectOk?: boolean;
  } = {},
) {
  const headers: Record<string, string> = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...options.headers,
  };
  const res = await fetch(new URL(path, ORIGIN), {
    method: options.method || (options.body ? "POST" : "GET"),
    redirect: "manual",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(45000),
  });
  let data: Record<string, unknown> = {};
  const text = await res.text();
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    data = { raw: text.slice(0, 200) };
  }
  return { res, data, text };
}

async function main() {
  if (!API_KEY) throw new Error("SEARCHOPS_API_KEY required in .env");

  console.log(`\n=== SearchOps production audit: ${ORIGIN} ===\n`);

  // ── Public ──
  {
    const { res, data } = await req("/api/health");
    record(
      "Public health",
      res.status === 200 && data.status === "ok",
      { status: res.status, detail: String(data.status) },
    );
  }

  // ── Auth gate ──
  {
    const { res, data } = await req("/api/projects");
    record(
      "Unauthenticated blocked",
      res.status === 401 && data.code === "UNAUTHORIZED",
      { status: res.status, code: String(data.code) },
    );
  }

  const auth = { "x-searchops-key": API_KEY };

  // ── Session ──
  {
    const { res, data } = await req("/api/session", {
      method: "POST",
      headers: auth,
      body: {},
    });
    const cookie = res.headers.get("set-cookie") || "";
    record(
      "Session sign-in",
      res.status === 200 && cookie.includes("searchops_session"),
      { status: res.status, detail: cookie ? "cookie set" : "no cookie" },
    );
  }

  // ── Readiness (503 worker ok for audit) ──
  {
    const { res, data } = await req("/api/readiness", { headers: auth });
    const dbOk = res.status === 200 || data.code === "WORKER_NOT_READY";
    record(
      "Readiness / DB",
      dbOk,
      {
        status: res.status,
        code: String(data.code || data.status),
        detail:
          data.code === "WORKER_NOT_READY"
            ? "DB ok, worker offline"
            : String(data.status),
      },
    );
  }

  // ── Projects ──
  let projects: {
    id: string;
    repo: string;
    siteUrl: string;
  }[] = [];
  {
    const { res, data } = await req("/api/projects", { headers: auth });
    projects = (data.projects as typeof projects) || [];
    record(
      "List projects",
      res.status === 200 && projects.length > 0,
      { status: res.status, detail: `${projects.length} project(s)` },
    );
  }

  const healthcart =
    projects.find((p) => p.repo.includes("healthcart")) || projects[0];
  if (!healthcart) {
    console.error("No project to test");
    process.exit(1);
  }
  const pid = healthcart.id;
  console.log(`\n--- Project: ${healthcart.repo} (${pid}) ---\n`);

  const getRoutes = [
    "deployments",
    "jobs",
    "geo",
    "graph",
    "seo-scan",
    "operations",
    "revision-marker",
  ] as const;

  for (const route of getRoutes) {
    const { res, data } = await req(
      `/api/${route}?projectId=${encodeURIComponent(pid)}`,
      { headers: auth },
    );
    record(`GET /api/${route}`, res.status === 200, {
      status: res.status,
      code: String(data.code || ""),
    });
  }

  // ── GitHub install URL ──
  {
    const { res, data } = await req("/api/github/install-url", {
      headers: auth,
    });
    record(
      "GitHub install URL",
      res.status === 200 && typeof data.url === "string",
      { status: res.status },
    );
  }

  // ── Deployments detail ──
  type DeploySummary = {
    id: string;
    status: string;
    deployNumber?: number;
    findings?: { id: string; type: string }[];
  };
  let latestDeploy: DeploySummary | null = null;
  {
    const { res, data } = await req(
      `/api/deployments?projectId=${encodeURIComponent(pid)}`,
      { headers: auth },
    );
    const deployments = (data.deployments as DeploySummary[]) || [];
    latestDeploy = deployments[0] || null;
    record(
      "Deployments have data",
      res.status === 200 && deployments.length > 0,
      {
        status: res.status,
        detail: latestDeploy
          ? `#${latestDeploy.deployNumber ?? "?"} ${latestDeploy.status}`
          : "empty",
      },
    );
  }

  // ── Worker status ──
  {
    const { res, data } = await req(
      `/api/operations?projectId=${encodeURIComponent(pid)}`,
      { headers: auth },
    );
    const workers = Number(data.activeWorkers ?? 0);
    record(
      "Background worker",
      workers > 0,
      {
        status: res.status,
        detail: workers > 0 ? `${workers} active` : "0 active — new analyses won't run",
      },
    );
  }

  // ── SEO scan POST ──
  let scanId: string | undefined;
  {
    const { res, data } = await req("/api/seo-scan", {
      method: "POST",
      headers: {
        ...auth,
        "Idempotency-Key": `audit-seo-${Date.now()}`,
      },
      body: {
        projectId: pid,
        pageUrl: healthcart.siteUrl,
        targetKeywords: ["health"],
        mode: "heuristic",
      },
    });
    scanId = data.scanId as string | undefined;
    const suggestions = (data.suggestions as unknown[]) || [];
    record(
      "SEO Advisor scan",
      res.status === 200 && !!scanId,
      {
        status: res.status,
        code: String(data.code || ""),
        detail: `${suggestions.length} suggestion(s)`,
      },
    );
  }

  // ── SEO scan LLM mode ──
  {
    const { res, data } = await req("/api/seo-scan", {
      method: "POST",
      headers: {
        ...auth,
        "Idempotency-Key": `audit-seo-llm-${Date.now()}`,
      },
      body: {
        projectId: pid,
        pageUrl: healthcart.siteUrl,
        targetKeywords: ["healthcare"],
        mode: "llm",
      },
    });
    record(
      "SEO Advisor LLM mode",
      res.status === 200,
      {
        status: res.status,
        code: String(data.code || ""),
        detail:
          res.status !== 200
            ? String(data.error)
            : `${((data.suggestions as unknown[]) || []).length} suggestion(s)`,
      },
    );
  }

  // ── Citation test ──
  {
    const { res, data } = await req("/api/citation-test", {
      method: "POST",
      headers: auth,
      body: {
        projectId: pid,
        url: healthcart.siteUrl,
        query: "What is HealthCart?",
        expectedFacts: ["Health"],
      },
    });
    record(
      "GEO citation test",
      res.status === 200,
      {
        status: res.status,
        code: String(data.code || ""),
        detail: res.ok ? `score ${data.score}` : String(data.error),
      },
    );
  }

  // ── Generate fix (if finding exists) ──
  const finding = latestDeploy?.findings?.[0];
  if (finding) {
    const { res, data } = await req("/api/generate-fix", {
      method: "POST",
      headers: {
        ...auth,
        "Idempotency-Key": `audit-fix-${Date.now()}`,
      },
      body: { projectId: pid, findingId: finding.id },
    });
    const ok =
      res.status === 200 ||
      data.code === "UNVERIFIED_FINDING" ||
      data.code === "ALREADY_REMEDIATED";
    record(
      `Generate fix (${finding.type})`,
      ok,
      {
        status: res.status,
        code: String(data.code || ""),
        detail: data.prUrl
          ? `PR #${data.prNumber}`
          : String(data.error || data.code),
      },
    );
  } else {
    record("Generate fix", false, { detail: "no findings on latest deploy" });
  }

  // ── Run analysis (queue only) ──
  {
    const { res, data } = await req("/api/run-analysis", {
      method: "POST",
      headers: auth,
      body: { projectId: pid },
    });
    record(
      "Run analysis enqueue",
      res.status === 200 || res.status === 202 || res.status === 409,
      {
        status: res.status,
        code: String(data.code || ""),
        detail: data.jobId
          ? `job ${data.jobId}`
          : String(data.error || data.code),
      },
    );
  }

  // ── UI pages (HTML) ──
  const pages = [
    "/",
    "/connect",
    "/watch",
    "/geo",
    "/graph",
    "/seo-advisor",
    "/preview",
    "/regression",
    "/remediation",
  ];
  console.log("\n--- UI pages ---\n");
  for (const page of pages) {
    const res = await fetch(new URL(page, ORIGIN), {
      redirect: "manual",
      signal: AbortSignal.timeout(30000),
    });
    const html = await res.text();
    const hasNext =
      res.status === 200 &&
      (html.includes("__next") || html.includes("SearchOps") || html.length > 500);
    record(`Page ${page}`, hasNext, {
      status: res.status,
      detail: `${Math.round(html.length / 1024)}KB`,
    });
  }

  // ── Summary ──
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log("\n=== SUMMARY ===");
  console.log(`${passed}/${results.length} checks passed`);
  if (failed.length) {
    console.log("\nFailed / degraded:");
    for (const f of failed) {
      console.log(`  • ${f.name}${f.detail ? `: ${f.detail}` : ""}`);
    }
  }
  process.exitCode = failed.some(
    (f) =>
      !f.name.includes("worker") &&
      !f.name.includes("Generate fix") &&
      !f.name.includes("Readiness"),
  )
    ? 1
    : 0;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
