import { AppError } from "../server/errors";
import { FindingData } from "../detect/types";
import { GitHubClient, RepoContext } from "../github/client";

const INITIAL_FIX_TYPES = new Set<FindingData["type"]>([
  "LLMSTXT_INVALID",
  "SITEMAP_INCONSISTENCY",
]);

export function allowsInitialFix(
  findingType: FindingData["type"],
  hasPriorDeployment: boolean,
): boolean {
  return INITIAL_FIX_TYPES.has(findingType) && !hasPriorDeployment;
}

export function resolveRemediationPath(
  finding: FindingData,
  sourceMap: Record<string, string>,
  siteUrl: string,
): string | undefined {
  if (finding.rootCause?.file) return finding.rootCause.file;
  const sample = finding.evidence.sampleUrls[0];
  if (!sample) return undefined;
  const pathname = sample.startsWith("http")
    ? new URL(sample).pathname
    : sample.startsWith("/")
      ? sample
      : `/${sample}`;
  if (finding.type === "LLMSTXT_INVALID") {
    return sourceMap["/llms.txt"] || "public/llms.txt";
  }
  if (finding.type === "SITEMAP_INCONSISTENCY") {
    return sourceMap["/sitemap.xml"] || "public/sitemap.xml";
  }
  if (sourceMap[pathname]) return sourceMap[pathname];
  return sourceMap[new URL(pathname, siteUrl).pathname];
}

export async function readRepoSource(
  gh: GitHubClient,
  context: RepoContext,
  path: string,
  ref: string,
  optional = false,
): Promise<string> {
  try {
    return await gh.file(context, path, ref);
  } catch (error) {
    if (
      optional &&
      error instanceof AppError &&
      error.code === "GITHUB_404"
    ) {
      return "";
    }
    throw error;
  }
}
