import { createHash } from "node:crypto";

export function configurationKey(project: {
  siteUrl: string;
  routeManifest: string;
  sourceMap: string;
  defaultBranch: string;
}) {
  const routes: string[] = JSON.parse(project.routeManifest);
  const mapping: Record<string, string> = JSON.parse(project.sourceMap);
  return createHash("sha256")
    .update(
      JSON.stringify({
        siteUrl: project.siteUrl,
        routes: [...new Set(routes)].sort(),
        mapping: Object.entries(mapping).sort(([a], [b]) => a.localeCompare(b)),
        branch: project.defaultBranch,
      }),
    )
    .digest("hex");
}
