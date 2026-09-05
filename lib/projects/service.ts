import { db } from "../db";
import { Actor } from "../auth/api-key";
import { fail } from "../server/errors";
import { getConfig } from "../server/config";
import { normalizeUrl } from "../crawler/safe-fetch";
export async function resolveProject(
  actor: Actor,
  input: { projectId?: string; repo?: string },
) {
  if (actor.projectId && input.projectId && actor.projectId !== input.projectId)
    fail(404, "NOT_FOUND", "Project not found.");
  if (!input.projectId && !input.repo) {
    const c = getConfig();
    if (actor.projectId) input = { projectId: actor.projectId };
    else if (c.SEARCHOPS_LOCAL_DEMO === "true" && c.NODE_ENV !== "production") {
      const eligible = await db.project.findMany({
        where: { enabled: true },
        take: 2,
      });
      if (eligible.length !== 1)
        fail(400, "PROJECT_REQUIRED", "Select a project.");
      input = { projectId: eligible[0].id };
    } else fail(400, "PROJECT_REQUIRED", "Select a project.");
  }
  const project = await db.project.findFirst({
    where: {
      ...(input.projectId ? { id: input.projectId } : {}),
      ...(input.repo ? { repo: input.repo.toLowerCase() } : {}),
      ...(actor.projectId ? { id: actor.projectId } : {}),
      enabled: true,
    },
  });
  if (!project) fail(404, "NOT_FOUND", "Project not found.");
  return project;
}
export function projectUrl(project: { siteUrl: string }, value: string) {
  const normalized = normalizeUrl(value, project.siteUrl);
  if (new URL(normalized).origin !== new URL(project.siteUrl).origin)
    fail(403, "TARGET_NOT_AUTHORIZED", "URL does not belong to the project.");
  return normalized;
}
