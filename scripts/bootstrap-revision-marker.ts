import { PrismaClient } from "@prisma/client";
import { github } from "../lib/github/client";

const VERCEL_JSON = (sha: string) => ({
  headers: [
    {
      source: "/(.*)",
      headers: [{ key: "X-SearchOps-Sha", value: sha }],
    },
  ],
});

const WRITE_SHA_SCRIPT = `import { writeFileSync } from "node:fs";

const sha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.COMMIT_SHA ||
  "local-dev";

writeFileSync(
  "vercel.json",
  JSON.stringify(
    {
      headers: [
        {
          source: "/(.*)",
          headers: [{ key: "X-SearchOps-Sha", value: sha }],
        },
      ],
    },
    null,
    2,
  ) + "\\n",
);
console.info("SearchOps revision marker written:", sha.slice(0, 7));
`;

async function putFile(
  context: { repo: string; installId: string; defaultBranch: string },
  path: string,
  content: string,
  message: string,
) {
  let sha: string | undefined;
  try {
    const existing = (await github.request(
      context,
      `/contents/${path.split("/").map(encodeURIComponent).join("/")}`,
    )) as { sha?: string };
    sha = existing.sha;
  } catch {
    sha = undefined;
  }
  await github.request(
    context,
    `/contents/${path.split("/").map(encodeURIComponent).join("/")}`,
    "PUT",
    {
      message,
      content: Buffer.from(content).toString("base64"),
      ...(sha ? { sha } : {}),
      branch: context.defaultBranch,
    },
  );
}

async function main() {
  const repo = process.argv[2] || "dvmmisafk/healthcart";
  const db = new PrismaClient();
  const project = await db.project.findFirstOrThrow({ where: { repo } });
  if (!project.installId)
    throw new Error(`Project ${repo} has no GitHub App installation ID.`);

  const context = {
    repo: project.repo,
    installId: project.installId,
    defaultBranch: project.defaultBranch,
  };
  const headSha = await github.head(context);

  await putFile(
    context,
    "scripts/write-searchops-vercel-json.mjs",
    WRITE_SHA_SCRIPT,
    "chore(searchops): add build script for revision marker header",
  );

  const pkgRaw = (await github.request(
    context,
    "/contents/package.json",
  )) as { content: string };
  const pkg = JSON.parse(
    Buffer.from(pkgRaw.content, "base64").toString("utf8"),
  ) as { scripts?: Record<string, string> };
  const build = pkg.scripts?.build || "vite build";
  if (!build.includes("write-searchops-vercel-json.mjs")) {
    pkg.scripts = {
      ...pkg.scripts,
      build: `node scripts/write-searchops-vercel-json.mjs && ${build.replace(/^node scripts\/write-searchops-vercel-json\.mjs && /, "")}`,
    };
    await putFile(
      context,
      "package.json",
      `${JSON.stringify(pkg, null, 2)}\n`,
      "chore(searchops): emit X-SearchOps-Sha during Vercel build",
    );
  }

  const commitSha = await github.head(context);
  await putFile(
    context,
    "vercel.json",
    `${JSON.stringify(VERCEL_JSON(commitSha), null, 2)}\n`,
    "chore(searchops): pin revision marker to current commit for immediate deploy",
  );

  const sourceMap = {
    ...JSON.parse(project.sourceMap),
    "/llms.txt": "public/llms.txt",
  };
  await db.project.update({
    where: { id: project.id },
    data: { sourceMap: JSON.stringify(sourceMap) },
  });

  console.info(`Updated ${repo} revision marker wiring (head ${commitSha.slice(0, 7)})`);
  console.info("Wait for Vercel to redeploy healthcart, then re-analyze in SearchOps.");
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
