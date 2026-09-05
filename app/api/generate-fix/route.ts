import { z } from "zod";
import { api, jsonBody } from "../../../lib/server/api";
import { selector, id } from "../../../lib/server/validation";
import { resolveProject } from "../../../lib/projects/service";
import { db } from "../../../lib/db";
import { fail } from "../../../lib/server/errors";
import { FindingData } from "../../../lib/detect/types";
import { RULE_VERSION } from "../../../lib/detect/engine";
import { github } from "../../../lib/github/client";
import { generateRemediationPatch } from "../../../lib/remediate/patch-generator";
import { classifyRemediationTier } from "../../../lib/remediate/tier-manager";
import { operation } from "../../../lib/server/operation";
import { createBranchCommitAndPullRequest } from "../../../lib/github/branch-commit";
import { configurationKey } from "../../../lib/projects/configuration";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const POST = api(
  async (req, actor) => {
    const body = await jsonBody(
      req,
      selector.extend({ findingId: id }).strict(),
    );
    const project = await resolveProject(actor, body);
    const f = await db.finding.findFirst({
      where: { id: body.findingId, deployment: { projectId: project.id } },
      include: { deployment: true },
    });
    if (!f) fail(404, "NOT_FOUND", "Finding not found.");
    return operation(
      project.id,
      actor.id,
      "remediation",
      f.id,
      { findingId: f.id },
      async (key) => {
        if (
          f.status !== "OPEN" ||
          f.ruleVersion !== RULE_VERSION ||
          !f.deployment.analysisVersion.endsWith(
            `-${configurationKey(project)}`,
          ) ||
          !f.deployment.revisionVerified ||
          f.deployment.status !== "REGRESSION"
        )
          fail(
            409,
            "UNVERIFIED_FINDING",
            "Finding is stale, unverified, or incompatible.",
          );
        const latest = await db.deployment.findFirst({
          where: {
            projectId: project.id,
            status: { in: ["HEALTHY", "REGRESSION", "DEGRADED"] },
          },
          orderBy: { deployNumber: "desc" },
        });
        if (
          latest?.id !== f.deploymentId ||
          (await github.head(project)) !== f.deployment.sha
        )
          fail(
            409,
            "STALE_FINDING",
            "Analyze the current repository revision first.",
          );
        const finding: FindingData = {
          ...f,
          type: f.type as FindingData["type"],
          severity: f.severity as FindingData["severity"],
          lens: f.lens as FindingData["lens"],
          status: "OPEN",
          evidence: JSON.parse(f.evidence),
          rootCause: JSON.parse(f.rootCause),
        };
        const tier = classifyRemediationTier(finding.type).tier;
        if (tier === "TIER_C") {
          const approval = await db.remediation.findFirst({
            where: {
              findingId: f.id,
              approvedAt: { not: null },
              approvalActor: { not: null },
              baseSha: f.deployment.sha,
            },
          });
          if (!approval)
            fail(
              403,
              "APPROVAL_REQUIRED",
              "Record operator approval before remediation.",
            );
        }
        const previous = await db.deployment.findFirst({
          where: {
            projectId: project.id,
            ref: f.deployment.ref,
            deployNumber: {
              lt: Math.min(
                f.deployment.deployNumber,
                Number(/^#(\d+)$/.exec(finding.evidence.firstBadDeploy)?.[1]) ||
                  f.deployment.deployNumber,
              ),
            },
            analysisVersion: { endsWith: `-${configurationKey(project)}` },
            status: { in: ["HEALTHY", "REGRESSION"] },
            revisionVerified: true,
          },
          orderBy: { deployNumber: "desc" },
        });
        if (!previous)
          fail(
            422,
            "BASELINE_REQUIRED",
            "A verified prior deployment is required.",
          );
        const sourceMap = z
          .record(z.string())
          .parse(JSON.parse(project.sourceMap));
        const sample = finding.evidence.sampleUrls[0];
        const path =
          finding.rootCause?.file ||
          sourceMap[new URL(sample, project.siteUrl).pathname];
        if (!path)
          fail(
            422,
            "SOURCE_MAPPING_REQUIRED",
            "Configure the verified page-to-source mapping or inspect the source diagnosis.",
          );
        const current = await github.file(project, path, f.deployment.sha);
        const prior = await github.file(project, path, previous.sha);
        const patch = generateRemediationPatch(finding, {
          path,
          current,
          previous: prior,
          url: new URL(sample, project.siteUrl).href,
        });
        const pr = await createBranchCommitAndPullRequest(project, {
          key,
          baseSha: f.deployment.sha,
          files: [{ path, content: patch.content! }],
          title: patch.prTitle,
          body: patch.prBody,
          draft: patch.draft !== false,
        });
        await db.remediation.upsert({
          where: { operationKey: key },
          update: { prUrl: pr.prUrl, prNumber: pr.prNumber },
          create: {
            operationKey: key,
            findingId: f.id,
            baseSha: f.deployment.sha,
            tier: patch.tier,
            action: patch.actionSummary,
            patchDiff: patch.diff,
            validationResult: JSON.stringify(patch.validationResult),
            status: patch.draft ? "DRAFT_OPENED" : "PR_OPENED",
            prUrl: pr.prUrl,
            prNumber: pr.prNumber,
          },
        });
        return { ...patch, content: undefined, ...pr };
      },
    );
  },
  { limit: 5 },
);
