import { FindingData } from "../detect/types";
export interface GitDiffFile {
  filename: string;
  patch: string;
  additions: number;
  deletions: number;
}
export interface DiagnosisResult {
  file: string;
  line: number;
  component: string;
  confidence: number;
  matchedSignature: string;
  snippet: string;
}
export function diagnoseRootCause(
  finding: Pick<FindingData, "type">,
  files: GitDiffFile[],
): DiagnosisResult | null {
  const candidates: DiagnosisResult[] = [];
  for (const file of [...files].sort((a, b) =>
    a.filename.localeCompare(b.filename),
  )) {
    let oldLine = 0;
    let newLine = 0;
    let inHunk = false;
    for (const line of file.patch.split("\n")) {
      const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      if (hunk) {
        oldLine = Number(hunk[1]);
        newLine = Number(hunk[2]);
        inHunk = true;
        continue;
      }
      if (!inHunk) continue;
      const canonical =
        finding.type === "CANONICAL_STRIPPED" &&
        line.startsWith("-") &&
        /\bcanonical\b/.test(line);
      const robots =
        finding.type === "NOINDEX_FLIPPED" &&
        line.startsWith("+") &&
        /\bnoindex\b|\bindex\s*:\s*false/.test(line);
      const schema =
        finding.type === "SCHEMA_REMOVED" &&
        line.startsWith("-") &&
        /application\/ld\+json|JsonLd/.test(line);
      if (canonical || robots || schema)
        candidates.push({
          file: file.filename,
          line: robots ? newLine : oldLine,
          component: "unattributed",
          confidence: 80,
          matchedSignature: canonical
            ? "CANONICAL_TAG_REMOVAL_SIG"
            : robots
              ? "ROBOTS_NOINDEX_INJECTION_SIG"
              : "JSONLD_SCHEMA_STRIP_SIG",
          snippet: line.slice(1).trim().slice(0, 500),
        });
      if (line.startsWith(" ") || line.startsWith("-")) oldLine++;
      if (line.startsWith(" ") || line.startsWith("+")) newLine++;
    }
  }
  return candidates.length === 1 ? candidates[0] : null;
}
