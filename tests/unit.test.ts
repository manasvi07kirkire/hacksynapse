import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, generateKeyPairSync } from "node:crypto";
import { persistentFindings } from "../lib/detect/persistent-findings";
import { productionRequirements } from "../lib/server/production";
import { isPublicAddress, normalizeUrl, pickPinnedAddress } from "../lib/crawler/safe-fetch";
import { verifyWebhook } from "../lib/github/webhook-verify";
import { parseHtml } from "../lib/extract/html-parser";
import { parseSitemapXml } from "../lib/extract/sitemap-parser";
import { parseLlmsTxt } from "../lib/extract/llmstxt-parser";
import { buildDiscoverabilityGraph } from "../lib/graph/builder";
import { runDetectionRules } from "../lib/detect/engine";
import { diffGraphSnapshots } from "../lib/graph/diff";
import { computeScores } from "../lib/geo/scorer";
import { diagnoseRootCause } from "../lib/diagnose/signature-matcher";
import { generateRemediationPatch } from "../lib/remediate/patch-generator";
import {
  strictApply,
  assertSafePath,
  sourceDiff,
} from "../lib/remediate/validate-patch";
import { checkFacts } from "../lib/geo/citation-test";
import { parseSuggestions } from "../lib/seo-advisor/suggest";
import { extractHtmlContent } from "../lib/seo-advisor/extract-target";
import { validateSelection } from "../lib/seo-advisor/source-apply";
import { OpenRouterClient } from "../lib/llm/openrouter";
import {
  FREE_MODELS_CHAIN,
  isFreeModel,
  resolveFreeModelChain,
} from "../lib/llm/free-models";
import { authenticate, equalSecret, sessionCookie } from "../lib/auth/api-key";
import { jsonBody, query } from "../lib/server/api";
import { z } from "zod";
const good =
  '<html><head><title>A precision measuring tool</title><meta name="description" content="A precision tool with documented calibration and a durable stainless steel housing for workshop use."><link rel="canonical" href="https://site.example/"><script type="application/ld+json">{"@type":"WebSite","name":"Tools","url":"https://site.example/"}</script></head><body><h1>Tools</h1><p>Precision tools with documented calibration and a durable stainless steel housing for workshop use.</p><a href="/second">Second</a></body></html>';
const graph = (html = good, id = "base") => ({
  ...buildDiscoverabilityGraph(id, [parseHtml("https://site.example/", html)]),
  llmsTxtValid: true,
  sitemapUrls: ["https://site.example/"],
});
const detect = (current = graph(), previous?: ReturnType<typeof graph>) =>
  runDetectionRules({
    deploymentSha: "a".repeat(40),
    deployNumber: 184,
    currentSnapshot: current,
    previousSnapshot: previous,
  });
for (const [type, badHtml] of [
  ["CANONICAL_STRIPPED", good.replace(/<link[^>]+>/, "")],
  ["NOINDEX_FLIPPED", good.replace("</head>", '<meta name="robots" content="noindex"></head>')],
  ["SCHEMA_REMOVED", good.replace(/<script[\s\S]*?<\/script>/, "")],
] as const) {
  test(`${type} remains open across unchanged bad revisions and resolves only on repair`, () => {
    const baseline = graph(); const bad = { ...graph(badHtml), complete: true };
    const findings = detect(bad, baseline);
    assert.ok(findings.some((f) => f.type === type));
    const carried = persistentFindings(bad, detect(bad, bad), findings);
    assert.ok(carried.some((f) => f.type === type));
    assert.equal(persistentFindings({ ...baseline, complete: true }, detect(baseline, bad), carried).filter((f) => f.type === type).length, 0);
    assert.deepEqual(persistentFindings({ ...bad, complete: false }, [], findings), []);
  });
}
test("production preflight rejects missing services, weak secrets and insecure connections", () => {
  const saved = { ...process.env };
  try {
    Object.assign(process.env, { NODE_ENV: "production", SEARCHOPS_API_KEY: "test-operator-key-at-least-32-characters", SEARCHOPS_PROJECT_KEYS: "{}", SEARCHOPS_LOCAL_DEMO: "false", SEARCHOPS_ALLOW_PRIVATE_CRAWL: "false", SEARCHOPS_ALLOW_PAT: "false", ALLOW_LLM_FALLBACK: "false", USE_PLAYWRIGHT: "false", DATABASE_URL: "postgresql://u:p@db.example/db?sslmode=require", DIRECT_URL: "postgresql://u:p@db.example/db?sslmode=require", GITHUB_APP_ID: "42", GITHUB_APP_SLUG: "test-app", GITHUB_APP_WEBHOOK_SECRET: "s".repeat(32), OPENROUTER_API_KEY: "test", OPENROUTER_MODEL: "liquid/lfm-2.5-2.6b:free", NEXT_PUBLIC_APP_URL: "https://app.example" });
    delete process.env.GITHUB_APP_PRIVATE_KEY;
    assert.throws(productionRequirements, /required environment/);
    process.env.GITHUB_APP_PRIVATE_KEY = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    assert.doesNotThrow(productionRequirements);
    process.env.OPENROUTER_MODEL = "openai/gpt-4o-mini";
    assert.throws(productionRequirements, /:free OpenRouter model/);
    process.env.OPENROUTER_MODEL = "liquid/lfm-2.5-2.6b:free";
    process.env.DATABASE_URL = "postgresql://u:p@db.example/db";
    assert.throws(productionRequirements, /TLS PostgreSQL/);
    process.env.GITHUB_APP_WEBHOOK_SECRET = "short";
    assert.throws(productionRequirements, /at least 32/);
  } finally { for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key]; Object.assign(process.env, saved); }
});
for (const address of [
  "127.0.0.1",
  "10.1.2.3",
  "169.254.169.254",
  "100.64.1.1",
  "192.0.0.1",
  "192.168.1.1",
  "224.0.0.1",
  "0.0.0.0",
  "::1",
  "::",
  "fc00::1",
  "fe80::1",
  "::ffff:127.0.0.1",
  "2001:db8::1",
]) {
  test(`SSRF rejects ${address}`, () =>
    assert.equal(isPublicAddress(address), false));
}
test("public IPv4 and IPv6", () => {
  assert.ok(isPublicAddress("8.8.8.8"));
  assert.ok(isPublicAddress("2606:4700:4700::1111"));
});
test("pickPinnedAddress prefers public IPv4 when DNS also returns NAT64 IPv6", () => {
  const addresses = [
    { address: "64:ff9b::401d:1183", family: 6 },
    { address: "216.198.79.195", family: 4 },
  ];
  const publicOnly = addresses.filter((a) => isPublicAddress(a.address));
  assert.equal(publicOnly.length, 1);
  assert.equal(pickPinnedAddress(publicOnly).address, "216.198.79.195");
});
test("URL canonicalization and traversal", () => {
  assert.equal(
    normalizeUrl("https://SITE.example:443/a/?q=1#x"),
    "https://site.example/a",
  );
  for (const u of [
    "file:///etc/passwd",
    "https://u:p@site.example",
    "https://site.example/%2e%2e/a",
    "https://site.example/\\a",
  ])
    assert.throws(() => normalizeUrl(u));
});
test("HMAC authenticates exact raw bytes, rejects malformed/duplicate signatures", () => {
  const raw = '{"hello":true}';
  const sig =
    "sha256=" + createHmac("sha256", "secret").update(raw).digest("hex");
  assert.ok(verifyWebhook(raw, sig, "secret"));
  for (const invalid of [
    null,
    sig + ", " + sig,
    sig.toUpperCase(),
    "sha1=" + sig.slice(7),
  ])
    assert.equal(verifyWebhook(raw, invalid, "secret"), false);
  assert.equal(verifyWebhook(raw + " ", sig, "secret"), false);
});
test("baseline only absolute rules; healthy baseline and recovery", () => {
  const bad = good.replace(/<link[^>]+>/, "");
  assert.deepEqual(detect(graph()), []);
  assert.equal(
    detect(graph(bad)).some((f) => f.type === "CANONICAL_STRIPPED"),
    false,
  );
  assert.deepEqual(detect(graph(good, "recovered"), graph(bad)), []);
});
for (const [type, mutate] of [
  ["CANONICAL_STRIPPED", (s: string) => s.replace(/<link[^>]+>/, "")],
  [
    "NOINDEX_FLIPPED",
    (s: string) =>
      s.replace("</head>", '<meta name="robots" content="noindex"></head>'),
  ],
  ["SCHEMA_REMOVED", (s: string) => s.replace(/<script[\s\S]*?<\/script>/, "")],
  ["SCHEMA_INVALID", (s: string) => s.replace('{"@type"', '{bad"@type"')],
  ["TITLE_MISSING", (s: string) => s.replace(/<title>.*?<\/title>/, "")],
  [
    "META_DESCRIPTION_MISSING",
    (s: string) => s.replace(/<meta name="description"[^>]+>/, ""),
  ],
] as const) {
  test(`${type} positive, negative, evidence and partial guards`, () => {
    assert.equal(
      detect(graph(good, "same"), graph()).some((f) => f.type === type),
      false,
    );
    const bad = graph(mutate(good), "bad");
    const found = detect(bad, graph()).find((f) => f.type === type);
    assert.ok(found);
    assert.equal(found.evidence.pagesAffected, 1);
    assert.equal(found.rootCause, null);
    assert.ok(found.evidence.details);
    if (
      ["CANONICAL_STRIPPED", "NOINDEX_FLIPPED", "SCHEMA_REMOVED"].includes(type)
    ) {
      assert.equal(
        detect({ ...bad, complete: false }, graph()).some(
          (f) => f.type === type,
        ),
        false,
      );
    }
  });
}
test("orphan reachability, duplicate title and sitemap rules", () => {
  const g = {
    ...graph(),
    ...buildDiscoverabilityGraph("b", [
      parseHtml(
        "https://site.example/",
        good.replace('<a href="/second">Second</a>', ""),
      ),
      parseHtml("https://site.example/second", good),
    ]),
  };
  const types = detect(g).map((f) => f.type);
  assert.ok(types.includes("ORPHAN_PAGE"));
  assert.ok(types.includes("DUPLICATE_TITLE"));
  assert.ok(types.includes("SITEMAP_INCONSISTENCY"));
  assert.equal(
    detect({ ...g, complete: false }).some((f) =>
      ["ORPHAN_PAGE", "DUPLICATE_TITLE", "SITEMAP_INCONSISTENCY"].includes(
        f.type,
      ),
    ),
    false,
  );
});
test("sitemap patch adds missing URLs for draft remediation", () => {
  const { generateRemediationPatch } =
    require("../lib/remediate/patch-generator") as typeof import("../lib/remediate/patch-generator");
  const finding = {
    id: "test-sitemap",
    type: "SITEMAP_INCONSISTENCY" as const,
    severity: "MEDIUM" as const,
    confidence: 100,
    lens: "search" as const,
    title: "Sitemap",
    description: "",
    status: "OPEN" as const,
    evidence: {
      pagesAffected: 1,
      firstBadDeploy: "#1",
      template: "unattributed",
      sampleUrls: ["https://site.example/"],
      details: { ruleVersion: "rules-v2", observations: [] },
    },
    rootCause: null,
  };
  const patch = generateRemediationPatch(finding, {
    path: "public/sitemap.xml",
    current: "",
    previous: "",
    url: "https://site.example/",
  });
  assert.match(patch.content || "", /site\.example/);
  assert.equal(patch.draft, true);
});
test("llms.txt patch generates valid new file content", () => {
  const { generateRemediationPatch } =
    require("../lib/remediate/patch-generator") as typeof import("../lib/remediate/patch-generator");
  const patch = generateRemediationPatch(
    {
      id: "f1",
      type: "LLMSTXT_INVALID",
      severity: "MEDIUM",
      confidence: 100,
      lens: "ai-answer",
      title: "LLMSTXT INVALID",
      description: "",
      status: "OPEN",
      evidence: {
        pagesAffected: 1,
        firstBadDeploy: "#1",
        template: "unattributed",
        sampleUrls: ["/llms.txt"],
        details: { ruleVersion: "rules-v2", observations: [] },
      },
      rootCause: null,
    },
    {
      path: "public/llms.txt",
      current: "",
      previous: "",
      url: "https://site.example/llms.txt",
    },
  );
  assert.equal(patch.validationResult.ruleRecheckPassed, true);
  assert.match(patch.content || "", /^# /);
});
test("llms.txt deterministic missing/invalid/valid", () => {
  assert.equal(parseLlmsTxt("").isValid, false);
  assert.equal(
    parseLlmsTxt("# Site\n## Pages\n- [Home](javascript:alert)").isValid,
    false,
  );
  assert.equal(parseLlmsTxt("# Site\n## Pages\n- [Home](/)").isValid, true);
  assert.ok(
    detect({ ...graph(), llmsTxtValid: false }).some(
      (f) => f.type === "LLMSTXT_INVALID",
    ),
  );
});
test("extraction retains malformed schema and exact robots tokens, resolves relative links", () => {
  const p = parseHtml(
    "https://site.example/dir/page",
    '<meta name="robots" content="notnoindex"><meta name="robots" content="none"><a href="child">x</a><script type="application/ld+json">{bad}</script>',
  );
  assert.equal(p.robotsDirectives.noindex, true);
  assert.deepEqual(p.internalLinks, ["https://site.example/dir/child"]);
  assert.equal(p.schemaErrors?.length, 1);
  assert.equal(
    parseHtml(
      "https://site.example",
      '<meta name="robots" content="notnoindex">',
    ).robotsDirectives.noindex,
    false,
  );
});
test("sitemap rejects XML entities and malformed XML", () => {
  assert.throws(() =>
    parseSitemapXml('<!DOCTYPE x [<!ENTITY x "secret">]><urlset/>'),
  );
  assert.throws(() => parseSitemapXml("<urlset>"));
  assert.equal(
    parseSitemapXml(
      "<urlset><url><loc>https://site.example/</loc></url></urlset>",
    )[0].loc,
    "https://site.example/",
  );
});
test("graph IDs and diffs independent of input order; edge deltas populated", () => {
  const p = [
    parseHtml("https://site.example/", good),
    parseHtml("https://site.example/second", good),
  ];
  const a = buildDiscoverabilityGraph("a", p),
    b = buildDiscoverabilityGraph("b", p.toReversed());
  assert.deepEqual(a.nodes, b.nodes);
  assert.deepEqual(a.edges, b.edges);
  assert.equal(diffGraphSnapshots(a, b).changedNodes.length, 0);
  assert.ok(diffGraphSnapshots(a, { ...b, edges: [] }).removedEdges.length);
  assert.throws(() => diffGraphSnapshots(a, { ...b, complete: false }));
});
test("scores finite, bounded, reproducible and no invented grounding", () => {
  const a = computeScores(graph(), []);
  assert.deepEqual(a, computeScores(graph(), []));
  assert.equal(a.breakdown.citationGroundingScore, 0);
  const empty = computeScores(
    { ...graph(), nodes: [], edges: [], llmsTxtValid: undefined },
    [],
  );
  assert.equal(empty.searchHealth, 0);
  assert.equal(empty.geoScore, 0);
});
test("diagnosis never guesses and reads hunk line numbers", () => {
  assert.equal(diagnoseRootCause({ type: "CANONICAL_STRIPPED" }, []), null);
  assert.equal(
    diagnoseRootCause({ type: "CANONICAL_STRIPPED" }, [
      {
        filename: "index.html",
        patch: '@@ -8,2 +8,1 @@\n-<link rel="canonical">\n </head>',
        additions: 0,
        deletions: 1,
      },
    ])?.line,
    8,
  );
});
test("safe Tier A source edit, exact context and honest validation", () => {
  const bad = good.replace(/<link[^>]+>/, "");
  const f = detect(graph(bad, "bad"), graph()).find(
    (f) => f.type === "CANONICAL_STRIPPED",
  )!;
  assert.throws(() => generateRemediationPatch(f));
  const patch = generateRemediationPatch(f, {
    path: "index.html",
    current: bad,
    previous: good,
    url: "https://site.example/",
  });
  assert.equal(patch.draft, false);
  assert.equal(patch.validationResult.ruleRecheckPassed, true);
  assert.equal(
    parseHtml(
      "https://site.example/",
      strictApply("index.html", bad, patch.diff),
    ).canonicalUrl,
    "https://site.example/",
  );
  assert.throws(() => strictApply("index.html", "stale", patch.diff));
});
test("patch rejects path traversal, sensitive paths, binary and unrelated files", () => {
  for (const p of [
    "../a.ts",
    "/a.ts",
    "C:\\a.ts",
    ".github/workflows/a.yml",
    "node_modules/a.ts",
    "src/%2e%2e/a.ts",
    "src\\a.ts",
    "a\u0000.ts",
    "package.json",
  ])
    assert.throws(() => assertSafePath(p));
  assert.throws(() => strictApply("a.ts", "a", sourceDiff("b.ts", "a", "b")));
});
test("citation requires exact source AND answer phrase, no empty fact success", () => {
  assert.equal(
    checkFacts(["$999"], "cost $100", "cost $999")[0].isGrounded,
    false,
  );
  assert.equal(
    checkFacts(
      ["hardened steel"],
      "Hardened steel housing",
      "uses hardened steel",
    )[0].isGrounded,
    true,
  );
});
test("SEO selection ownership, duplicate/overlap and grounding", () => {
  for (const args of [
    [["a"], ["b"], []],
    [["a"], ["a", "a"], []],
    [["a"], ["a"], ["a"]],
  ] as [string[], string[], string[]][])
    assert.throws(() => validateSelection(...args));
  const content = extractHtmlContent("https://site.example/", good);
  assert.throws(() =>
    parseSuggestions(
      [
        {
          type: "rewrite-title",
          location: "title",
          before: "fabricated",
          after: "title",
          rationale: "x",
          confidence: 80,
        },
      ],
      content,
    ),
  );
  assert.throws(() =>
    parseSuggestions(
      [
        {
          type: "rewrite-title",
          location: "title",
          before: content.title,
          after: "title",
          rationale: "x",
          confidence: NaN,
        },
      ],
      content,
    ),
  );
});
test("LLM absence fails closed; malformed output fails", async () => {
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_MODEL;
  await assert.rejects(
    () => new OpenRouterClient().completeWithFallback([]),
    /Configure/,
  );
  process.env.OPENROUTER_API_KEY = "test";
  process.env.OPENROUTER_MODEL = "liquid/lfm-2.5-2.6b:free";
  await assert.rejects(() =>
    new OpenRouterClient("test", async () =>
      Response.json({ choices: [] }),
    ).completeWithFallback([]),
  );
});
test("OpenRouter uses only free models and falls back through the chain", async () => {
  process.env.OPENROUTER_API_KEY = "test";
  process.env.OPENROUTER_MODEL = "liquid/lfm-2.5-2.6b:free";
  assert.throws(
    () => resolveFreeModelChain("openai/gpt-4o-mini"),
    /not free/,
  );
  assert.equal(isFreeModel("liquid/lfm-2.5-2.6b:free"), true);
  const chain = resolveFreeModelChain();
  assert.ok(chain.every((model) => model.endsWith(":free")));
  assert.deepEqual(chain.slice(0, FREE_MODELS_CHAIN.length), [
    ...FREE_MODELS_CHAIN,
  ]);
  let calls = 0;
  const result = await new OpenRouterClient("test", async (_input, init) => {
    calls += 1;
    const body = JSON.parse(String(init?.body)) as { model: string };
    if (body.model === "liquid/lfm-2.5-2.6b:free")
      return Response.json({ choices: [] }, { status: 429 });
    if (body.model === "minimax/minimax-m2.7:free")
      return Response.json({
        choices: [
          {
            message: { content: '{"ok":true}' },
            finish_reason: "stop",
          },
        ],
      });
    return Response.json({ choices: [] }, { status: 404 });
  }).completeWithFallback([{ role: "user", content: "hi" }], { jsonMode: true });
  assert.equal(calls, 2);
  assert.equal(result.modelUsed, "minimax/minimax-m2.7:free");
  assert.equal(result.isFallback, true);
});
test("authentication constant-time value check, project scope, session and CSRF", () => {
  process.env.SEARCHOPS_API_KEY = "operator-key-with-more-than-32-characters";
  process.env.SEARCHOPS_PROJECT_KEYS = JSON.stringify({
    p1: "project-one-key-with-at-least-32-characters",
  });
  assert.equal(equalSecret("a", "b"), false);
  assert.throws(() =>
    authenticate(new Request("https://app.example/api/projects")),
  );
  assert.equal(
    authenticate(
      new Request("https://app.example/api/projects", {
        headers: {
          "x-searchops-key": "project-one-key-with-at-least-32-characters",
        },
      }),
    ).projectId,
    "p1",
  );
  const cookie = sessionCookie().split(";")[0];
  assert.equal(
    authenticate(
      new Request("https://app.example/api/projects", { headers: { cookie } }),
    ).admin,
    true,
  );
  assert.throws(() =>
    authenticate(
      new Request("https://app.example/api/projects", {
        method: "POST",
        headers: { cookie, origin: "https://evil.example" },
      }),
    ),
  );
});
test("request schemas reject wrong content type, malformed JSON, oversize and duplicate query", async () => {
  await assert.rejects(() =>
    jsonBody(
      new Request("https://app.example", { method: "POST", body: "{}" }),
      z.object({}),
    ),
  );
  await assert.rejects(() =>
    jsonBody(
      new Request("https://app.example", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "bad",
      }),
      z.object({}),
    ),
  );
  await assert.rejects(() =>
    jsonBody(
      new Request("https://app.example", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '"' + "a".repeat(70000) + '"',
      }),
      z.string(),
    ),
  );
  assert.throws(() =>
    query(
      new Request("https://app.example/?id=a&id=b"),
      z.object({ id: z.string() }),
    ),
  );
});
