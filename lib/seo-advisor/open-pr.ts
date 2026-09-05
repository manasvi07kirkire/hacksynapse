import { Suggestion } from "./types";
import { RepoContext, GitHubClient } from "../github/client";
import { createBranchCommitAndPullRequest } from "../github/branch-commit";
export interface OpenedPr {
  prUrl: string;
  prNumber: number;
  body: string;
}
export function buildPrBody(pageUrl: string, approved: Suggestion[]) {
  return `SEO Advisor changes for ${pageUrl}.\n\n${approved.map((s) => `- ${s.type}: ${s.location}`).join("\n")}\n\nExact source and on-page static checks passed. Build not required for static HTML. Human review required; never auto-merged.`;
}
export async function openPullRequest(
  pageUrl: string,
  approved: Suggestion[],
  input?: {
    project: RepoContext;
    key: string;
    baseSha: string;
    baseBranch?: string;
    path: string;
    content: string;
  },
  gh?: GitHubClient,
): Promise<OpenedPr> {
  if (!input) throw new Error("Authorized source and repository are required");
  const body = buildPrBody(pageUrl, approved);
  const pr = await createBranchCommitAndPullRequest(
    input.project,
    {
      key: input.key,
      baseSha: input.baseSha,
      baseBranch: input.baseBranch,
      files: [{ path: input.path, content: input.content }],
      title: "SEO Advisor: approved on-page suggestions",
      body,
      draft: true,
    },
    gh,
  );
  return { ...pr, body };
}
