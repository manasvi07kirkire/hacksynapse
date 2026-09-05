async function main() {
  const key = process.env.SEARCHOPS_API_KEY!;
  const projectId = "cmtot9iyy0001v4ryzrnk4y7y";
  const headers = {
    "Content-Type": "application/json",
    "x-searchops-key": key,
  };

  const existing = await fetch(
    `http://localhost:3000/api/deployments?projectId=${projectId}`,
    { headers: { "x-searchops-key": key } },
  );
  const existingData = await existing.json();
  if (!existingData.deployments?.length) {
    const start = await fetch("http://localhost:3000/api/run-analysis", {
      method: "POST",
      headers,
      body: JSON.stringify({ projectId }),
    });
    const started = await start.json();
    console.log("run-analysis", start.status, started);
    if (!start.ok) process.exit(1);
  } else {
    console.log("existing deployments", existingData.deployments.length);
  }

  for (let i = 0; i < 72; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await fetch(
      `http://localhost:3000/api/deployments?projectId=${projectId}`,
      { headers: { "x-searchops-key": key } },
    );
    const data = await res.json();
    const d = data.deployments?.[0];
    const job = d?.jobs?.[0];
    console.log(
      `[${i}]`,
      d
        ? `${d.status} #${d.deployNumber} job=${job?.status ?? "none"} ${job?.errorCode ?? ""}`
        : "no deployments",
    );
    if (d && !["QUEUED", "RUNNING"].includes(d.status)) {
      console.log(
        JSON.stringify(
          {
            status: d.status,
            deployNumber: d.deployNumber,
            score: d.score,
            degradation: d.degradation,
            findings: d.findings?.map((f: { type: string; status: string }) => ({
              type: f.type,
              status: f.status,
            })),
          },
          null,
          2,
        ),
      );
      return;
    }
  }
  console.log("Timed out waiting for deployment.");
  process.exitCode = 1;
}

void main();
