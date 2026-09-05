import { z } from "zod";
import { safeFetch, normalizeUrl, FetchResult } from "./safe-fetch";
import { parseHtml } from "../extract/html-parser";
import { parseLlmsTxt } from "../extract/llmstxt-parser";
import { parseSitemapXml } from "../extract/sitemap-parser";
import { ExtractedPageData } from "../extract/types";
import { routePath } from "../server/validation";
import { AppError, errorCode } from "../server/errors";
export type SiteFetcher = typeof safeFetch;
export async function crawlRoutes(
  routes: string[],
  baseUrl: string,
  sha: string,
  fetcher: SiteFetcher = safeFetch,
  signal?: AbortSignal,
) {
  const manifest = z.array(routePath).min(1).max(50).parse(routes);
  const origin = new URL(baseUrl).origin;
  const combined = AbortSignal.any([
    AbortSignal.timeout(120000),
    ...(signal ? [signal] : []),
  ]);
  const pages: ExtractedPageData[] = [];
  const errors: { url: string; code: string }[] = [];
  const urls = [
    ...new Set(manifest.map((r) => normalizeUrl(r, origin))),
  ].sort();
  // A push can precede deployment. Bounded readiness polling checks the same
  // owner-authorized target and cancellation budget used by the actual crawl.
  for (let attempt = 0; attempt < 3; attempt++) {
    const marker = await fetcher(urls[0], {
      origin,
      signal: combined,
      maxBytes: 1048576,
    }).catch(() => null);
    if (marker?.headers["x-searchops-sha"] === sha || combined.aborted) break;
    if (attempt < 2)
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 250 * 2 ** attempt);
        combined.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            resolve();
          },
          { once: true },
        );
      });
  }
  let revisionVerified = true;
  let sitemapUrls: string[] | undefined;
  let llmsTxtValid: boolean | undefined;
  async function fetchRequired(
    url: string,
    contentTypes: string[],
    maxBytes = 1048576,
  ): Promise<FetchResult> {
    return fetcher(url, { origin, signal: combined, contentTypes, maxBytes });
  }
  // Explicit manifests are owner-authorized diagnostic fetches, not autonomous web discovery.
  for (const url of urls) {
    try {
      const res = await fetchRequired(url, [
        "text/html",
        "application/xhtml+xml",
      ]);
      if (res.status !== 200)
        throw new AppError(422, "HTTP_STATUS", "Page did not return HTTP 200.");
      if (res.headers["x-searchops-sha"] !== sha) revisionVerified = false;
      const page = parseHtml(url, res.text, res.status);
      const robots = String(res.headers["x-robots-tag"] || "")
        .toLowerCase()
        .split(/[\s,]+/);
      page.robotsDirectives.noindex ||=
        robots.includes("noindex") || robots.includes("none");
      page.robotsDirectives.nofollow ||=
        robots.includes("nofollow") || robots.includes("none");
      pages.push(page);
    } catch (e) {
      errors.push({ url, code: errorCode(e) });
      revisionVerified = false;
    }
  }
  for (const path of ["/sitemap.xml", "/llms.txt"]) {
    try {
      const res = await fetchRequired(
        origin + path,
        path.endsWith("xml")
          ? ["application/xml", "text/xml"]
          : ["text/plain", "text/markdown"],
        path.endsWith("xml") ? 1048576 : 65536,
      );
      if (res.status !== 200 && res.status !== 404)
        throw new AppError(
          502,
          "AUXILIARY_FETCH_FAILED",
          "Site metadata fetch failed.",
          true,
        );
      if (path.endsWith("xml"))
        sitemapUrls =
          res.status === 404
            ? []
            : [
                ...new Set(
                  parseSitemapXml(res.text)
                    .map((e) => normalizeUrl(e.loc, origin))
                    .filter((u) => new URL(u).origin === origin),
                ),
              ].sort();
      else llmsTxtValid = res.status === 200 && parseLlmsTxt(res.text).isValid;
    } catch (e) {
      errors.push({ url: origin + path, code: errorCode(e) });
    }
  }
  return {
    pages,
    errors,
    revisionVerified,
    sitemapUrls,
    llmsTxtValid,
    complete: errors.length === 0 && pages.length === urls.length,
  };
}
