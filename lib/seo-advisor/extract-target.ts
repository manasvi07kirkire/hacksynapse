import * as cheerio from "cheerio";
import { parseHtml } from "../extract/html-parser";
import { safeFetch } from "../crawler/safe-fetch";
import { fail } from "../server/errors";
import { AdvisorPageContent } from "./types";
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
