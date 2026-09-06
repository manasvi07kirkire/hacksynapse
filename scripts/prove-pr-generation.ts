import { PrismaClient } from "@prisma/client";
import { github } from "../lib/github/client";
import { generateRemediationPatch } from "../lib/remediate/patch-generator";
import { createBranchCommitAndPullRequest } from "../lib/github/branch-commit";

async function main() {
  const repo = process.argv[2] || "dvmmisafk/healthcart";
  const db = new PrismaClient();
  const project = await db.project.findFirstOrThrow({ where: { repo } });
  if (!project.installId) throw new Error("Missing installation ID.");

  const context = {
    repo: project.repo,
    installId: project.installId,
    defaultBranch: project.defaultBranch,
  };
  const sha = await github.head(context);
  const siteUrl = project.siteUrl;
  const finding = {
    id: "e2e-llmstxt",
    type: "LLMSTXT_INVALID" as const,
    severity: "MEDIUM" as const,
    confidence: 100,
    lens: "ai-answer" as const,
    title: "LLMSTXT INVALID",
    description: "",
    status: "OPEN" as const,
    evidence: {
      pagesAffected: 1,
      firstBadDeploy: "#1",
      template: "unattributed",
      sampleUrls: ["/llms.txt"],
      details: { ruleVersion: "rules-v2", observations: [] },
    },
    rootCause: null,
  };
  const path = "public/llms.txt";
  const patch = generateRemediationPatch(finding, {
    path,
    current: "",
    previous: "",
    url: new URL("/llms.txt", siteUrl).href,
  });
  const key = "e2e".padEnd(64, "0");
  const pr = await createBranchCommitAndPullRequest(context, {
    key,
    baseSha: sha,
    files: [{ path, content: patch.content! }],
    title: patch.prTitle,
    body: patch.prBody,
    draft: patch.draft !== false,
  });
  console.info(JSON.stringify({ sha, prUrl: pr.prUrl, prNumber: pr.prNumber }, null, 2));
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
