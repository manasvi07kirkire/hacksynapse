import { test, expect, Page } from "@playwright/test";
const projects = [
  {
    id: "project-alpha",
    repo: "example/alpha",
    siteUrl: "https://alpha.example/",
    defaultBranch: "main",
  },
  {
    id: "project-beta",
    repo: "example/beta",
    siteUrl: "https://beta.example/",
    defaultBranch: "main",
  },
];
const requests: { path: string; body: Record<string, unknown> }[] = [];
async function mockApi(page: Page) {
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const body = req.method() === "POST" ? req.postDataJSON() : {};
    if (req.method() === "POST") requests.push({ path, body });
    const id =
      url.searchParams.get("projectId") || body.projectId || projects[0].id;
    const project = projects.find((p) => p.id === id)!;
    let data: unknown = {};
    if (path === "/api/projects")
      data = req.method() === "POST" ? { project: projects[0] } : { projects };
    if (path === "/api/deployments")
      data = {
        deployments: [
          {
            id: `deployment-${id}`,
            sha: "a".repeat(40),
            deployNumber: 7,
            status: "HEALTHY",
            degradation: "[]",
            findings: [],
            recoveries: [],
            jobs: [],
            score: { searchHealth: 91, geoScore: 65 },
          },
        ],
        nextCursor: null,
      };
    if (path === "/api/run-analysis")
      data = { jobId: "job-queued", status: "QUEUED" };
    if (path === "/api/jobs") data = { jobs: [] };
    if (path === "/api/geo")
      data = {
        score: { searchHealth: 91, geoScore: 65, breakdown: {} },
        citationTest: null,
      };
    if (path === "/api/graph")
      data = {
        snapshot: {
          id: "graph",
          deploymentId: `deployment-${id}`,
          complete: true,
          nodes: [],
          edges: [],
        },
      };
    if (path === "/api/operations")
      data = {
        activeWorkers: 1,
        jobs: {},
        oldestQueuedSeconds: 0,
        expiredLeases: 0,
      };
    if (path === "/api/citation-test")
      data = {
        url: project.siteUrl,
        query: body.query,
        score: 5,
        modelAnswer: "Verified source fact.",
        modelUsed: "test-model",
        groundedFacts: [{ fact: "Verified source fact.", isGrounded: true }],
      };
    if (path === "/api/seo-scan")
      data =
        req.method() === "GET"
          ? { scans: [], pageCounts: 0 }
          : {
              scanId: "scan-alpha",
              pageUrl: project.siteUrl,
              targetKeywords: ["precision"],
              suggestions: [
                {
                  id: "suggestion-title",
                  type: "rewrite-title",
                  location: "title",
                  before: "Workshop tools",
                  after: "Precision workshop tools",
                  rationale: "Source-grounded wording",
                  confidence: 90,
                  status: "pending",
                },
              ],
            };
    if (path === "/api/seo-apply")
      data = { prUrl: "https://github.com/example/alpha/pull/1", prNumber: 1 };
    await route.fulfill({
      status: path === "/api/run-analysis" ? 202 : 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
}
test.beforeEach(async ({ page }) => {
  requests.length = 0;
  await mockApi(page);
});

test("dashboard shows the selected project's persisted deployment", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "example/alpha", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Deployment #7/).first()).toBeVisible();
  await expect(page.getByText("SIMULATE POISON", { exact: true })).toHaveCount(
    0,
  );
});
test("project switching clears the previous project and analysis sends selected ownership", async ({
  page,
}) => {
  await page.goto("/watch");
  await page.getByLabel("Connected project").selectOption("project-beta");
  await expect(
    page.getByRole("heading", { name: "example/beta", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Analyze current deployment" })
    .click();
  await expect
    .poll(() => requests.find((r) => r.path === "/api/run-analysis")?.body)
    .toEqual({ projectId: "project-beta" });
  await expect(page.getByRole("status")).toContainText("job-queued");
});
test("citation form uses the selected URL and actual user query, clearing results on project change", async ({
  page,
}) => {
  await page.goto("/geo");
  await expect(page.getByLabel("Page URL")).toHaveValue(
    "https://alpha.example/",
  );
  await page
    .getByLabel("Question")
    .fill("What documented facts are supported?");
  await page
    .getByRole("button", { name: "Run citation test", exact: true })
    .click();
  await expect(
    page.getByText("Verified source fact.", { exact: true }).first(),
  ).toBeVisible();
  expect(requests.find((r) => r.path === "/api/citation-test")?.body).toEqual({
    projectId: "project-alpha",
    url: "https://alpha.example/",
    query: "What documented facts are supported?",
  });
  await page.getByLabel("Connected project").selectOption("project-beta");
  await expect(page.getByLabel("Page URL")).toHaveValue(
    "https://beta.example/",
  );
  await expect(
    page.getByText("Verified source fact.", { exact: true }),
  ).toHaveCount(0);
});
test("SEO approval includes the user's edited suggestion in the combined PR request", async ({
  page,
}) => {
  await page.goto("/seo-advisor");
  await page.getByLabel("Target keywords").fill("precision");
  await page.getByRole("button", { name: "Scan page", exact: true }).click();
  await page
    .getByLabel("Edit suggestion: title")
    .fill("Precision workshop equipment");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page
    .getByRole("button", { name: "Open combined draft PR", exact: true })
    .click();
  await expect
    .poll(() => requests.find((r) => r.path === "/api/seo-apply")?.body.edits)
    .toEqual({ "suggestion-title": "Precision workshop equipment" });
  await expect(
    page.getByRole("link", { name: "Review PR #1" }),
  ).toHaveAttribute("href", "https://github.com/example/alpha/pull/1");
});
test("connect submits credentials in the header and clears the password after login", async ({
  page,
}) => {
  let suppliedKey = "";
  await page.route("**/api/session", async (route) => {
    suppliedKey = route.request().headers()["x-searchops-key"];
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto("/connect");
  await page.getByLabel("Operator key").fill("test-browser-operator-secret");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByLabel("Operator key")).toHaveValue("");
  expect(suppliedKey).toBe("test-browser-operator-secret");
});
test("project pages navigate and hydrate without uncaught browser errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const path of ["/watch", "/graph", "/geo", "/seo-advisor", "/connect"]) {
    await page.goto(path);
    await expect(page.getByLabel("Connected project")).toHaveValue(
      "project-alpha",
    );
  }
  expect(errors).toEqual([]);
});
