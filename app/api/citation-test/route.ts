import { z } from "zod";
import { api, jsonBody } from "../../../lib/server/api";
import { selector, url, text } from "../../../lib/server/validation";
import { resolveProject, projectUrl } from "../../../lib/projects/service";
import { extractTargetContent } from "../../../lib/seo-advisor/extract-target";
import { runCitationProbabilityTest } from "../../../lib/geo/citation-test";
import { db } from "../../../lib/db";
import { operation } from "../../../lib/server/operation";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const POST = api(
  async (req, actor) => {
    const body = await jsonBody(
      req,
      selector
        .extend({
          url,
          query: text,
          expectedFacts: z
            .array(z.string().trim().min(3).max(300))
            .min(1)
            .max(20)
            .optional(),
        })
        .strict(),
    );
    const p = await resolveProject(actor, body);
    const target = projectUrl(p, body.url);
    const key = z
      .string()
      .min(8)
      .max(100)
      .parse(req.headers.get("idempotency-key"));
    return operation(p.id, actor.id, "citation", key, body, async () => {
      const content = await extractTargetContent(target);
      const result = await runCitationProbabilityTest({
        url: target,
        pageText: content.textSample,
        query: body.query,
        expectedFacts: body.expectedFacts,
      });
      await db.citationTest.create({
        data: {
          projectId: p.id,
          url: target,
          query: result.query,
          modelAnswer: result.modelAnswer,
          modelUsed: result.modelUsed,
          groundedFacts: JSON.stringify(result.groundedFacts),
          score: result.score,
          totalFacts: result.totalFacts,
          version: "citation-v2",
        },
      });
      return result;
    });
  },
  { limit: 5 },
);
