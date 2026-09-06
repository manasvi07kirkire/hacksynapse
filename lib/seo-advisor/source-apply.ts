import { fail } from "../server/errors";
import { locationValue } from "./suggest";
import { AdvisorPageContent, Suggestion } from "./types";
import { extractHtmlContent } from "./extract-target";
import { runOnPageValidation } from "./validate";
import { sourceDiff, strictApply } from "../remediate/validate-patch";
export function validateSelection(
  all: string[],
  approved: string[],
  rejected: string[],
  edited: string[] = [],
) {
  if (
    new Set(approved).size !== approved.length ||
    new Set(rejected).size !== rejected.length ||
    approved.some((id) => rejected.includes(id)) ||
    [...approved, ...rejected].some((id) => !all.includes(id)) ||
    edited.some((id) => !approved.includes(id))
  )
    fail(
      400,
      "INVALID_SELECTION",
      "Suggestions must be unique, disjoint and belong to this scan.",
    );
}
const escapeText = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
export function applySourceSuggestions(
  path: string,
  pageUrl: string,
  source: string,
  content: AdvisorPageContent,
  keywords: string[],
  approved: Suggestion[],
) {
  if (!/\.html?$/.test(path))
    fail(
      422,
      "UNSUPPORTED_SOURCE",
      "SEO source editing requires mapped static HTML.",
    );
  const extracted = extractHtmlContent(pageUrl, source);
  let after = source;
  const locations = new Set<string>();
  for (const suggestion of approved) {
    const { location, before } = suggestion;
    if (
      locations.has(location) ||
      locationValue(content, location) !== before ||
      locationValue(extracted, location) !== before
    )
      fail(
        409,
        "SUGGESTION_CONTEXT_MISMATCH",
        "Suggestion differs from exact source content.",
      );
    locations.add(location);
    const value = escapeText(suggestion.after);
    if (location === "title") {
      if (!/<title\b[^>]*>[\s\S]*?<\/title>/i.test(after))
        fail(422, "UNSUPPORTED_SOURCE", "Source has no unique title element.");
      after = after.replace(
        /(<title\b[^>]*>)[\s\S]*?(<\/title>)/i,
        (_m, a: string, b: string) => a + value + b,
      );
    } else if (location === "meta description") {
      const tags =
        after.match(/<meta\b[^>]*name=["']description["'][^>]*>/gi) || [];
      if (tags.length > 1)
        fail(422, "UNSUPPORTED_SOURCE", "Description source is ambiguous.");
      if (tags[0])
        after = after.replace(
          tags[0],
          () => `<meta name="description" content="${value}">`,
        );
      else if (/<\/head>/i.test(after))
        after = after.replace(
          /<\/head>/i,
          () => `<meta name="description" content="${value}">\n</head>`,
        );
      else fail(422, "UNSUPPORTED_SOURCE", "Source has no head element.");
    } else if (location === "H1" && !before.trim()) {
      if (extracted.headings.h1.length > 0)
        fail(
          409,
          "SUGGESTION_CONTEXT_MISMATCH",
          "Suggestion differs from exact source content.",
        );
      if (!/<body\b/i.test(after))
        fail(422, "UNSUPPORTED_SOURCE", "Source has no body element.");
      after = after.replace(
        /(<body\b[^>]*>)/i,
        (_match, open: string) => `${open}\n    <h1>${value}</h1>`,
      );
    } else if (location === "H1") {
      const tags = after.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) || [];
      if (tags.length !== 1)
        fail(422, "UNSUPPORTED_SOURCE", "Source H1 is ambiguous.");
      after = after.replace(
        tags[0],
        () => `<h1>${value}</h1>`,
      );
    } else {
      const old = escapeText(before);
      if (!old || after.split(old).length !== 2)
        fail(
          422,
          "AMBIGUOUS_SOURCE",
          "Text location cannot be edited unambiguously.",
        );
      if (suggestion.type === "internal-link")
        fail(
          422,
          "LINK_TARGET_REQUIRED",
          "Internal-link edits require a reviewed link target and source mapping.",
        );
      after = after.replace(old, () => value);
    }
  }
  const diff = sourceDiff(path, source, after);
  strictApply(path, source, diff);
  const parsed = extractHtmlContent(pageUrl, after);
  return {
    source: after,
    diff,
    validation: runOnPageValidation(
      {
        title: parsed.title || "",
        metaDescription: parsed.metaDescription || "",
        h1: parsed.headings.h1,
        bodyText: parsed.paragraphs.join(" "),
      },
      keywords,
    ),
  };
}
