import * as cheerio from "cheerio";
import { ExtractedPageData } from "./types";

export function parseHtml(
  url: string,
  html: string,
  statusCode = 200,
): ExtractedPageData {
  const $ = cheerio.load(html);

  // 1. Meta tags
  const title = $("title").first().text().trim() || undefined;
  const metaDescription =
    $("meta[name='description']").attr("content")?.trim() || undefined;
  let canonicalUrl =
    $("link[rel='canonical']").attr("href")?.trim() || undefined;
  const canonicalErrors: string[] = [];
  if ($("link[rel='canonical']").length > 1)
    canonicalErrors.push("Multiple canonical declarations");
  if (canonicalUrl) {
    try {
      const u = new URL(canonicalUrl, url);
      if (!["http:", "https:"].includes(u.protocol)) throw new Error();
      canonicalUrl = u.href;
    } catch {
      canonicalErrors.push("Invalid canonical URL");
      canonicalUrl = undefined;
    }
  }

  // 2. Robots
  const robotsMeta = $("meta[name='robots'], meta[name='googlebot']")
    .map((_, el) => $(el).attr("content") || "")
    .get()
    .join(",")
    .toLowerCase();
  const tokens = robotsMeta.split(/[\s,]+/);
  const noindex = tokens.includes("noindex") || tokens.includes("none");
  const nofollow = tokens.includes("nofollow") || tokens.includes("none");

  // 3. Headings
  const h1: string[] = [];
  $("h1").each((_, el) => {
    const text = $(el).text().trim();
    if (text) h1.push(text);
  });

  const h2: string[] = [];
  $("h2").each((_, el) => {
    const text = $(el).text().trim();
    if (text) h2.push(text);
  });

  // 4. Links
  const internalLinks: string[] = [];
  const externalLinks: string[] = [];

  const parsedUrl = new URL(url, "https://example.com");
  const baseUrl = parsedUrl.origin;

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim();
    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("javascript:") ||
      href.startsWith("mailto:")
    ) {
      return;
    }

    try {
      if (internalLinks.length + externalLinks.length >= 1000) return;
      const resolved = new URL(
        href,
        new URL(
          $("base[href]").first().attr("href") || parsedUrl.href,
          parsedUrl,
        ).href,
      );
      if (!["http:", "https:"].includes(resolved.protocol)) return;
      if (resolved.origin === baseUrl) {
        internalLinks.push(resolved.href);
      } else {
        externalLinks.push(resolved.href);
      }
    } catch {
      // Relative or root-relative path
      if (href.startsWith("/")) {
        internalLinks.push(href);
      }
    }
  });

  // 5. JSON-LD Schemas
  const jsonLdSchemas: any[] = [];
  const schemaErrors: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const content = $(el).html()?.trim();
    if (content) {
      try {
        if (content.length > 65536) throw new Error("Schema exceeds budget");
        let depth = 0;
        JSON.parse(content, function (_key, value) {
          if (value && typeof value === "object" && ++depth > 1000)
            throw new Error("Schema exceeds budget");
          return value;
        });
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          jsonLdSchemas.push(...parsed.slice(0, 100));
        } else if (parsed && Array.isArray(parsed["@graph"])) {
          jsonLdSchemas.push(...parsed["@graph"].slice(0, 100));
        } else {
          jsonLdSchemas.push(parsed);
        }
      } catch {
        schemaErrors.push("Malformed or oversized JSON-LD");
      }
    }
  });

  // 6. Open Graph
  const openGraph = {
    title: $("meta[property='og:title']").attr("content") || undefined,
    description:
      $("meta[property='og:description']").attr("content") || undefined,
    image: $("meta[property='og:image']").attr("content") || undefined,
    type: $("meta[property='og:type']").attr("content") || undefined,
  };

  // 7. Visible text sample (for citation test)
  $("script, style, noscript, svg, nav, footer").remove();
  const textSample = $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3000);

  return {
    url,
    statusCode,
    title,
    metaDescription,
    canonicalUrl,
    robotsDirectives: {
      noindex,
      nofollow,
      raw: robotsMeta || undefined,
    },
    headings: { h1, h2 },
    internalLinks: Array.from(new Set(internalLinks)),
    externalLinks: Array.from(new Set(externalLinks)),
    jsonLdSchemas,
    openGraph,
    textSample,
    schemaErrors,
    canonicalErrors,
  };
}
