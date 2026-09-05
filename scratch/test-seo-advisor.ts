import assert from "node:assert/strict";
import { extractHtmlContent } from "../lib/seo-advisor/extract-target";
import { generateHeuristicSuggestions } from "../lib/seo-advisor/suggest";
import { applySourceSuggestions } from "../lib/seo-advisor/source-apply";
import { openPullRequest } from "../lib/seo-advisor/open-pr";
async function testSeoAdvisor() {
  const pageUrl = "https://site.example/";
  const source =
    '<html><head><title>Workshop tool catalog</title><meta name="description" content="A source description of workshop equipment and precision tools, their care, storage and maintenance."></head><body><h1>Catalog</h1><p>Precision tools include clear documentation about normal operation and calibration plus storage procedures, maintenance instructions, care notes and workshop handling requirements.</p></body></html>';
  const content = extractHtmlContent(pageUrl, source);
  const suggestions = generateHeuristicSuggestions({
    pageUrl,
    targetKeywords: ["precision"],
    content,
  });
  assert.equal(suggestions.length, 1);
  const result = applySourceSuggestions(
    "index.html",
    pageUrl,
    source,
    content,
    ["precision"],
    suggestions,
  );
  assert.equal(result.validation.passed, true);
  assert.match(result.diff, /precision/);
  await assert.rejects(
    () => openPullRequest(pageUrl, suggestions),
    /Authorized source/,
  );
  console.info(
    "SEO source/validation compatibility checks passed. Real PR replay is exercised by npm run test:integration.",
  );
}
testSeoAdvisor().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
