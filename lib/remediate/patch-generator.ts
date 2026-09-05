import { FindingData } from "../detect/types";
import { classifyRemediationTier, RemediationTier } from "./tier-manager";
import { sourceDiff, strictApply } from "./validate-patch";
import { parseHtml } from "../extract/html-parser";
import { fail } from "../server/errors";
export interface GeneratedPatch {
  tier: RemediationTier;
  targetFile: string;
  actionSummary: string;
  diff: string;
  prTitle: string;
  prBody: string;
  validationResult: {
    syntaxCheck: boolean;
    ruleRecheckPassed: boolean;
    buildable: boolean;
    buildStatus?: string;
  };
  content?: string;
  draft?: boolean;
  prUrl?: string;
  prNumber?: number;
}
export function generateRemediationPatch(
  finding: FindingData,
  source?: { path: string; current: string; previous: string; url: string },
): GeneratedPatch {
  if (!source)
    fail(
      422,
      "SOURCE_REQUIRED",
      "Verified current and prior repository source is required.",
    );
  const { path, current, previous, url } = source;
  let after = current;
  if (/\.html?$/.test(path)) {
    const old = parseHtml(url, previous);
    const now = parseHtml(url, current);
    if (
      finding.type === "CANONICAL_STRIPPED" &&
      old.canonicalUrl &&
      !now.canonicalUrl &&
      !old.canonicalErrors?.length
    ) {
      const tags =
        previous.match(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi) || [];
      if (tags.length !== 1 || !/<\/head>/i.test(current))
        fail(
          422,
          "UNSUPPORTED_SOURCE",
          "Cannot safely restore this canonical declaration.",
        );
      after = current.replace(/<\/head>/i, () => `${tags[0]}\n</head>`);
    } else if (
      finding.type === "NOINDEX_FLIPPED" &&
      now.robotsDirectives.noindex &&
      !old.robotsDirectives.noindex
    ) {
      const tags =
        current.match(
          /<meta\b[^>]*\bname=["'](?:robots|googlebot)["'][^>]*>/gi,
        ) || [];
      if (tags.length !== 1)
        fail(
          422,
          "UNSUPPORTED_SOURCE",
          "Cannot safely identify the robots declaration.",
        );
      const previousTags =
        previous.match(
          /<meta\b[^>]*\bname=["'](?:robots|googlebot)["'][^>]*>/gi,
        ) || [];
      if (previousTags.length > 1)
        fail(
          422,
          "UNSUPPORTED_SOURCE",
          "Prior robots declarations are ambiguous.",
        );
      after = current.replace(tags[0], previousTags[0] || "");
    } else if (
      finding.type === "SCHEMA_REMOVED" &&
      !now.jsonLdSchemas.length &&
      old.jsonLdSchemas.length &&
      !old.schemaErrors?.length
    ) {
      const tags =
        previous.match(
          /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
        ) || [];
      if (!tags.length || !/<\/head>/i.test(current))
        fail(
          422,
          "UNSUPPORTED_SOURCE",
          "Cannot safely restore structured data.",
        );
      after = current.replace(/<\/head>/i, () => `${tags.join("\n")}\n</head>`);
    }
  } else if (/\.[jt]sx?$/.test(path) && finding.type === "CANONICAL_STRIPPED") {
    // Only a literal canonical declaration; dynamic generators need repository-specific validation.
    const declaration =
      previous.match(
        /alternates\s*:\s*\{\s*canonical\s*:\s*(['"])[^'"]+\1\s*,?\s*\}\s*,?/g,
      ) || [];
    if (
      declaration.length === 1 &&
      !/\balternates\s*:/.test(current) &&
      /return\s*\{/.test(current) &&
      current.match(/return\s*\{/g)?.length === 1
    )
      after = current.replace(
        /return\s*\{/,
        (m) => m + "\n" + declaration[0].replace(/,?$/, ","),
      );
  }
  if (after === current)
    fail(
      422,
      "UNSUPPORTED_SOURCE",
      "No safe transformation matches this finding and source. A repository-specific patch requires review.",
    );
  const diff = sourceDiff(path, current, after);
  strictApply(path, current, diff);
  const isHtml = /\.html?$/.test(path);
  const parsed = isHtml ? parseHtml(url, after) : null;
  const rulePassed =
    finding.type === "CANONICAL_STRIPPED"
      ? isHtml
        ? !!parsed?.canonicalUrl
        : /canonical\s*:/.test(after)
      : finding.type === "NOINDEX_FLIPPED"
        ? !parsed?.robotsDirectives.noindex
        : finding.type === "SCHEMA_REMOVED"
          ? !!parsed?.jsonLdSchemas.length
          : false;
  if (!rulePassed)
    fail(
      422,
      "RULE_VALIDATION_FAILED",
      "Patched source does not satisfy the finding rule.",
    );
  const tier = classifyRemediationTier(finding.type).tier;
  const validationResult = {
    syntaxCheck: true,
    ruleRecheckPassed: true,
    buildable: isHtml,
    buildStatus: isHtml ? "NOT_REQUIRED_STATIC_HTML" : "NOT_RUN",
  };
  return {
    tier,
    targetFile: path,
    actionSummary: `Restore verified ${finding.type.toLowerCase()} declaration`,
    diff,
    prTitle: `fix(discoverability): ${finding.type.toLowerCase()}`,
    prBody: `Deterministic finding ${finding.id}. Exact source/context and static rule validation passed. Build: ${validationResult.buildStatus}. Review required; never auto-merged.`,
    validationResult,
    content: after,
    draft: tier !== "TIER_A" || !isHtml,
  };
}
