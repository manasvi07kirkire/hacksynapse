import { z } from "zod";
import { api, jsonBody, query } from "../../../lib/server/api";
import { selector, url, text } from "../../../lib/server/validation";
import { resolveProject, projectUrl } from "../../../lib/projects/service";
import { db } from "../../../lib/db";
import { github } from "../../../lib/github/client";
import { extractHtmlContent } from "../../../lib/seo-advisor/extract-target";
import {
  generateSuggestions,
  generateHeuristicSuggestions,
} from "../../../lib/seo-advisor/suggest";
import { operation } from "../../../lib/server/operation";
import { fail } from "../../../lib/server/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const GET = api(async (req, actor) => {
  const p = await resolveProject(actor, query(req, selector.strict()));
  const scans = await db.seoScan.findMany({
    where: { projectId: p.id },
    select: { id: true, pageUrl: true, status: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
  });
  return {
    scans,
    pageCounts: await db.seoScan.count({ where: { projectId: p.id } }),
  };
});
export const POST = api(
  async (req, actor) => {
    const body = await jsonBody(
      req,
      selector
        .extend({
          pageUrl: url.optional(),
          prNumber: z.number().int().positive().optional(),
          targetKeywords: z.array(text).min(1).max(10),
          mode: z.enum(["llm", "heuristic"]).default("llm"),
        })
        .strict()
        .refine((v) => !!v.pageUrl || !!v.prNumber),
    );
    const p = await resolveProject(actor, body);
    const key = z
      .string()
      .min(8)
      .max(100)
      .parse(req.headers.get("idempotency-key"));
    return operation(p.id, actor.id, "seo-scan", key, body, async () => {
      let baseSha = await github.head(p);
      let sourceRef = p.defaultBranch;
      const map = z.record(z.string()).parse(JSON.parse(p.sourceMap));
      let pageUrl = body.pageUrl ? projectUrl(p, body.pageUrl) : undefined;
      let sourcePath = pageUrl ? map[new URL(pageUrl).pathname] : undefined;
      if (body.prNumber) {
        const pr = z
          .object({
            state: z.literal("open"),
            head: z.object({
              ref: z.string().min(1).max(200),
              sha: z.string().regex(/^[a-f0-9]{40}$/),
              repo: z.object({ full_name: z.string() }),
            }),
            base: z.object({ ref: z.string() }),
          })
          .parse(await github.request(p, `/pulls/${body.prNumber}`));
        if (
          pr.head.repo.full_name.toLowerCase() !== p.repo ||
          pr.base.ref !== p.defaultBranch
        )
          fail(
            422,
            "UNSUPPORTED_PR",
            "Fork or non-default-branch PR scans need explicit repository authorization.",
          );
        baseSha = pr.head.sha;
        sourceRef = pr.head.ref;
        const files = z
          .array(z.object({ filename: z.string(), status: z.string() }))
          .max(100)
          .parse(
            await github.request(
              p,
              `/pulls/${body.prNumber}/files?per_page=100`,
            ),
          );
        if (files.length === 100)
          fail(422, "PR_FILE_LIMIT", "PR file list exceeds scan budget.");
        const candidates = Object.entries(map).filter(([, path]) =>
          files.some((f) => f.filename === path && f.status !== "removed"),
        );
        if (sourcePath && !files.some((f) => f.filename === sourcePath))
          fail(
            422,
            "SOURCE_NOT_IN_PR",
            "Requested page source was not changed in the PR.",
          );
        if (!sourcePath) {
          if (candidates.length !== 1)
            fail(
              422,
              "PAGE_SELECTION_REQUIRED",
              "Select a mapped page for the PR scan.",
            );
          sourcePath = candidates[0][1];
          pageUrl = projectUrl(p, candidates[0][0]);
        }
      }
      if (!sourcePath || !pageUrl || !/\.html?$/.test(sourcePath))
        fail(
          422,
          "SOURCE_MAPPING_REQUIRED",
          "Configure an HTML page-to-source mapping for verifiable SEO edits.",
        );
      const sourceContent = await github.file(p, sourcePath, baseSha);
      const content = extractHtmlContent(pageUrl, sourceContent);
      let suggestions;
      let llmProvenance: string | undefined;
      if (body.mode === "heuristic") {
        suggestions = generateHeuristicSuggestions({
          pageUrl,
          targetKeywords: body.targetKeywords,
          content,
        });
      } else {
        const llm = await generateSuggestions({
          pageUrl,
          targetKeywords: body.targetKeywords,
          content,
        });
        suggestions = llm.suggestions;
        llmProvenance = `openrouter:${llm.modelUsed}:seo-v2`;
      }
      const scan = await db.seoScan.create({
        data: {
          projectId: p.id,
          pageUrl,
          targetKeywords: JSON.stringify(body.targetKeywords),
          content: JSON.stringify(content),
          status: "COMPLETE",
          baseSha,
          sourceRef,
          sourcePrNumber: body.prNumber,
          sourcePath,
          sourceContent,
          provenance:
            body.mode === "heuristic"
              ? "heuristic-v2"
              : llmProvenance || "openrouter:free-chain:seo-v2",
          suggestions: { create: suggestions },
        },
      });
      return {
        scanId: scan.id,
        pageUrl,
        targetKeywords: body.targetKeywords,
        content,
        suggestions,
        provenance: scan.provenance,
      };
    });
  },
  { limit: 5 },
);
