import { parseSitemapXml } from "../extract/sitemap-parser";

export function buildSitemapXml(urls: string[]): string {
  const unique = [...new Set(urls.map((u) => u.trim()).filter(Boolean))].slice(
    0,
    1000,
  );
  if (!unique.length) throw new Error("Sitemap requires at least one URL.");
  const entries = unique
    .map(
      (loc) => `  <url>
    <loc>${escapeXml(loc)}</loc>
  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function mergeSitemapContent(current: string, urls: string[]): string {
  const existing = current.trim()
    ? parseSitemapXml(current).map((e) => e.loc)
    : [];
  return buildSitemapXml([...existing, ...urls]);
}

export function sitemapIncludesUrls(content: string, urls: string[]): boolean {
  if (!content.trim()) return false;
  const locs = new Set(parseSitemapXml(content).map((e) => e.loc));
  return urls.every((u) => locs.has(u));
}
