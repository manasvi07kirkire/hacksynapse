import { PrismaClient } from "@prisma/client";
import { crawlRoutes } from "../lib/crawler/crawl-routes";

async function main() {
  const db = new PrismaClient();
  const project = await db.project.findFirstOrThrow({
    where: { repo: "dvmmisafk/healthcart" },
  });
  console.log("manifest", project.routeManifest);
  console.log("site", project.siteUrl);

  const sha = "fe8cd38d2ef14f8497fb891bfa7b130435c2a66c";
  const routes = JSON.parse(project.routeManifest) as string[];
  const crawl = await crawlRoutes(routes, project.siteUrl, sha);
  console.log("pages", crawl.pages.length, "errors", crawl.errors);
  console.log("revisionVerified", crawl.revisionVerified);

  const jobs = await db.analysisJob.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, status: true, attempts: true, errorCode: true },
  });
  console.log("recent jobs", jobs);
  await db.$disconnect();
}

main().catch(console.error);
