import { PrismaClient } from "@prisma/client";
import { classifyRemediationTier } from "../lib/remediate/tier-manager";

async function main() {
  const repo = process.argv[2] || "dvmmisafk/healthcart";
  const db = new PrismaClient();
  const project = await db.project.findFirstOrThrow({ where: { repo } });
  console.log("project", {
    id: project.id,
    repo: project.repo,
    installId: project.installId,
    sourceMap: project.sourceMap,
    siteUrl: project.siteUrl,
  });
  const deployments = await db.deployment.findMany({
    where: { projectId: project.id },
    orderBy: { deployNumber: "desc" },
    take: 5,
    include: {
      findings: { where: { status: "OPEN" }, orderBy: { severity: "desc" } },
    },
  });
  for (const d of deployments) {
    console.log(
      `\n#${d.deployNumber} ${d.status} sha=${d.sha.slice(0, 12)} revisionVerified=${d.revisionVerified}`,
    );
    for (const f of d.findings) {
      const tier = classifyRemediationTier(f.type as never);
      console.log(
        `  ${f.type} tier=${tier.tier} id=${f.id} fixableOnDeploy=${
          d.status === "REGRESSION" ||
          (d.status === "DEGRADED" && tier.tier === "TIER_A")
        }`,
      );
    }
  }
  const remediations = await db.remediation.findMany({
    where: { finding: { deployment: { projectId: project.id } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  console.log("\nremediations", remediations);
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
