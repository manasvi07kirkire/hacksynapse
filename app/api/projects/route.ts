import { z } from "zod";
import { api, jsonBody, query } from "../../../lib/server/api";
import { db } from "../../../lib/db";
import { repo, url, routePath, branch } from "../../../lib/server/validation";
import { normalizeUrl, safeFetch } from "../../../lib/crawler/safe-fetch";
import { github } from "../../../lib/github/client";
import { fail } from "../../../lib/server/errors";
import { assertSafePath } from "../../../lib/remediate/validate-patch";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = api(async (req, actor) => {
  const q = query(
    req,
    z
      .object({
        limit: z.coerce.number().int().min(1).max(100).default(25),
        cursor: z.string().max(100).optional(),
      })
      .strict(),
  );
  const projects = await db.project.findMany({
    where: {
      enabled: true,
      ...(actor.projectId ? { id: actor.projectId } : {}),
    },
    select: {
      id: true,
      repo: true,
      siteUrl: true,
      defaultBranch: true,
      enabled: true,
    },
    orderBy: { id: "asc" },
    take: q.limit,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
  });
  return {
    projects,
    nextCursor: projects.length === q.limit ? projects.at(-1)?.id : null,
  };
});
export const POST = api(
  async (req, actor) => {
    if (!actor.admin) fail(403, "FORBIDDEN", "Operator permission required.");
    const body = await jsonBody(
      req,
      z
        .object({
          repo,
          siteUrl: url,
          routeManifest: z.array(routePath).min(1).max(50),
          installId: z.string().regex(/^\d+$/).optional(),
          defaultBranch: branch.default("main"),
          sourceMap: z.record(routePath, z.string().max(300)).default({}),
        })
        .strict(),
    );
    Object.values(body.sourceMap).forEach(assertSafePath);
    const context = {
      repo: body.repo,
      installId: body.installId || null,
      defaultBranch: body.defaultBranch,
    };
    await github.head(context);
    const siteUrl = normalizeUrl(body.siteUrl);
    await safeFetch(siteUrl, {
      maxBytes: 1048576,
      contentTypes: ["text/html", "application/xhtml+xml"],
    });
    const existing = await db.project.findUnique({ where: { repo: body.repo } });
    if (
      existing &&
      (await db.analysisJob.count({
        where: {
          projectId: existing.id,
          status: { in: ["QUEUED", "RUNNING"] },
        },
      }))
    )
      fail(
        409,
        "PROJECT_BUSY",
        "Finish or cancel pending analyses before changing project configuration.",
      );
    const project = await db.project.upsert({
      where: { repo: body.repo },
      update: {
        enabled: true,
        siteUrl,
        routeManifest: JSON.stringify([...new Set(body.routeManifest)]),
        sourceMap: JSON.stringify(body.sourceMap),
        installId: context.installId,
        defaultBranch: body.defaultBranch,
      },
      create: {
        ...context,
        siteUrl,
        routeManifest: JSON.stringify([...new Set(body.routeManifest)]),
        sourceMap: JSON.stringify(body.sourceMap),
      },
    });
    return {
      project: {
        id: project.id,
        repo: project.repo,
        siteUrl: project.siteUrl,
        defaultBranch: project.defaultBranch,
      },
    };
  },
  { limit: 10 },
);
