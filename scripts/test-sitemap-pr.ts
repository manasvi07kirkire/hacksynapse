#!/usr/bin/env node
/** Open a draft PR for the latest healthcart SITEMAP finding (local GitHub App). */
import { createHash, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { github } from "../lib/github/client";
import { generateRemediationPatch } from "../lib/remediate/patch-generator";
import { createBranchCommitAndPullRequest } from "../lib/github/branch-commit";
import { resolveRemediationPath } from "../lib/remediate/resolve-remediation-source";
import { readRepoSource } from "../lib/remediate/resolve-remediation-source";

async function main() {
  const repo = process.argv[2] || "dvmmisafk/healthcart";
  const db = new PrismaClient();
  const project = await db.project.findFirstOrThrow({ where: { repo } });
  if (!project.installId) throw new Error("Missing GitHub App installation ID.");

  const context = {
    repo: project.repo,
    installId: project.installId,
    defaultBranch: project.defaultBranch,
  };
  const head = await github.head(context);
  const sourceMap = JSON.parse(project.sourceMap) as Record<string, string>;
  const siteUrl = project.siteUrl;
  const finding = {
    id: "e2e-sitemap",
    type: "SITEMAP_INCONSISTENCY" as const,
    severity: "MEDIUM" as const,
    confidence: 100,
    lens: "search" as const,
    title: "Sitemap inconsistency",
    description: "",
    status: "OPEN" as const,
    evidence: {
      pagesAffected: 1,
      firstBadDeploy: "#1",
      template: "unattributed",
      sampleUrls: [siteUrl.replace(/\/$/, "") + "/"],
      details: { ruleVersion: "rules-v2", observations: [] },
    },
    rootCause: null,
  };
  const path = resolveRemediationPath(finding, sourceMap, siteUrl);
  if (!path) throw new Error("Could not resolve sitemap source path.");
  const current = await readRepoSource(github, context, path, head, true);
  const patch = generateRemediationPatch(finding, {
    path,
    current,
    previous: current,
    url: finding.evidence.sampleUrls[0],
  });
  const key = createHash("sha256").update(randomUUID()).digest("hex");
  const pr = await createBranchCommitAndPullRequest(context, {
    key,
    baseSha: head,
    files: [{ path, content: patch.content! }],
    title: patch.prTitle,
    body: patch.prBody,
    draft: patch.draft !== false,
  });
  console.info(JSON.stringify({ head, path, prUrl: pr.prUrl, prNumber: pr.prNumber }, null, 2));
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
