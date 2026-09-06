import * as cheerio from "cheerio";
import { z } from "zod";
import { parseHtml } from "../extract/html-parser";
import { safeFetch } from "../crawler/safe-fetch";
import { fail } from "../server/errors";
import { github } from "../github/client";
import { AdvisorPageContent } from "./types";

export interface ProjectPageSource {
  repo: string;
  installId: string | null;
  defaultBranch: string;
  sourceMap: string;
}

export async function extractAuthorizedPageContent(
  project: ProjectPageSource,
  pageUrl: string,
  baseSha?: string,
): Promise<AdvisorPageContent> {
  const map = z.record(z.string()).parse(JSON.parse(project.sourceMap));
  const sourcePath = map[new URL(pageUrl).pathname];
  if (!sourcePath || !/\.html?$/i.test(sourcePath))
    fail(
      422,
      "SOURCE_MAPPING_REQUIRED",
      "Configure an HTML page-to-source mapping for verifiable page content.",
    );
  if (!project.installId)
    fail(503, "INSTALLATION_REQUIRED", "Connect a GitHub App installation.");
  const context = {
    repo: project.repo,
    installId: project.installId,
    defaultBranch: project.defaultBranch,
  };
  const sha = baseSha || (await github.head(context));
  const sourceContent = await github.file(context, sourcePath, sha);
  return extractHtmlContent(pageUrl, sourceContent);
}
export function extractHtmlContent(
  pageUrl: string,
  html: string,
): AdvisorPageContent {
  const $ = cheerio.load(html);
  $("script,style,noscript").remove();
  return {
    ...parseHtml(pageUrl, html),
    paragraphs: $("p")
      .map((_, el) => $(el).text().replace(/\s+/g, " ").trim().slice(0, 1000))
      .get()
      .filter(Boolean)
      .slice(0, 30),
  };
}
export async function extractTargetContent(
  pageUrl: string,
): Promise<AdvisorPageContent> {
  const res = await safeFetch(pageUrl, {
    contentTypes: ["text/html", "application/xhtml+xml"],
  });
  if (res.status !== 200)
    fail(422, "TARGET_HTTP_ERROR", "Page did not return HTTP 200.");
  return extractHtmlContent(pageUrl, res.text);
}
