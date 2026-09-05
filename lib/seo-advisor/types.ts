import { ExtractedPageData } from "@/lib/extract/types";

/** ExtractedPageData plus a paragraph breakdown, which the base Extractor does not expose. */
export interface AdvisorPageContent extends ExtractedPageData {
  paragraphs: string[];
}

export type SuggestionType =
  | "add-keyword"
  | "remove-keyword"
  | "rewrite-title"
  | "rewrite-meta"
  | "heading-change"
  | "internal-link";

export type SuggestionStatus = "pending" | "approved" | "rejected" | "applied";

export interface Suggestion {
  id: string;
  type: SuggestionType;
  location: string;
  before: string;
  after: string;
  rationale: string;
  confidence: number; // 0 to 100
  status: SuggestionStatus;
}

export interface SuggestionInput {
  pageUrl: string;
  targetKeywords: string[];
  content: AdvisorPageContent;
}

export interface ScanResult {
  scanId: string;
  pageUrl: string;
  targetKeywords: string[];
  content: AdvisorPageContent;
  suggestions: Suggestion[];
}

/** Locations an extracted page can carry a suggestion against — used to reject ungrounded locations. */
export function groundedLocations(content: AdvisorPageContent): string[] {
  const locations = ["title", "meta description"];
  content.headings.h1.forEach((_, i) =>
    locations.push(content.headings.h1.length === 1 ? "H1" : `H1 #${i + 1}`),
  );
  content.headings.h2.forEach((_, i) => locations.push(`H2 #${i + 1}`));
  content.paragraphs.forEach((_, i) => locations.push(`paragraph ${i + 1}`));
  locations.push("internal links");
  return locations;
}
