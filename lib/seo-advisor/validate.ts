export interface OnPageCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface OnPageValidationResult {
  passed: boolean;
  checks: OnPageCheck[];
}

const TITLE_MIN = 15;
const TITLE_MAX = 60;
const META_MIN = 50;
const META_MAX = 160;
const KEYWORD_DENSITY_MAX = 0.06; // 6% of body word count for any single target keyword

export interface PatchedPagePreview {
  title: string;
  metaDescription: string;
  h1: string[];
  bodyText: string;
}

export function validateTitleLength(title: string): OnPageCheck {
  const len = title.length;
  const passed = len >= TITLE_MIN && len <= TITLE_MAX;
  return {
    name: "Title length",
    passed,
    detail: `${len} chars (target ${TITLE_MIN}-${TITLE_MAX})`,
  };
}

export function validateMetaLength(meta: string): OnPageCheck {
  const len = meta.length;
  const passed = len >= META_MIN && len <= META_MAX;
  return {
    name: "Meta description length",
    passed,
    detail: `${len} chars (target ${META_MIN}-${META_MAX})`,
  };
}

export function validateNoDuplicateH1(h1: string[]): OnPageCheck {
  const passed = h1.length <= 1;
  return {
    name: "No duplicate H1",
    passed,
    detail: passed
      ? `${h1.length} H1 element(s)`
      : `${h1.length} H1 elements found — expected at most 1`,
  };
}

export function validateKeywordDensity(
  bodyText: string,
  targetKeywords: string[],
): OnPageCheck {
  const words = bodyText.split(/\s+/).filter(Boolean);
  const wordCount = words.length || 1;
  const bodyLower = bodyText.toLowerCase();

  let worstKeyword = "";
  let worstDensity = 0;
  for (const keyword of targetKeywords) {
    const kw = keyword.trim().toLowerCase();
    if (!kw) continue;
    const occurrences = bodyLower.split(kw).length - 1;
    const density = occurrences / wordCount;
    if (density > worstDensity) {
      worstDensity = density;
      worstKeyword = keyword;
    }
  }

  const passed = worstDensity <= KEYWORD_DENSITY_MAX;
  return {
    name: "Keyword density sanity",
    passed,
    detail: passed
      ? `Highest density ${(worstDensity * 100).toFixed(1)}% (limit ${(KEYWORD_DENSITY_MAX * 100).toFixed(0)}%)`
      : `"${worstKeyword}" at ${(worstDensity * 100).toFixed(1)}% exceeds the ${(KEYWORD_DENSITY_MAX * 100).toFixed(0)}% keyword-stuffing threshold`,
  };
}

export function runOnPageValidation(
  preview: PatchedPagePreview,
  targetKeywords: string[],
): OnPageValidationResult {
  const checks = [
    validateTitleLength(preview.title),
    validateMetaLength(preview.metaDescription),
    validateNoDuplicateH1(preview.h1),
    validateKeywordDensity(preview.bodyText, targetKeywords),
  ];
  return {
    passed: checks.every((c) => c.passed),
    checks,
  };
}
