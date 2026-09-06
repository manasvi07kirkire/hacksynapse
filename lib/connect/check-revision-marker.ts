import { safeFetch, normalizeUrl } from "../crawler/safe-fetch";
import { github } from "../github/client";

export interface RevisionMarkerResult {
  siteUrl: string;
  httpStatus: number;
  headerPresent: boolean;
  headerValue: string | null;
  repoHeadSha: string | null;
  matchesRepoHead: boolean | null;
  verified: boolean;
  message: string;
}

export async function checkRevisionMarker(input: {
  siteUrl: string;
  repo?: string;
  defaultBranch?: string;
  installId?: string | null;
}): Promise<RevisionMarkerResult> {
  const siteUrl = normalizeUrl(input.siteUrl);
  const origin = new URL(siteUrl).origin;

  let repoHeadSha: string | null = null;
  if (input.repo && input.defaultBranch) {
    try {
      repoHeadSha = await github.head({
        repo: input.repo,
        defaultBranch: input.defaultBranch,
        installId: input.installId ?? null,
      });
    } catch {
      repoHeadSha = null;
    }
  }

  const response = await safeFetch(origin + "/", { origin });
  const raw = response.headers["x-searchops-sha"];
  const headerValue =
    typeof raw === "string"
      ? raw.trim()
      : Array.isArray(raw)
        ? raw[0]?.trim() || null
        : null;
  const headerPresent = Boolean(headerValue);

  let matchesRepoHead: boolean | null = null;
  if (headerPresent && repoHeadSha) {
    matchesRepoHead = headerValue!.toLowerCase() === repoHeadSha.toLowerCase();
  }

  const verified = headerPresent && (matchesRepoHead ?? true);

  let message: string;
  if (!headerPresent) {
    message =
      "X-SearchOps-Sha header is missing. Add a revision marker snippet to your deployed site, redeploy, then verify again.";
  } else if (matchesRepoHead === false) {
    message =
      "Header is present but does not match the repository HEAD. Wait for deploy to finish or confirm the marker uses the live commit SHA.";
  } else if (matchesRepoHead === true) {
    message = "Revision marker verified — header matches repository HEAD.";
  } else {
    message = "Revision marker header is present. Connect the repository to compare against Git HEAD.";
  }

  return {
    siteUrl: origin,
    httpStatus: response.status,
    headerPresent,
    headerValue,
    repoHeadSha,
    matchesRepoHead,
    verified,
    message,
  };
}
