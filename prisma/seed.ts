import { db } from "../lib/db";
import { getConfig } from "../lib/server/config";
async function main() {
  const config = getConfig();
  if (
    config.NODE_ENV === "production" ||
    config.SEARCHOPS_LOCAL_DEMO !== "true"
  )
    throw new Error("Seed is restricted to explicit local demo mode.");
  // Demonstration fixtures belong in the preview UI and tests, never published as live analyses.
  const project = await db.project.upsert({
    where: { repo: "demo/searchops-local" },
    update: {},
    create: {
      repo: "demo/searchops-local",
      siteUrl: "http://127.0.0.1:4000",
      routeManifest: '["/"]',
      sourceMap: '{"/":"index.html"}',
      enabled: false,
    },
  });
  console.info(
    `Created disabled local project ${project.id}. Connect a verified repository through /connect to enable live operations.`,
  );
}
main()
  .catch(() => {
    console.error("Local seed failed; check configuration.");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
