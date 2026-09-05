import { api, jsonBody } from "../../../lib/server/api";
import { selector, id } from "../../../lib/server/validation";
import { resolveProject } from "../../../lib/projects/service";
import { fail } from "../../../lib/server/errors";
import { db } from "../../../lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = api(
  async (req, actor, requestId) => {
    if (!actor.admin) fail(403, "FORBIDDEN", "Operator approval required.");
    const body = await jsonBody(
      req,
      selector.extend({ findingId: id }).strict(),
    );
    const p = await resolveProject(actor, body);
    const f = await db.finding.findFirst({
      where: {
        id: body.findingId,
        deployment: { projectId: p.id },
        status: "OPEN",
      },
      include: { deployment: true },
    });
    if (!f) fail(404, "NOT_FOUND", "Finding not found.");
    const approval = await db.$transaction(async (tx) => {
      await tx.auditEvent.create({
        data: {
          actor: actor.id,
          projectId: p.id,
          action: "APPROVE_REMEDIATION",
          subjectId: f.id,
          requestId,
        },
      });
      return tx.remediation.upsert({
        where: { id: `approval_${f.id}` },
        update: {
          approvedAt: new Date(),
          approvalActor: actor.id,
          baseSha: f.deployment.sha,
        },
        create: {
          id: `approval_${f.id}`,
          findingId: f.id,
          tier: "TIER_C",
          action: "Operator approval",
          patchDiff: "",
          validationResult: "{}",
          status: "APPROVED",
          approvedAt: new Date(),
          approvalActor: actor.id,
          baseSha: f.deployment.sha,
        },
      });
    });
    return { approvalId: approval.id };
  },
  { limit: 5 },
);
