import { z } from "zod";
import { GitHubClient, RepoContext, github } from "./client";
import { sha, branch as branchSchema } from "../server/validation";
import { assertSafePath, validateSource } from "../remediate/validate-patch";
import { AppError, fail } from "../server/errors";
const prSchema = z.object({
  number: z.number().int().positive(),
  html_url: z.string().url(),
  state: z.string(),
  head: z.object({ ref: z.string(), sha }),
  base: z.object({ ref: z.string() }),
});
export async function createBranchCommitAndPullRequest(
  context: RepoContext,
  input: {
    key: string;
    baseSha: string;
    baseBranch?: string;
    files: { path: string; content: string }[];
    title: string;
    body: string;
    draft: boolean;
  },
  gh: GitHubClient = github,
) {
  const branch = `searchops/${input.key.slice(0, 40)}`;
  const targetBranch = branchSchema.parse(
    input.baseBranch || context.defaultBranch,
  );
  if (
    !/^[a-f0-9]{64}$/.test(input.key) ||
    !input.files.length ||
    input.files.length > 10
  )
    fail(422, "INVALID_OPERATION", "Invalid repository operation.");
  for (const f of input.files) {
    assertSafePath(f.path);
    validateSource(f.path, f.content);
  }
  const owner = context.repo.split("/")[0];
  const existing = z
    .array(prSchema)
    .max(100)
    .parse(
      await gh.request(
        context,
        `/pulls?state=all&head=${encodeURIComponent(`${owner}:${branch}`)}&base=${encodeURIComponent(targetBranch)}&per_page=100`,
      ),
    );
  if (existing.length) {
    const pr = existing[0];
    if (pr.head.ref !== branch || pr.base.ref !== targetBranch)
      fail(409, "PR_IDENTITY_CONFLICT", "PR identity mismatch.");
    const commit = z
      .object({ message: z.string(), parents: z.array(z.object({ sha })) })
      .parse(await gh.request(context, `/git/commits/${pr.head.sha}`));
    if (
      commit.message !== `SearchOps operation ${input.key}` ||
      commit.parents.length !== 1 ||
      commit.parents[0].sha !== input.baseSha
    )
      fail(
        409,
        "PR_CONTENT_CHANGED",
        "Existing PR no longer matches this operation.",
      );
    return { prUrl: pr.html_url, prNumber: pr.number, branch, reused: true };
  }
  if ((await gh.head(context, targetBranch)) !== input.baseSha)
    fail(409, "STALE_BASE", "Repository head changed; analyze or scan again.");
  const base = z
    .object({ tree: z.object({ sha }) })
    .parse(await gh.request(context, `/git/commits/${input.baseSha}`));
  // Read each exact tree entry; reject symlinks/submodules and preserve executable mode.
  const entries: {
    path: string;
    mode: string;
    type: "blob";
    content: string;
  }[] = [];
  for (const file of input.files) {
    const parts = file.path.split("/");
    let treeSha = base.tree.sha;
    let mode = "100644";
    let exists = true;
    for (let i = 0; i < parts.length; i++) {
      const tree = z
        .object({
          truncated: z.literal(false),
          tree: z.array(
            z.object({
              path: z.string(),
              mode: z.string(),
              type: z.string(),
              sha,
            }),
          ),
        })
        .parse(await gh.request(context, `/git/trees/${treeSha}`));
      const entry = tree.tree.find((e) => e.path === parts[i]);
      if (!entry) {
        if (i < parts.length - 1)
          fail(
            422,
            "SOURCE_MISSING",
            "Parent directory missing for new file.",
          );
        exists = false;
        break;
      }
      if (i < parts.length - 1) {
        if (entry.type !== "tree" || entry.mode !== "040000")
          fail(422, "UNSAFE_PATH", "Source directory is not a regular tree.");
        treeSha = entry.sha;
      } else {
        if (entry.type !== "blob" || !["100644", "100755"].includes(entry.mode))
          fail(
            422,
            "UNSAFE_FILE_MODE",
            "Symlinks and submodules cannot be edited.",
          );
        mode = entry.mode;
      }
    }
    if (!exists) {
      entries.push({
        path: file.path,
        mode: "100644",
        type: "blob",
        content: file.content,
      });
      continue;
    }
    entries.push({
      path: file.path,
      mode,
      type: "blob",
      content: file.content,
    });
  }
  const tree = z.object({ sha }).parse(
    await gh.request(context, "/git/trees", "POST", {
      base_tree: base.tree.sha,
      tree: entries,
    }),
  );
  const commitMessage = `SearchOps operation ${input.key}`;
  let branchSha: string | undefined;
  try {
    branchSha = z
      .object({ object: z.object({ sha }) })
      .parse(
        await gh.request(
          context,
          `/git/ref/heads/${encodeURIComponent(branch)}`,
        ),
      ).object.sha;
  } catch (e) {
    if (!(e instanceof AppError) || e.code !== "GITHUB_404") throw e;
  }
  if (branchSha) {
    const commit = z
      .object({
        message: z.string(),
        tree: z.object({ sha }),
        parents: z.array(z.object({ sha })),
      })
      .parse(await gh.request(context, `/git/commits/${branchSha}`));
    if (
      commit.message !== commitMessage ||
      commit.tree.sha !== tree.sha ||
      commit.parents.length !== 1 ||
      commit.parents[0].sha !== input.baseSha
    )
      fail(
        409,
        "BRANCH_CONFLICT",
        "Existing operation branch differs from the intended patch.",
      );
  } else {
    const commit = z.object({ sha }).parse(
      await gh.request(context, "/git/commits", "POST", {
        message: commitMessage,
        tree: tree.sha,
        parents: [input.baseSha],
      }),
    );
    if ((await gh.head(context, targetBranch)) !== input.baseSha)
      fail(409, "STALE_BASE", "Repository head changed.");
    await gh.request(context, "/git/refs", "POST", {
      ref: `refs/heads/${branch}`,
      sha: commit.sha,
    });
  }
  const pr = prSchema.parse(
    await gh.request(context, "/pulls", "POST", {
      title: input.title.replace(/[\x00-\x1f]/g, " ").slice(0, 200),
      body: input.body.slice(0, 20000),
      head: branch,
      base: targetBranch,
      draft: input.draft,
    }),
  );
  if (pr.head.ref !== branch)
    fail(
      502,
      "PR_IDENTITY_CONFLICT",
      "GitHub returned an unexpected pull request.",
    );
  return { prUrl: pr.html_url, prNumber: pr.number, branch, reused: false };
}
