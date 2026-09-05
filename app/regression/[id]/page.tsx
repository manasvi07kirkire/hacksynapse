import Watch from "@/components/DeploymentConsole";
import { notFound } from "next/navigation";
export default async function RegressionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1)
    notFound();
  return <Watch view="regression" deployNumber={Number(id)} />;
}
