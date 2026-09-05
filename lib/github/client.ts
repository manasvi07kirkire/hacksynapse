import { createSign } from "node:crypto";
import { z } from "zod";
import { AppError, fail } from "../server/errors";
import {
  repo as repoSchema,
  sha as shaSchema,
  branch as branchSchema,
} from "../server/validation";
import { GitDiffFile } from "../diagnose/signature-matcher";
export interface RepoContext {
  repo: string;
  installId: string | null;
  defaultBranch: string;
}
export type JsonTransport = (
  path: string,
  token: string,
  method?: string,
  body?: unknown,
) => Promise<unknown>;
export const githubTransport: JsonTransport = async (
  path,
  token,
  method = "GET",
  body,
) => {
  if (!path.startsWith("/") || path.startsWith("//"))
    fail(400, "INVALID_GITHUB_PATH", "Invalid GitHub request.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`https://api.github.com${path}`, {
      method,
      redirect: "error",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok)
      throw new AppError(
        res.status === 404
          ? 404
          : res.status === 409 || res.status === 422
            ? 409
            : 502,
        `GITHUB_${res.status}`,
        "GitHub operation failed.",
        res.status === 429 || res.status >= 500 || res.status === 403,
      );
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    if (reader)
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.length;
        if (bytes > 4 * 1024 * 1024) {
          await reader.cancel();
          fail(422, "GITHUB_RESPONSE_LIMIT", "GitHub response exceeds budget.");
        }
        chunks.push(value);
      }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(
      502,
      "GITHUB_UNAVAILABLE",
      "GitHub is unavailable.",
      true,
    );
  } finally {
    clearTimeout(timeout);
  }
};
export function appJwt(now = Date.now()) {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!appId || !/^\d+$/.test(appId) || !privateKey)
    fail(
      503,
      "GITHUB_CONFIGURATION_REQUIRED",
      "Configure GitHub App credentials.",
    );
  const encoded = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const payload = `${encoded({ alg: "RS256", typ: "JWT" })}.${encoded({ iat: Math.floor(now / 1000) - 60, exp: Math.floor(now / 1000) + 480, iss: appId })}`;
  try {
    const sign = createSign("RSA-SHA256");
    sign.update(payload);
    return `${payload}.${sign.sign(privateKey, "base64url")}`;
  } catch {
    fail(503, "GITHUB_CONFIGURATION_REQUIRED", "GitHub App key is invalid.");
  }
}
const tokens = new Map<string, { token: string; expires: number }>();
export class GitHubClient {
  constructor(private transport: JsonTransport = githubTransport) {}
  async token(context: RepoContext) {
    repoSchema.parse(context.repo);
    if (context.installId) {
      if (!/^\d+$/.test(context.installId))
        fail(400, "INVALID_INSTALLATION", "Invalid installation.");
      const cached = tokens.get(context.installId);
      if (
        cached &&
        cached.expires > Date.now() + 60000 &&
        this.transport === githubTransport
      )
        return cached.token;
      const response = z
        .object({ token: z.string().min(1), expires_at: z.string().datetime() })
        .parse(
          await this.transport(
            `/app/installations/${context.installId}/access_tokens`,
            appJwt(),
            "POST",
            {},
          ),
        );
      if (Date.parse(response.expires_at) <= Date.now() + 60000)
        fail(502, "GITHUB_TOKEN_EXPIRED", "GitHub token expired.");
      if (this.transport === githubTransport)
        tokens.set(context.installId, {
          token: response.token,
          expires: Date.parse(response.expires_at),
        });
      return response.token;
    }
    if (
      process.env.NODE_ENV !== "production" &&
      process.env.SEARCHOPS_ALLOW_PAT === "true" &&
      process.env.GITHUB_TOKEN
    )
      return process.env.GITHUB_TOKEN;
    fail(503, "INSTALLATION_REQUIRED", "Connect a GitHub App installation.");
  }
  async request(
    context: RepoContext,
    suffix: string,
    method = "GET",
    body?: unknown,
  ) {
    const token = await this.token(context);
    // GitHub enforces repository grants for this installation token on every request.
    const metadata = z
      .object({ full_name: z.string(), default_branch: z.string() })
      .parse(await this.transport(`/repos/${context.repo}`, token));
    if (
      metadata.full_name.toLowerCase() !== context.repo.toLowerCase() ||
      metadata.default_branch !== context.defaultBranch
    )
      fail(
        409,
        "REPOSITORY_CHANGED",
        "Reconnect the repository after its default branch or identity changes.",
      );
    return this.transport(
      `/repos/${context.repo}${suffix}`,
      token,
      method,
      body,
    );
  }
  async head(context: RepoContext, ref = context.defaultBranch) {
    branchSchema.parse(ref);
    const data = z
      .object({ object: z.object({ sha: shaSchema }) })
      .parse(
        await this.request(
          context,
          `/git/ref/heads/${encodeURIComponent(ref)}`,
        ),
      );
    return data.object.sha;
  }
  async compare(
    context: RepoContext,
    base: string,
    head: string,
  ): Promise<GitDiffFile[]> {
    shaSchema.parse(base);
    shaSchema.parse(head);
    const data = z
      .object({
        status: z.enum(["ahead", "identical", "behind", "diverged"]),
        files: z
          .array(
            z.object({
              filename: z.string().max(500),
              patch: z.string().max(200000).optional(),
              additions: z.number().int(),
              deletions: z.number().int(),
              status: z.string(),
            }),
          )
          .max(300),
      })
      .parse(await this.request(context, `/compare/${base}...${head}`));
    if (!["ahead", "identical"].includes(data.status))
      fail(409, "NON_LINEAR_HISTORY", "Commit ancestry is not comparable.");
    if (
      data.files.length >= 300 ||
      data.files.some((f) => !f.patch && (f.additions || f.deletions))
    )
      fail(422, "TRUNCATED_DIFF", "GitHub diff is incomplete.");
    return data.files.map((f) => ({ ...f, patch: f.patch || "" }));
  }
  async file(context: RepoContext, path: string, ref: string): Promise<string> {
    const { assertSafePath } = await import("../remediate/validate-patch");
    assertSafePath(path);
    shaSchema.parse(ref);
    const data = z
      .object({
        type: z.literal("file"),
        encoding: z.literal("base64"),
        size: z.number().int().max(262144),
        content: z.string().max(400000),
      })
      .parse(
        await this.request(
          context,
          `/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${ref}`,
        ),
      );
    const buffer = Buffer.from(data.content, "base64");
    if (buffer.length > 262144 || buffer.includes(0))
      fail(422, "UNSUPPORTED_FILE", "Unsupported repository file.");
    return buffer.toString("utf8");
  }
  async status(
    context: RepoContext,
    sha: string,
    state: "pending" | "success" | "failure" | "error",
    description: string,
  ) {
    shaSchema.parse(sha);
    await this.request(context, `/statuses/${sha}`, "POST", {
      state,
      description: description.slice(0, 140),
      context: "SearchOps/discoverability",
    });
  }
}
export const github = new GitHubClient();
