import { XMLParser, XMLValidator } from "fast-xml-parser";

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}

export function parseSitemapXml(xmlContent: string): SitemapEntry[] {
  if (!xmlContent || !xmlContent.trim()) return [];
  if (
    xmlContent.length > 1048576 ||
    /<!DOCTYPE|<!ENTITY/i.test(xmlContent) ||
    XMLValidator.validate(xmlContent) !== true
  )
    throw new Error("Invalid sitemap XML");

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    processEntities: false,
    parseTagValue: false,
  });

  try {
    const parsed = parser.parse(xmlContent);
    const urlset = parsed.urlset;

    if (!urlset) throw new Error("Unsupported sitemap document");
    if (!urlset.url) {
      return [];
    }

    const urls = Array.isArray(urlset.url) ? urlset.url : [urlset.url];
    if (urls.length > 10000) throw new Error("Sitemap exceeds budget");
    return urls
      .filter(
        (u: { loc?: unknown }) =>
          typeof u.loc === "string" && u.loc.length <= 2048,
      )
      .map((u: any) => ({
        loc: u.loc,
        lastmod: u.lastmod,
        changefreq: u.changefreq,
        priority: u.priority ? parseFloat(u.priority) : undefined,
      }));
  } catch {
    throw new Error("Invalid or unsupported sitemap XML");
  }
}
