export function normalizeRepoInput(value: string): string {
  const trimmed = value.trim();
  const fromUrl = trimmed.match(
    /^https?:\/\/(?:www\.)?github\.com\/([^/?#]+)\/([^/?#]+?)(?:\.git)?\/?$/i,
  );
  if (fromUrl) return `${fromUrl[1]}/${fromUrl[2]}`;
  return trimmed.replace(/^github\.com\//i, "");
}

export function parseRouteManifest(value: string): string[] {
  const routes = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const invalid = routes.find(
    (route) => !route.startsWith("/") || route.startsWith("//") || /\s/.test(route),
  );
  if (invalid) {
    throw new Error(
      `Invalid route "${invalid}". Use paths like /, /about, /faq (comma-separated, no spaces inside a path).`,
    );
  }
  if (!routes.length) {
    throw new Error("Add at least one route, for example: /, /about, /faq");
  }
  return [...new Set(routes)];
}

export function parseSourceMapInput(value: string): Record<string, string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Page-to-source mapping must be valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Page-to-source mapping must be a JSON object.");
  }
  return parsed as Record<string, string>;
}

export function connectErrorMessage(
  code: string | undefined,
  error: string,
): string {
  switch (code) {
    case "INVALID_INPUT":
      return "Invalid request parameters. Use owner/repo (not a GitHub URL), comma-separated routes with no empty entries, and valid JSON for the source map.";
    case "REPOSITORY_CHANGED":
      return "Default branch does not match the repository. Set Default branch to your repo's primary branch (e.g. main or master) and try again.";
    case "GITHUB_CONFIGURATION_REQUIRED":
    case "INSTALLATION_REQUIRED":
      return "Production requires a GitHub App installation. Install SearchOps on the repo, enter the installation ID, and leave PAT mode disabled on Vercel.";
    case "GITHUB_404":
      return "GitHub could not access that repository. Check owner/repo spelling, install the SearchOps app on the repo, and confirm the installation ID matches the install URL.";
    case "UNAUTHORIZED":
      return "Sign in with your operator key first, then connect the repository.";
    default:
      return error;
  }
}
