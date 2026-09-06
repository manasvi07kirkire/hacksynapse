import { writeFileSync } from "node:fs";

const sha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.COMMIT_SHA ||
  "local-dev";

writeFileSync(
  "vercel.json",
  `${JSON.stringify(
    {
      headers: [
        {
          source: "/(.*)",
          headers: [{ key: "X-SearchOps-Sha", value: sha }],
        },
      ],
    },
    null,
    2,
  )}\n`,
);
console.info("SearchOps revision marker written:", sha.slice(0, 7));
