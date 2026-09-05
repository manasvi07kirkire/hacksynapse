import test, { after } from "node:test";
import assert from "node:assert/strict";
import {
  createHmac,
  randomUUID,
  createHash,
  generateKeyPairSync,
  verify,
} from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { PrismaClient } from "@prisma/client";
import { db } from "../lib/db";
import { enqueueAnalysis, claimJob } from "../lib/jobs/queue";
import {
  runOneJob,
  runDeploymentAnalysis,
} from "../lib/pipeline/run-deployment-analysis";
import { GitHubClient, JsonTransport } from "../lib/github/client";
import { AppError } from "../lib/server/errors";
import { safeFetch } from "../lib/crawler/safe-fetch";
import { createBranchCommitAndPullRequest } from "../lib/github/branch-commit";
import { operation } from "../lib/server/operation";
import { resolveProject } from "../lib/projects/service";
import { applySourceSuggestions } from "../lib/seo-advisor/source-apply";
import { extractHtmlContent } from "../lib/seo-advisor/extract-target";
import { generateHeuristicSuggestions } from "../lib/seo-advisor/suggest";
import { generateRemediationPatch } from "../lib/remediate/patch-generator";
import { POST as webhook } from "../app/api/webhooks/github/route";
import { GET as deployments } from "../app/api/deployments/route";
import { POST as applySeo } from "../app/api/seo-apply/route";
import { POST as fix } from "../app/api/generate-fix/route";
if (
  process.env.SEARCHOPS_TEST_DATABASE !== "true" ||
  !process.env.DATABASE_URL?.includes("/searchops_test")
)
  throw new Error("Use scripts/test-db.ts with a disposable database");
after(() => db.$disconnect());
const admin = { id: "operator", admin: true };
const sha = (v: string) => v.repeat(40);
const a = sha("a"),
  b = sha("b"),
  c = sha("c");
const html =
  '<html><head><title>Workshop tool catalog</title><meta name="description" content="Precision tools with documented calibration and a durable stainless steel housing for workshop use."><link rel="canonical" href="https://site.example/"><script type="application/ld+json">{"@type":"WebSite","name":"Tools","url":"https://site.example/"}</script></head><body><h1>Tools</h1><p>Precision tools with documented calibration and a durable stainless steel housing for workshop use. Additional product documentation describes care, storage and everyday handling.</p></body></html>';
const broken = html.replace(/<link[^>]+>/, "");
const payload = (commit: string) => ({
  sha: commit,
  ref: "refs/heads/main",
  commitMsg: "test",
  author: "test",
  forced: false,
});
async function project(name: string) {
  return db.project.create({
    data: {
      repo: `demo/${name}`,
      siteUrl: "https://site.example/",
      routeManifest: '["/"]',
      sourceMap: '{"/":"index.html"}',
    },
  });
}
class FakeGitHub {
  head = a;
  source = html;
  branches = new Map<string, string>();
  commits = new Map<
    string,
    { message: string; tree: { sha: string }; parents: { sha: string }[] }
  >();
  prs: {
    number: number;
    html_url: string;
    state: string;
    head: { ref: string; sha: string };
    base: { ref: string };
  }[] = [];
  statuses: string[] = [];
  writes = 0;
  transport: JsonTransport = async (path, _token, method = "GET", body) => {
    assert.equal(_token, "test-only-token");
    const value = body as Record<string, unknown> | undefined;
    if (/^\/repos\/[^/]+\/[^/]+$/.test(path))
      return { full_name: path.slice(7), default_branch: "main" };
    if (path.includes("/git/ref/heads/main"))
      return { object: { sha: this.head } };
    if (path.includes("/compare/"))
      return {
        status: "ahead",
        files: [
          {
            filename: "index.html",
            patch:
              '@@ -1,2 +1,1 @@\n-<link rel="canonical" href="https://site.example/">\n </head>',
            additions: 0,
            deletions: 1,
            status: "modified",
          },
        ],
      };
    if (path.includes("/contents/"))
      return {
        type: "file",
        encoding: "base64",
        size: this.source.length,
        content: Buffer.from(this.source).toString("base64"),
      };
    if (path.includes("/statuses/")) {
      this.statuses.push(String(value?.state));
      return {};
    }
    if (path.includes("/pulls?") && method === "GET") {
      const u = new URL(path, "https://api.github.com");
      const branch = u.searchParams.get("head")?.split(":")[1];
      return this.prs.filter((pr) => pr.head.ref === branch);
    }
    if (path.endsWith("/git/trees") && method === "POST")
      return {
        sha: createHash("sha1").update(JSON.stringify(value)).digest("hex"),
      };
    if (path.includes("/git/trees/"))
      return {
        truncated: false,
        tree: [
          { path: "index.html", mode: "100644", type: "blob", sha: sha("d") },
        ],
      };
    if (path.endsWith("/git/commits") && method === "POST") {
      const id = createHash("sha1").update(JSON.stringify(value)).digest("hex");
      this.commits.set(id, {
        message: String(value?.message),
        tree: { sha: String(value?.tree) },
        parents: (value?.parents as string[]).map((sha) => ({ sha })),
      });
      return { sha: id };
    }
    if (path.includes("/git/commits/"))
      return (
        this.commits.get(path.split("/").at(-1)!) || { tree: { sha: sha("e") } }
      );
    if (path.includes("/git/ref/heads/")) {
      const branch = decodeURIComponent(path.split("/heads/")[1]);
      const id = this.branches.get(branch);
      if (!id) throw new AppError(404, "GITHUB_404", "Not found");
      return { object: { sha: id } };
    }
    if (path.endsWith("/git/refs") && method === "POST") {
      const branch = String(value?.ref).replace("refs/heads/", "");
      if (this.branches.has(branch))
        throw new AppError(409, "GITHUB_422", "Ref exists");
      this.branches.set(branch, String(value?.sha));
      return {};
    }
    if (path.endsWith("/pulls") && method === "POST") {
      this.writes++;
      const pr = {
        number: this.writes,
        html_url: `https://github.com/demo/repo/pull/${this.writes}`,
        state: "open",
        head: {
          ref: String(value?.head),
          sha: this.branches.get(String(value?.head))!,
        },
        base: { ref: String(value?.base) },
      };
      this.prs.push(pr);
      return pr;
    }
    throw new Error(`Unhandled fake GitHub contract: ${method} ${path}`);
  };
  client = new GitHubClient(this.transport);
}
function site(content: string, revision: string): typeof safeFetch {
  return async (url) => ({
    url,
    status: 200,
    text: url.endsWith("sitemap.xml")
      ? "<urlset><url><loc>https://site.example/</loc></url></urlset>"
      : url.endsWith("llms.txt")
        ? "# Site\n## Pages\n- [Home](/)"
        : content,
    headers: { "x-searchops-sha": revision },
  });
}
const authHeaders = {
  "x-searchops-key": process.env.SEARCHOPS_API_KEY!,
  "content-type": "application/json",
};
test("migrations from baseline preserve legacy data, backfill counters and enforce uniqueness", async () => {
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = "/searchops_upgrade";
  const upgrade = new PrismaClient({ datasources: { db: { url: url.href } } });
  try {
    const baseline = await readFile(
      "prisma/migrations/202609050001_baseline/migration.sql",
      "utf8",
    );
    for (const statement of baseline
      .split(/;\s*(?:\r?\n|$)/)
      .filter((s) => s.trim()))
      await upgrade.$executeRawUnsafe(statement);
    await upgrade.$executeRaw`INSERT INTO "Project" (id,repo,"siteUrl","routeManifest","updatedAt") VALUES ('legacy','demo/legacy','https://site.example/','["/"]',NOW())`;
    await upgrade.$executeRaw`INSERT INTO "Deployment" (id,"projectId",sha,"deployNumber",ref,"commitMsg",author,status) VALUES ('legacy-deploy','legacy','old-sha',7,'refs/heads/main','legacy','demo','HEALTHY')`;
    const migration = await readFile(
      "prisma/migrations/202609050002_hardening/migration.sql",
      "utf8",
    );
    for (const statement of migration
      .split(/;\s*(?:\r?\n|$)/)
      .filter((s) => s.trim()))
      await upgrade.$executeRawUnsafe(statement);
    assert.equal(
      (await upgrade.project.findUniqueOrThrow({ where: { id: "legacy" } }))
        .repo,
      "demo/legacy",
    );
    assert.equal(
      (await upgrade.project.findUniqueOrThrow({ where: { id: "legacy" } }))
        .deployCounter,
      7,
    );
    assert.equal(
      (
        await upgrade.deployment.findUniqueOrThrow({
          where: { id: "legacy-deploy" },
        })
      ).status,
      "DEGRADED",
    );
    const integrity = await readFile(
      "prisma/migrations/202609050003_integrity/migration.sql",
      "utf8",
    );
    for (const statement of integrity
      .split(/;\s*(?:\r?\n|$)/)
      .filter((s) => s.trim()))
      await upgrade.$executeRawUnsafe(statement);
    const production = await readFile(
      "prisma/migrations/202609060001_production_loop/migration.sql",
      "utf8",
    );
    for (const statement of production
      .split(/;\s*(?:\r?\n|$)/)
      .filter((s) => s.trim()))
      await upgrade.$executeRawUnsafe(statement);
    assert.equal(await upgrade.recovery.count(), 0);
    assert.equal(await upgrade.workerHeartbeat.count(), 0);
    await assert.rejects(() =>
      upgrade.project.create({
        data: {
          repo: "demo/legacy",
          siteUrl: "https://site.example/",
          routeManifest: '["/"]',
        },
      }),
    );
    await assert.rejects(() =>
      upgrade.seoScan.create({
        data: {
          pageUrl: "https://site.example/",
          targetKeywords: "[]",
          content: "{}",
          status: "COMPLETE",
        },
      }),
    );
  } finally {
    await upgrade.$disconnect();
  }
});
test("signed webhook concurrent delivery and SHA dedup creates one logical job", async () => {
  const p = await project("webhook");
  await db.project.update({ where: { id: p.id }, data: { installId: "42" } });
  process.env.GITHUB_APP_WEBHOOK_SECRET = "webhook-test-secret";
  const delivery = randomUUID();
  const raw = JSON.stringify({
    ref: "refs/heads/main",
    before: sha("0"),
    after: a,
    deleted: false,
    forced: false,
    repository: { full_name: p.repo, default_branch: "main" },
    installation: { id: 42 },
    sender: { login: "demo" },
    head_commit: { message: "baseline" },
  });
  const req = () =>
    new Request("https://app.example/api/webhooks/github", {
      method: "POST",
      headers: {
        "x-hub-signature-256":
          "sha256=" +
          createHmac("sha256", process.env.GITHUB_APP_WEBHOOK_SECRET!)
            .update(raw)
            .digest("hex"),
        "x-github-event": "push",
        "x-github-delivery": delivery,
      },
      body: raw,
    });
  const responses = await Promise.all(
    Array.from({ length: 8 }, () => webhook(req())),
  );
  assert.ok(responses.every((r) => r.status === 202));
  assert.equal(await db.analysisJob.count({ where: { projectId: p.id } }), 1);
  assert.equal(await db.deployment.count({ where: { projectId: p.id } }), 1);
  assert.equal(await db.webhookDelivery.count({ where: { id: delivery } }), 1);
  await db.project.update({ where: { id: p.id }, data: { enabled: false } });
});
test("concurrent deployment counters unique and explicit selectors never cross projects", async () => {
  const p = await project("numbers"),
    q = await project("other");
  const jobs = await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      enqueueAnalysis(p.id, payload(i.toString(16).repeat(40))),
    ),
  );
  assert.equal(new Set(jobs.map((j) => j.id)).size, 8);
  assert.deepEqual(
    (
      await db.deployment.findMany({
        where: { projectId: p.id },
        orderBy: { deployNumber: "asc" },
      })
    ).map((d) => d.deployNumber),
    [1, 2, 3, 4, 5, 6, 7, 8],
  );
  await assert.rejects(() =>
    resolveProject(
      { ...admin, admin: false, projectId: p.id },
      { projectId: q.id },
    ),
  );
  await assert.rejects(() =>
    resolveProject(admin, { projectId: "invalid", repo: q.repo }),
  );
  await db.project.updateMany({
    where: { id: { in: [p.id, q.id] } },
    data: { enabled: false },
  });
});
test("faithful demo: baseline, regression, Tier A PR replay, recovery, SEO combined PR", async () => {
  const p = await project("loop");
  const gh = new FakeGitHub();
  await enqueueAnalysis(p.id, payload(a));
  await runOneJob({ github: gh.client, fetcher: site(html, a) });
  let d = await db.deployment.findFirstOrThrow({
    where: { projectId: p.id },
    orderBy: { deployNumber: "desc" },
  });
  assert.equal(d.status, "HEALTHY");
  assert.equal(await db.finding.count({ where: { deploymentId: d.id } }), 0);
  gh.head = b;
  gh.source = broken;
  await enqueueAnalysis(p.id, payload(b));
  await runOneJob({ github: gh.client, fetcher: site(broken, b) });
  d = await db.deployment.findFirstOrThrow({
    where: { projectId: p.id },
    orderBy: { deployNumber: "desc" },
  });
  assert.equal(d.status, "REGRESSION");
  const finding = await db.finding.findFirstOrThrow({
    where: { deploymentId: d.id, type: "CANONICAL_STRIPPED" },
  });
  assert.equal(JSON.parse(finding.evidence).pagesAffected, 1);
  const data = {
    ...finding,
    type: "CANONICAL_STRIPPED" as const,
    severity: "CRITICAL" as const,
    lens: "search" as const,
    status: "OPEN" as const,
    evidence: JSON.parse(finding.evidence),
    rootCause: JSON.parse(finding.rootCause),
  };
  const patch = generateRemediationPatch(data, {
    path: "index.html",
    current: broken,
    previous: html,
    url: p.siteUrl,
  });
  const key = "f".repeat(64);
  const input = {
    key,
    baseSha: b,
    files: [{ path: "index.html", content: patch.content! }],
    title: patch.prTitle,
    body: patch.prBody,
    draft: false,
  };
  const pr = await createBranchCommitAndPullRequest(p, input, gh.client);
  assert.equal(
    (await createBranchCommitAndPullRequest(p, input, gh.client)).prNumber,
    pr.prNumber,
  );
  assert.equal(gh.writes, 1);
  gh.head = c;
  gh.source = patch.content!;
  await enqueueAnalysis(p.id, payload(c));
  await runOneJob({ github: gh.client, fetcher: site(patch.content!, c) });
  d = await db.deployment.findFirstOrThrow({
    where: { projectId: p.id },
    orderBy: { deployNumber: "desc" },
  });
  assert.equal(d.status, "HEALTHY");
  assert.equal(
    await db.graphSnapshot.count({
      where: { deployment: { projectId: p.id } },
    }),
    3,
  );
  const content = extractHtmlContent(p.siteUrl, gh.source);
  const suggestions = generateHeuristicSuggestions({
    pageUrl: p.siteUrl,
    content,
    targetKeywords: ["precision"],
  });
  assert.equal(suggestions.length, 1);
  const scan = await db.seoScan.create({
    data: {
      projectId: p.id,
      pageUrl: p.siteUrl,
      content: JSON.stringify(content),
      targetKeywords: '["precision"]',
      status: "COMPLETE",
      baseSha: c,
      sourcePath: "index.html",
      sourceContent: gh.source,
      suggestions: { create: suggestions },
    },
  });
  const applied = applySourceSuggestions(
    "index.html",
    p.siteUrl,
    gh.source,
    content,
    ["precision"],
    suggestions,
  );
  assert.equal(applied.validation.passed, true);
  const apply = () =>
    operation(
      p.id,
      admin.id,
      "seo-apply",
      scan.id,
      { approved: suggestions.map((s) => s.id) },
      async (op) =>
        createBranchCommitAndPullRequest(
          p,
          {
            key: op,
            baseSha: c,
            files: [{ path: "index.html", content: applied.source }],
            title: "SEO changes",
            body: "Reviewed suggestions",
            draft: true,
          },
          gh.client,
        ),
    );
  const seoPr = await apply();
  assert.equal((await apply()).prNumber, seoPr.prNumber);
  assert.equal(gh.writes, 2);
  assert.ok(gh.statuses.includes("failure") && gh.statuses.includes("success"));
  console.info(
    "FAITHFUL LOCAL DEMO: signed ingress tested separately; baseline -> regression -> one PR -> recovery -> one SEO PR. No live external services.",
  );
});
test("stale RUNNING jobs recover and expired worker cannot publish", async () => {
  const p = await project("lease");
  await enqueueAnalysis(p.id, payload(a));
  const old = await claimJob();
  assert.equal(old?.projectId, p.id);
  await db.project.update({
    where: { id: p.id },
    data: { leaseUntil: new Date(0) },
  });
  await db.analysisJob.update({
    where: { id: old!.id },
    data: { leaseUntil: new Date(0) },
  });
  const fresh = await claimJob();
  assert.equal(fresh?.id, old!.id);
  assert.notEqual(fresh?.leaseToken, old!.leaseToken);
  const gh = new FakeGitHub();
  await assert.rejects(
    () =>
      runDeploymentAnalysis(old!, {
        github: gh.client,
        fetcher: site(html, a),
      }),
    /lease/i,
  );
  assert.equal(
    await db.graphSnapshot.count({
      where: { deploymentId: old!.deploymentId },
    }),
    0,
  );
  await runDeploymentAnalysis(fresh!, {
    github: gh.client,
    fetcher: site(html, a),
  });
});
test("failed crawl, unverified revision and partial site never healthy", async () => {
  for (const mode of ["failed", "unverified", "partial"]) {
    const p = await project(mode);
    if (mode === "partial")
      await db.project.update({
        where: { id: p.id },
        data: { routeManifest: '["/","/broken"]' },
      });
    const job = await enqueueAnalysis(p.id, payload(a));
    const gh = new FakeGitHub();
    const deps = {
      github: gh.client,
      fetcher: async (
        url: string,
        options?: Parameters<typeof safeFetch>[1],
      ) => {
        if (mode === "failed" || url.endsWith("/broken"))
          throw new AppError(422, "FETCH_FAILED", "site failed");
        return site(html, mode === "unverified" ? b : a)(url, options);
      },
    };
    await runOneJob(deps);
    if (mode === "failed") {
      assert.equal(
        (
          await db.deployment.findUniqueOrThrow({
            where: { id: job.deploymentId },
          })
        ).status,
        "QUEUED",
      );
      for (let retry = 0; retry < 2; retry++) {
        await db.analysisJob.update({
          where: { id: job.id },
          data: { availableAt: new Date(0) },
        });
        await runOneJob(deps);
      }
      assert.equal(
        (await db.analysisJob.findUniqueOrThrow({ where: { id: job.id } }))
          .attempts,
        3,
      );
    }
    const d = await db.deployment.findFirstOrThrow({
      where: { projectId: p.id },
    });
    assert.equal(d.status, mode === "failed" ? "FAILED" : "DEGRADED");
  }
});
test("API contracts reject unauthenticated requests, cross-project reads and supplied evidence", async () => {
  const routes = await Promise.all([
    import("../app/api/projects/route"),
    import("../app/api/deployments/route"),
    import("../app/api/graph/route"),
    import("../app/api/geo/route"),
    import("../app/api/run-analysis/route"),
    import("../app/api/generate-fix/route"),
    import("../app/api/citation-test/route"),
    import("../app/api/seo-scan/route"),
    import("../app/api/seo-apply/route"),
    import("../app/api/github/install-url/route"),
    import("../app/api/readiness/route"),
    import("../app/api/remediation-approval/route"),
    import("../app/api/session/route"),
  ]);
  for (const route of routes)
    for (const method of ["GET", "POST", "DELETE"] as const) {
      const handler = (
        route as {
          GET?: (r: Request) => Promise<Response>;
          POST?: (r: Request) => Promise<Response>;
          DELETE?: (r: Request) => Promise<Response>;
        }
      )[method];
      if (handler) {
        const res = await handler(
          new Request("https://app.example/api/test", { method }),
        );
        assert.equal(res.status, 401);
        assert.match(res.headers.get("cache-control") || "", /no-store/);
        assert.ok((await res.json()).requestId);
      }
    }
  const p = await project("scope-a"),
    q = await project("scope-b");
  const key = "scoped-project-key-with-more-than-32-characters";
  process.env.SEARCHOPS_PROJECT_KEYS = JSON.stringify({ [p.id]: key });
  const response = await deployments(
    new Request(`https://app.example/api/deployments?projectId=${q.id}`, {
      headers: { "x-searchops-key": key },
    }),
  );
  assert.equal(response.status, 404);
  const forged = await fix(
    new Request("https://app.example/api/generate-fix", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        projectId: p.id,
        findingId: "fake",
        findingData: { tier: "TIER_A" },
      }),
    }),
  );
  assert.equal(forged.status, 400);
  const invalid = await applySeo(
    new Request("https://app.example/api/seo-apply", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        projectId: p.id,
        scanId: "other-scan",
        approvedSuggestionIds: ["foreign"],
      }),
    }),
  );
  assert.equal(invalid.status, 404);
});
test("SSRF fetch validates redirects, DNS pinning, limits and network errors", async () => {
  const server = createServer((req, res) => {
    if (req.url === "/redirect") {
      res.writeHead(302, {
        location: "http://169.254.169.254/latest/meta-data",
      });
      res.end();
    } else if (req.url === "/big") {
      res.setHeader("content-type", "text/html");
      res.end("x".repeat(2000));
    } else {
      res.setHeader("content-type", "text/html");
      res.end("<html>ok</html>");
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No test listener");
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    assert.equal((await safeFetch(origin)).status, 200);
    await assert.rejects(() => safeFetch(origin + "/redirect"), /origin/i);
    await assert.rejects(
      () => safeFetch(origin + "/big", { maxBytes: 1000 }),
      /large/,
    );
    process.env.SEARCHOPS_ALLOW_PRIVATE_CRAWL = "false";
    await assert.rejects(() => safeFetch(origin), /public/);
  } finally {
    process.env.SEARCHOPS_ALLOW_PRIVATE_CRAWL = "true";
    await new Promise<void>((r, j) => server.close((e) => (e ? j(e) : r())));
  }
});

test("real route handlers: connect, signed push, worker, fix, recovery, SEO, citation and reads", async (t) => {
  const gh = new FakeGitHub();
  const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
  process.env.GITHUB_APP_ID = "99";
  process.env.GITHUB_APP_PRIVATE_KEY = keys.privateKey
    .export({ type: "pkcs8", format: "pem" })
    .toString();
  process.env.OPENROUTER_API_KEY = "test-openrouter";
  process.env.OPENROUTER_MODEL = "test-model";
  const originalFetch = globalThis.fetch;
  t.mock.method(
    globalThis,
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const u = new URL(input instanceof Request ? input.url : String(input));
      if (u.hostname === "openrouter.ai")
        return Response.json({
          choices: [
            {
              message: {
                content: "Precision tools include documented calibration.",
              },
              finish_reason: "stop",
            },
          ],
        });
      if (u.hostname !== "api.github.com") return originalFetch(input, init);
      const token =
        new Headers(init?.headers)
          .get("authorization")
          ?.replace("Bearer ", "") || "";
      if (u.pathname.startsWith("/app/installations/")) {
        const [head, body, signature] = token.split(".");
        assert.ok(
          verify(
            "RSA-SHA256",
            Buffer.from(`${head}.${body}`),
            keys.publicKey,
            Buffer.from(signature, "base64url"),
          ),
        );
        return Response.json({
          token: "test-only-token",
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        });
      }
      try {
        return Response.json(
          await gh.transport(
            u.pathname + u.search,
            token,
            init?.method,
            init?.body ? JSON.parse(String(init.body)) : undefined,
          ),
        );
      } catch (e) {
        if (e instanceof AppError)
          return Response.json(
            { message: "provider detail must not leak" },
            { status: Number(e.code.split("_")[1]) || 500 },
          );
        throw e;
      }
    },
  );
  let deployed = a;
  let page = html;
  let origin = "";
  const server = createServer((req, res) => {
    res.setHeader("x-searchops-sha", deployed);
    if (req.url === "/sitemap.xml") {
      res.setHeader("content-type", "application/xml");
      res.end(`<urlset><url><loc>${origin}/</loc></url></urlset>`);
    } else if (req.url === "/llms.txt") {
      res.setHeader("content-type", "text/plain");
      res.end("# Site\n## Pages\n- [Home](/)");
    } else {
      res.setHeader("content-type", "text/html");
      res.end(page);
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No listener");
  origin = `http://127.0.0.1:${address.port}`;
  page = html.replaceAll("https://site.example", origin);
  gh.source = page;
  const request = (
    path: string,
    body: unknown,
    extra: Record<string, string> = {},
  ) =>
    new Request(`https://app.example/api/${path}`, {
      method: "POST",
      headers: { ...authHeaders, ...extra },
      body: JSON.stringify(body),
    });
  try {
    const projectsRoute = await import("../app/api/projects/route");
    const connected = await projectsRoute.POST(
      request("projects", {
        repo: "demo/route-loop",
        siteUrl: origin,
        routeManifest: ["/"],
        sourceMap: { "/": "index.html" },
        installId: "42",
      }),
    );
    assert.equal(connected.status, 200);
    const { project: p } = await connected.json();
    const reconnect = () =>
      projectsRoute.POST(
        request("projects", {
          repo: p.repo,
          siteUrl: origin,
          routeManifest: ["/"],
          sourceMap: { "/": "index.html" },
          installId: "42",
        }),
      );
    await db.project.update({ where: { id: p.id }, data: { enabled: false } });
    assert.equal((await reconnect()).status, 200);
    assert.equal(
      (await db.project.findUniqueOrThrow({ where: { id: p.id } })).enabled,
      true,
    );
    const signed = async (commit: string) => {
      const raw = JSON.stringify({
        ref: "refs/heads/main",
        before: sha("0"),
        after: commit,
        deleted: false,
        forced: false,
        repository: { full_name: p.repo, default_branch: "main" },
        installation: { id: 42 },
        sender: { login: "demo" },
        head_commit: { message: "deploy" },
      });
      return webhook(
        new Request("https://app.example/api/webhooks/github", {
          method: "POST",
          headers: {
            "x-hub-signature-256":
              "sha256=" +
              createHmac("sha256", process.env.GITHUB_APP_WEBHOOK_SECRET!)
                .update(raw)
                .digest("hex"),
            "x-github-event": "push",
            "x-github-delivery": randomUUID(),
          },
          body: raw,
        }),
      );
    };
    assert.equal((await signed(a)).status, 202);
    assert.equal(
      (await reconnect()).status,
      409,
      "Queued evidence must retain its project configuration",
    );
    await runOneJob();
    const baseline = await db.deployment.findFirstOrThrow({
      where: { projectId: p.id },
    });
    assert.equal(baseline.status, "HEALTHY");
    deployed = b;
    gh.head = b;
    page = page.replace(/<link[^>]+>/, "");
    gh.source = page;
    assert.equal((await signed(b)).status, 202);
    await runOneJob();
    const f = await db.finding.findFirstOrThrow({
      where: { deployment: { projectId: p.id }, type: "CANONICAL_STRIPPED" },
    });
    // Serve exact immutable source by ref; a real Contents API does not return HEAD for old refs.
    const originalTransport = gh.transport;
    gh.transport = async (path, token, method, body) => {
      if (path.includes("/contents/") && path.endsWith(`ref=${a}`)) {
        const old = html.replaceAll("https://site.example", origin);
        return {
          type: "file",
          encoding: "base64",
          size: old.length,
          content: Buffer.from(old).toString("base64"),
        };
      }
      return originalTransport(path, token, method, body);
    };
    const response = await fix(
      request("generate-fix", { projectId: p.id, findingId: f.id }),
    );
    assert.equal(
      response.status,
      200,
      JSON.stringify(await response.clone().json()),
    );
    const remediation = await response.json();
    assert.equal(remediation.validationResult.ruleRecheckPassed, true);
    assert.equal(
      (await fix(request("generate-fix", { projectId: p.id, findingId: f.id })))
        .status,
      200,
    );
    assert.equal(gh.writes, 1);
    deployed = c;
    gh.head = c;
    page = html.replaceAll("https://site.example", origin);
    gh.source = page;
    assert.equal((await signed(c)).status, 202);
    await runOneJob();
    assert.equal(
      (
        await db.deployment.findFirstOrThrow({
          where: { projectId: p.id },
          orderBy: { deployNumber: "desc" },
        })
      ).status,
      "HEALTHY",
    );
    const scans = await import("../app/api/seo-scan/route");
    const scanResponse = await scans.POST(
      request(
        "seo-scan",
        {
          projectId: p.id,
          pageUrl: origin + "/",
          targetKeywords: ["precision"],
          mode: "heuristic",
        },
        { "idempotency-key": "route-scan-1" },
      ),
    );
    assert.equal(scanResponse.status, 200);
    const scan = await scanResponse.json();
    const batch = {
      projectId: p.id,
      scanId: scan.scanId,
      approvedSuggestionIds: scan.suggestions.map((s: { id: string }) => s.id),
    };
    const seo = await applySeo(request("seo-apply", batch));
    assert.equal(seo.status, 200, JSON.stringify(await seo.clone().json()));
    assert.equal((await applySeo(request("seo-apply", batch))).status, 200);
    assert.equal(gh.writes, 2);
    const citation = await import("../app/api/citation-test/route");
    const citationResponse = await citation.POST(
      request(
        "citation-test",
        {
          projectId: p.id,
          url: origin + "/",
          query: "Summarize calibration",
          expectedFacts: ["documented calibration"],
        },
        { "idempotency-key": "route-citation-1" },
      ),
    );
    assert.equal(citationResponse.status, 200);
    assert.equal((await citationResponse.json()).score, 5);
    for (const [path, module] of [
      ["projects", projectsRoute],
      ["deployments", await import("../app/api/deployments/route")],
      ["graph", await import("../app/api/graph/route")],
      ["geo", await import("../app/api/geo/route")],
      ["seo-scan", scans],
      ["jobs", await import("../app/api/jobs/route")],
      ["readiness", await import("../app/api/readiness/route")],
    ] as const) {
      const res = await module.GET(
        new Request(
          `https://app.example/api/${path}${["projects", "readiness"].includes(path) ? "" : `?projectId=${p.id}`}`,
          { headers: authHeaders },
        ),
      );
      assert.equal(res.status, 200, path);
    }
    const session = await import("../app/api/session/route");
    assert.match(
      (await session.POST(request("session", {}))).headers.get("set-cookie") ||
        "",
      /HttpOnly/,
    );
    console.info(
      "ROUTE E2E PASS: GitHub App JWT -> verified project -> signed push -> real crawl -> regression -> PR replay -> recovery -> SEO PR -> citation. External GitHub/OpenRouter are faithful fakes.",
    );
  } finally {
    t.mock.restoreAll();
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_MODEL;
    delete process.env.GITHUB_APP_ID;
    delete process.env.GITHUB_APP_PRIVATE_KEY;
    await new Promise<void>((r, j) => server.close((e) => (e ? j(e) : r())));
  }
});

test("database publish failure rolls back graph, findings and score atomically", async () => {
  const p = await project("atomic-failure");
  const job = await enqueueAnalysis(p.id, payload(a));
  await db.$executeRawUnsafe(
    `CREATE FUNCTION reject_test_score() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test publication failure'; END $$`,
  );
  await db.$executeRawUnsafe(
    'CREATE TRIGGER reject_test_score BEFORE INSERT ON "Score" FOR EACH ROW EXECUTE FUNCTION reject_test_score()',
  );
  try {
    await runOneJob({
      github: new FakeGitHub().client,
      fetcher: site(html, a),
    });
    assert.equal(
      await db.graphSnapshot.count({
        where: { deploymentId: job.deploymentId },
      }),
      0,
    );
    assert.equal(
      await db.finding.count({ where: { deploymentId: job.deploymentId } }),
      0,
    );
    assert.equal(
      await db.score.count({ where: { deploymentId: job.deploymentId } }),
      0,
    );
    assert.equal(
      (
        await db.deployment.findUniqueOrThrow({
          where: { id: job.deploymentId },
        })
      ).status,
      "FAILED",
    );
  } finally {
    await db.$executeRawUnsafe('DROP TRIGGER reject_test_score ON "Score"');
    await db.$executeRawUnsafe("DROP FUNCTION reject_test_score()");
  }
});

test("successive bad deployments stay regressed until verified recovery; partial crawls cannot resolve findings", async () => {
  const p = await project("persistent-regression");
  const gh = new FakeGitHub();
  await enqueueAnalysis(p.id, payload(a));
  await runOneJob({ github: gh.client, fetcher: site(html, a) });
  for (const commit of [b, c]) {
    const queued = await enqueueAnalysis(p.id, payload(commit));
    await runOneJob({ github: gh.client, fetcher: site(broken, commit) });
    const d = await db.deployment.findUniqueOrThrow({
      where: { id: queued.deploymentId },
      include: { findings: true },
    });
    assert.equal(d.status, "REGRESSION");
    assert.equal(d.findings[0].type, "CANONICAL_STRIPPED");
    assert.equal(JSON.parse(d.findings[0].evidence).firstBadDeploy, "#2");
  }
  await enqueueAnalysis(p.id, payload(sha("d")));
  await runOneJob({ github: gh.client, fetcher: site(html, a) });
  assert.equal(
    await db.recovery.count({
      where: { finding: { deployment: { projectId: p.id } } },
    }),
    0,
  );
  const recovered = await enqueueAnalysis(p.id, payload(sha("e")));
  await runOneJob({ github: gh.client, fetcher: site(html, sha("e")) });
  assert.equal(
    await db.recovery.count({
      where: { deploymentId: recovered.deploymentId },
    }),
    2,
  );
  assert.equal(
    await db.finding.count({
      where: { deployment: { projectId: p.id }, status: "OPEN" },
    }),
    0,
  );
});

test("worker heartbeat distinguishes active, expired and stopped workers and operations is scoped", async () => {
  const { workerPulse, queueHealth } = await import("../lib/jobs/monitor");
  const p = await project("worker-health");
  const id = randomUUID();
  assert.equal((await queueHealth(p.id)).activeWorkers, 0);
  await workerPulse(id);
  assert.equal((await queueHealth(p.id)).activeWorkers, 1);
  await db.workerHeartbeat.update({
    where: { id },
    data: { seenAt: new Date(Date.now() - 120000) },
  });
  assert.equal((await queueHealth(p.id)).activeWorkers, 0);
  await workerPulse(id, "STOPPED");
  assert.equal((await queueHealth(p.id)).activeWorkers, 0);
  const operations = await import("../app/api/operations/route");
  assert.equal(
    (
      await operations.GET(
        new Request(`https://app.example/api/operations?projectId=${p.id}`),
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await operations.GET(
        new Request(`https://app.example/api/operations?projectId=${p.id}`, {
          headers: authHeaders,
        }),
      )
    ).status,
    200,
  );
});

test("open-PR SEO scan applies one replayable optimization PR against the original feature branch", async (t) => {
  const p = await project("pr-seo");
  const gh = new FakeGitHub(); gh.branches.set("feature/page", b);
  const client = new GitHubClient(async (path, token, method, body) => {
    if (path.endsWith("/pulls/17")) return { state: "open", head: { sha: b, ref: "feature/page", repo: { full_name: p.repo } }, base: { ref: "main" } };
    if (path.endsWith("/pulls/17/files?per_page=100")) return [{ filename: "index.html", status: "modified" }];
    return gh.transport(path, token, method, body);
  });
  const { github } = await import("../lib/github/client");
  t.mock.method(github, "head", client.head.bind(client));
  t.mock.method(github, "file", client.file.bind(client));
  t.mock.method(github, "request", client.request.bind(client));
  const scans = await import("../app/api/seo-scan/route");
  const response = await scans.POST(new Request("https://app.example/api/seo-scan", { method: "POST", headers: { ...authHeaders, "idempotency-key": "pr-seo-test-01" }, body: JSON.stringify({ projectId: p.id, prNumber: 17, targetKeywords: ["precision"], mode: "heuristic" }) }));
  assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
  const scan = await response.json();
  const request = () => new Request("https://app.example/api/seo-apply", { method: "POST", headers: authHeaders, body: JSON.stringify({ projectId: p.id, scanId: scan.scanId, approvedSuggestionIds: scan.suggestions.map((s: { id: string }) => s.id) }) });
  const applied = await applySeo(request());
  assert.equal(applied.status, 200, JSON.stringify(await applied.clone().json()));
  assert.equal(gh.prs[0].base.ref, "feature/page");
  assert.equal((await applySeo(request())).status, 200);
  assert.equal(gh.writes, 1);
});

test("configuration changes create a new baseline even for the same commit", async () => {
  const p = await project("configuration-change");
  const original = await enqueueAnalysis(p.id, payload(a));
  const gh = new FakeGitHub();
  await runOneJob({ github: gh.client, fetcher: site(html, a) });
  await db.project.update({
    where: { id: p.id },
    data: { sourceMap: '{"/":"public/index.html"}' },
  });
  const changed = await enqueueAnalysis(p.id, payload(a));
  assert.notEqual(changed.deploymentId, original.deploymentId);
  await runOneJob({
    github: gh.client,
    fetcher: site(html.replace(/<link[^>]+>/, ""), a),
  });
  const deployment = await db.deployment.findUniqueOrThrow({
    where: { id: changed.deploymentId },
    include: { findings: true, score: true },
  });
  assert.equal(deployment.status, "HEALTHY");
  assert.equal(
    deployment.findings.filter((f) => f.type === "CANONICAL_STRIPPED").length,
    0,
  );
  assert.equal(deployment.score?.deltaSearch, 0);
  assert.equal((await enqueueAnalysis(p.id, payload(a))).id, changed.id);
});

test("distributed rate limits, operation concurrency and degraded recheck preserve evidence", async () => {
  const { rateLimit } = await import("../lib/server/api");
  const rateKey = randomUUID();
  const results = await Promise.allSettled(
    Array.from({ length: 6 }, () => rateLimit(rateKey, 3)),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 3);
  assert.equal(results.filter((r) => r.status === "rejected").length, 3);
  const p = await project("recheck");
  const old = await enqueueAnalysis(p.id, payload(a));
  const gh = new FakeGitHub();
  await runOneJob({ github: gh.client, fetcher: site(html, b) });
  assert.equal(
    (await db.deployment.findUniqueOrThrow({ where: { id: old.deploymentId } }))
      .status,
    "DEGRADED",
  );
  const jobs = await import("../app/api/jobs/route");
  const request = () =>
    new Request("https://app.example/api/jobs", {
      method: "POST",
      headers: { ...authHeaders, "idempotency-key": "recheck-test-01" },
      body: JSON.stringify({
        projectId: p.id,
        jobId: old.id,
        action: "recheck",
      }),
    });
  const rechecked = await jobs.POST(request());
  assert.equal(rechecked.status, 200);
  const queued = await rechecked.json();
  assert.notEqual(queued.deploymentId, old.deploymentId);
  assert.equal((await (await jobs.POST(request())).json()).jobId, queued.jobId);
  await runOneJob({ github: gh.client, fetcher: site(html, a) });
  assert.equal(
    await db.graphSnapshot.count({
      where: { deployment: { projectId: p.id } },
    }),
    2,
  );
  assert.equal(
    (
      await db.deployment.findUniqueOrThrow({
        where: { id: queued.deploymentId },
      })
    ).status,
    "HEALTHY",
  );
  let writes = 0;
  const action = () =>
    operation(
      p.id,
      "operator",
      "concurrent",
      randomIdentity,
      { same: true },
      async () => {
        writes++;
        await new Promise((r) => setTimeout(r, 100));
        return { done: true };
      },
    );
  const randomIdentity = randomUUID();
  const calls = await Promise.allSettled([action(), action(), action()]);
  assert.equal(writes, 1);
  assert.ok(calls.some((r) => r.status === "fulfilled"));
  assert.equal((await action()).done, true);
  await assert.rejects(
    () =>
      operation(
        p.id,
        "operator",
        "concurrent",
        randomIdentity,
        { different: true },
        async () => ({ done: true }),
      ),
    /different parameters/,
  );
});
