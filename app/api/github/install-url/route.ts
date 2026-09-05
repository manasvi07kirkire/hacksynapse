import { api } from "../../../../lib/server/api";
import { fail } from "../../../../lib/server/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = api(async () => {
  const slug = process.env.GITHUB_APP_SLUG;
  if (!slug || !/^[a-zA-Z0-9-]+$/.test(slug))
    fail(
      503,
      "INSTALLATION_CONFIGURATION_REQUIRED",
      "Configure the GitHub App slug.",
    );
  return { url: `https://github.com/apps/${slug}/installations/new` };
});
