import { z } from "zod";
import { api, jsonBody } from "../../../lib/server/api";
import { selector, id } from "../../../lib/server/validation";
import { resolveProject, projectUrl } from "../../../lib/projects/service";
import { db } from "../../../lib/db";
import { github } from "../../../lib/github/client";
import { fail } from "../../../lib/server/errors";
import { operation } from "../../../lib/server/operation";
import {
  applySourceSuggestions,
  validateSelection,
} from "../../../lib/seo-advisor/source-apply";
import { AdvisorPageContent, Suggestion } from "../../../lib/seo-advisor/types";
import { openPullRequest } from "../../../lib/seo-advisor/open-pr";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const POST = api(
  async (req, actor) => {
    const body = await jsonBody(
      req,
      selector
        .extend({
          scanId: id,
          approvedSuggestionIds: z.array(id).min(1).max(6),
          rejectedSuggestionIds: z.array(id).max(6).default([]),
          edits: z.record(id, z.string().trim().min(1).max(2000)).default({}),
        })
        .strict(),
    );
    const p = await resolveProject(actor, body);
    const scan = await db.seoScan.findFirst({
      where: { id: body.scanId, projectId: p.id },
      include: { suggestions: true },
    });
    if (!scan) fail(404, "NOT_FOUND", "Scan not found.");
    validateSelection(
      scan.suggestions.map((s) => s.id),
      body.approvedSuggestionIds,
      body.rejectedSuggestionIds,
      Object.keys(body.edits),
    );
    const params = {
      approved: [...body.approvedSuggestionIds].sort(),
      rejected: [...body.rejectedSuggestionIds].sort(),
      edits: Object.fromEntries(Object.entries(body.edits).sort()),
    };
    return operation(
      p.id,
      actor.id,
      "seo-apply",
      scan.id,
      params,
      async (key) => {
        if (
          !scan.baseSha ||
          !scan.sourcePath ||
          scan.sourceContent === null ||
          scan.status !== "COMPLETE"
        )
          fail(409, "UNVERIFIED_SCAN", "Scan has no verified source.");
        projectUrl(p, scan.pageUrl);
        if (JSON.parse(p.sourceMap)[new URL(scan.pageUrl).pathname] !== scan.sourcePath) fail(409, "STALE_SCAN", "Source mapping changed; create a new scan.");
        if (scan.sourcePrNumber) {
          const pull = z.object({ state: z.literal("open"), head: z.object({ sha: z.string(), ref: z.string(), repo: z.object({ full_name: z.string() }) }), base: z.object({ ref: z.string() }) }).parse(await github.request(p, `/pulls/${scan.sourcePrNumber}`));
          if (pull.head.sha !== scan.baseSha || pull.head.ref !== scan.sourceRef || pull.head.repo.full_name.toLowerCase() !== p.repo || pull.base.ref !== p.defaultBranch) fail(409, "STALE_SCAN", "Pull request changed; create a new scan.");
        }
        if (
          (await github.head(p, scan.sourceRef || p.defaultBranch)) !==
          scan.baseSha
        )
          fail(
            409,
            "STALE_SCAN",
            "Repository changed; scan the current revision before applying.",
          );
        const current = await github.file(p, scan.sourcePath, scan.baseSha);
        if (current !== scan.sourceContent)
          fail(409, "SOURCE_CHANGED", "Source differs from the scan.");
        const approved = scan.suggestions
          .filter((s) => body.approvedSuggestionIds.includes(s.id))
          .map((s) => ({
            ...s,
            after: body.edits[s.id] || s.after,
            status: "approved" as const,
            type: s.type as Suggestion["type"],
          }));
        const result = applySourceSuggestions(
          scan.sourcePath,
          scan.pageUrl,
          current,
          JSON.parse(scan.content) as AdvisorPageContent,
          JSON.parse(scan.targetKeywords),
          approved,
        );
        if (!result.validation.passed)
          fail(
            422,
            "SEO_VALIDATION_FAILED",
            "Patched content failed on-page validation.",
          );
        const pr = await openPullRequest(scan.pageUrl, approved, {
          project: p,
          key,
          baseSha: scan.baseSha,
          baseBranch: scan.sourceRef || p.defaultBranch,
          path: scan.sourcePath,
          content: result.source,
        });
        await db.$transaction(async (tx) => {
          await tx.seoSuggestion.updateMany({
            where: { scanId: scan.id, id: { in: body.approvedSuggestionIds } },
            data: { status: "applied" },
          });
          await tx.seoSuggestion.updateMany({
            where: { scanId: scan.id, id: { in: body.rejectedSuggestionIds } },
            data: { status: "rejected" },
          });
          await tx.seoOptimizationPR.upsert({
            where: { operationKey: key },
            update: {},
            create: {
              operationKey: key,
              scanId: scan.id,
              prUrl: pr.prUrl,
              prNumber: pr.prNumber,
              appliedSuggestionIds: JSON.stringify(body.approvedSuggestionIds),
              validationResult: JSON.stringify(result.validation),
              status: "OPEN",
            },
          });
        });
        return {
          ...pr,
          diff: result.diff,
          validation: result.validation,
          appliedSuggestionIds: body.approvedSuggestionIds,
        };
      },
    );
  },
  { limit: 5 },
);
