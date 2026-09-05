import { z } from "zod";
import { api, readBody, rateLimit } from "../../../../lib/server/api";
import { verifyWebhook } from "../../../../lib/github/webhook-verify";
import { fail } from "../../../../lib/server/errors";
import { db } from "../../../../lib/db";
import { repo, sha, branch } from "../../../../lib/server/validation";
import { enqueueAnalysis } from "../../../../lib/jobs/queue";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const POST = api(
  async (req) => {
    const secret = process.env.GITHUB_APP_WEBHOOK_SECRET;
    if (!secret)
      fail(503, "WEBHOOK_CONFIGURATION_REQUIRED", "Webhook is unavailable.");
    const raw = await readBody(req, 1048576);
    if (!verifyWebhook(raw, req.headers.get("x-hub-signature-256"), secret))
      fail(401, "UNAUTHORIZED", "Webhook authentication failed.");
    const event = z
      .enum(["push", "ping", "installation", "installation_repositories"])
      .safeParse(req.headers.get("x-github-event"));
    const delivery = z
      .string()
      .uuid()
      .parse(req.headers.get("x-github-delivery"));
    await rateLimit("webhooks", 300);
    if (!event.success) return { accepted: true, ignored: "unsupported event" };
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      fail(400, "INVALID_JSON", "Invalid JSON body.");
    }
    if (event.data === "ping") return { accepted: true, ignored: "ping" };
    if (event.data !== "push") {
      const install = z
        .object({
          action: z.string().max(100),
          installation: z.object({ id: z.number().int().positive() }),
          repositories_removed: z
            .array(z.object({ full_name: repo }))
            .max(1000)
            .optional(),
        })
        .parse(body);
      if (["deleted", "suspend"].includes(install.action))
        await db.project.updateMany({
          where: { installId: String(install.installation.id) },
          data: { enabled: false },
        });
      if (install.repositories_removed?.length)
        await db.project.updateMany({
          where: {
            installId: String(install.installation.id),
            repo: { in: install.repositories_removed.map((r) => r.full_name) },
          },
          data: { enabled: false },
        });
      return {
        accepted: true,
        ignored: "installation grants updated; reconnect to enable",
      };
    }
    const push = z
      .object({
        ref: branch,
        before: sha,
        after: sha,
        deleted: z.boolean(),
        forced: z.boolean(),
        repository: z.object({ full_name: repo, default_branch: branch }),
        installation: z.object({ id: z.number().int().positive() }),
        sender: z.object({ login: z.string().min(1).max(100) }),
        head_commit: z.object({ message: z.string().max(100000) }).nullable(),
      })
      .parse(body);
    const project = await db.project.findUnique({
      where: { repo: push.repository.full_name },
    });
    if (!project || !project.enabled)
      return { accepted: true, ignored: "repository not enabled" };
    if (project.installId !== String(push.installation.id))
      fail(403, "FORBIDDEN", "Installation is not authorized.");
    if (push.deleted || /^0{40}$/.test(push.after))
      return { accepted: true, ignored: "deleted ref" };
    if (
      push.ref !== `refs/heads/${project.defaultBranch}` ||
      push.repository.default_branch !== project.defaultBranch
    )
      return { accepted: true, ignored: "untracked branch" };
    const job = await enqueueAnalysis(
      project.id,
      {
        sha: push.after,
        baseSha: /^0{40}$/.test(push.before) ? undefined : push.before,
        ref: push.ref,
        commitMsg: push.head_commit?.message.slice(0, 500) || "",
        author: push.sender.login,
        forced: push.forced,
      },
      { id: delivery, event: event.data, repo: project.repo },
    );
    return {
      accepted: true,
      jobId: job.id,
      deploymentId: job.deploymentId,
      status: job.status,
    };
  },
  { public: true, status: 202 },
);
