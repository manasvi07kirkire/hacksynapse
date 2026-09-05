import { FindingType } from "../detect/types";

export type RemediationTier = "TIER_A" | "TIER_B" | "TIER_C";

export interface TierClassification {
  tier: RemediationTier;
  label: "AUTO-FIX" | "DRAFT PR" | "APPROVAL ONLY";
  colorToken: "patina" | "marigold" | "ember";
  isAutoFixable: boolean;
  description: string;
}

// Strict Tier A Allow-list as mandated by AI_RULES.md
const TIER_A_ALLOWLIST: FindingType[] = [
  "CANONICAL_STRIPPED",
  "SCHEMA_REMOVED",
  "NOINDEX_FLIPPED",
  "LLMSTXT_INVALID",
];

const TIER_B_TYPES: FindingType[] = [
  "SCHEMA_INVALID",
  "ORPHAN_PAGE",
  "TITLE_MISSING",
  "META_DESCRIPTION_MISSING",
  "DUPLICATE_TITLE",
  "ORPHAN_PAGE_CREATED",
  "SITEMAP_INCONSISTENCY",
];

export function classifyRemediationTier(
  findingType: FindingType,
): TierClassification {
  if (TIER_A_ALLOWLIST.includes(findingType)) {
    return {
      tier: "TIER_A",
      label: "AUTO-FIX",
      colorToken: "patina",
      isAutoFixable: true,
      description:
        "Declarative, template-safe change. SearchOps can automatically validate and open a ready PR.",
    };
  }

  if (TIER_B_TYPES.includes(findingType)) {
    return {
      tier: "TIER_B",
      label: "DRAFT PR",
      colorToken: "marigold",
      isAutoFixable: false,
      description:
        "Structural or routing change. Opened as a Draft PR awaiting human engineering review.",
    };
  }

  return {
    tier: "TIER_C",
    label: "APPROVAL ONLY",
    colorToken: "ember",
    isAutoFixable: false,
    description:
      "High-risk URL, redirect, or content architecture change. Recommended with manual approval required.",
  };
}
