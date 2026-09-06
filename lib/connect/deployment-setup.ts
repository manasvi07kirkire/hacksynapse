export type SetupFramework = "nextjs" | "vercel" | "static" | "nginx";

export interface SetupSnippet {
  id: SetupFramework;
  label: string;
  description: string;
  language: string;
  code: string;
}

export const DEPLOYMENT_SETUP_STEPS = [
  {
    title: "Emit the deployed commit SHA on every HTML page",
    detail:
      "Add an X-SearchOps-Sha response header whose value is the full Git commit SHA currently live at your site URL. SearchOps compares this to the revision being analyzed.",
  },
  {
    title: "Deploy and confirm the header",
    detail:
      "After your host finishes deploying, curl the homepage and confirm the header matches the commit you expect. Short lag is normal; use Recheck in Watch if analysis stayed DEGRADED.",
  },
  {
    title: "Connect the repository in SearchOps",
    detail:
      "Use owner/repo, the public site URL, your default branch, a route manifest, and a page-to-source map so auto-fix PRs know which file to patch.",
  },
  {
    title: "Grant GitHub write access for PRs",
    detail:
      "GitHub App or PAT must allow Contents and Pull requests write on the connected repository. SearchOps opens draft PRs; it never merges automatically.",
  },
  {
    title: "Analyze, detect, generate fix",
    detail:
      "Run Analyze deployment in Watch. Verified REGRESSION findings that are Tier-A (e.g. CANONICAL_STRIPPED) can open an auto-fix PR. Merge and redeploy on your side to close the loop.",
  },
] as const;

export const SETUP_SNIPPETS: SetupSnippet[] = [
  {
    id: "nextjs",
    label: "Next.js",
    description: "Works on Vercel, Netlify, or any Node host.",
    language: "typescript",
    code: `// next.config.ts
import type { NextConfig } from "next";

const commitSha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.COMMIT_SHA ||
  "local-dev";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-SearchOps-Sha", value: commitSha }],
      },
    ];
  },
};

export default nextConfig;`,
  },
  {
    id: "vercel",
    label: "vercel.json",
    description: "Static sites or frameworks without Next config access.",
    language: "json",
    code: `{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-SearchOps-Sha",
          "value": "SET_AT_BUILD_TIME"
        }
      ]
    }
  ]
}

/* Vercel does not expand env vars in vercel.json.
   Run this before build (VERCEL_GIT_COMMIT_SHA is set on Vercel):

   node scripts/write-searchops-vercel-json.mjs && vite build

   See scripts/write-searchops-vercel-json.mjs in the deployment guide. */`,
  },
  {
    id: "static",
    label: "Node / Express",
    description: "Any Node server — set the header on every response.",
    language: "javascript",
    code: `// server.js or app entry
const commitSha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.COMMIT_SHA ||
  "local-dev";

app.use((_req, res, next) => {
  res.setHeader("X-SearchOps-Sha", commitSha);
  next();
});`,
  },
  {
    id: "nginx",
    label: "Nginx",
    description: "Reverse proxy or static origin.",
    language: "nginx",
    code: `# Set SEARCHOPS_SHA in your deploy script, then:
add_header X-SearchOps-Sha $searchops_sha always;`,
  },
];

export function needsRevisionSetup(degradation: string[]): boolean {
  return degradation.some((d) =>
    [
      "DEPLOYED_REVISION_UNVERIFIED",
      "PRIOR_COMPARISON_UNVERIFIED",
      "FORCED_PUSH_BASELINE",
    ].includes(d),
  );
}

export function normalizeSetupSiteUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    parsed.hash = "";
    return parsed.origin;
  } catch {
    return null;
  }
}

export function verifyHeaderCommand(siteUrl: string, shell: "powershell" | "curl" = "powershell"): string {
  const origin = normalizeSetupSiteUrl(siteUrl) ?? "https://your-site.example";
  if (shell === "curl") {
    return `curl -sI "${origin}/" | findstr /i X-SearchOps-Sha`;
  }
  return `$h = (Invoke-WebRequest -Uri "${origin}/" -Method Head -UseBasicParsing).Headers["X-SearchOps-Sha"]; if ($h) { "OK: $h" } else { "MISSING: X-SearchOps-Sha not set" }`;
}
