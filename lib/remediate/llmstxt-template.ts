import { parseLlmsTxt } from "../extract/llmstxt-parser";

export function buildLlmsTxtTemplate(siteUrl: string, title = "Site"): string {
  const origin = new URL(siteUrl).origin;
  const name = title.trim() || "Site";
  return `# ${name}
> Discoverability summary for AI crawlers and answer engines.

## Pages
- [Home](${origin}/): Primary landing page
`;
}

export function isValidLlmsTxt(content: string): boolean {
  return parseLlmsTxt(content).isValid;
}
