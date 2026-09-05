import { AdvisorPageContent, Suggestion } from "./types";
import {
  OnPageValidationResult,
  PatchedPagePreview,
  runOnPageValidation,
} from "./validate";

export interface ApplyResult {
  preview: PatchedPagePreview;
  diff: string;
  validation: OnPageValidationResult;
}

function buildPatchedPreview(
  content: AdvisorPageContent,
  approved: Suggestion[],
): PatchedPagePreview {
  let title = content.title || "";
  let metaDescription = content.metaDescription || "";
  let h1 = [...content.headings.h1];
  let bodyText = content.paragraphs.join(" ");

  for (const s of approved) {
    switch (s.type) {
      case "rewrite-title":
        title = s.after;
        break;
      case "rewrite-meta":
        metaDescription = s.after;
        break;
      case "heading-change": {
        const idx = h1.indexOf(s.before);
        if (idx >= 0) h1[idx] = s.after;
        else if (h1.length === 0) h1.push(s.after);
        break;
      }
      case "add-keyword":
      case "remove-keyword":
      case "internal-link":
        bodyText = s.before
          ? bodyText.replace(s.before, s.after)
          : `${bodyText} ${s.after}`;
        break;
    }
  }

  return { title, metaDescription, h1, bodyText };
}

function buildDiff(pageUrl: string, approved: Suggestion[]): string {
  const header = `--- a: ${pageUrl}\n+++ b: ${pageUrl}`;
  const hunks = approved.map(
    (s) => `@@ ${s.location} @@\n- ${s.before || "(none)"}\n+ ${s.after}`,
  );
  return [header, ...hunks].join("\n\n");
}

export function applyApprovedSuggestions(
  pageUrl: string,
  content: AdvisorPageContent,
  targetKeywords: string[],
  approved: Suggestion[],
): ApplyResult {
  const preview = buildPatchedPreview(content, approved);
  const diff = buildDiff(pageUrl, approved);
  const validation = runOnPageValidation(preview, targetKeywords);
  return { preview, diff, validation };
}
