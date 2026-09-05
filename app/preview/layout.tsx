import { ReactNode } from "react";
export default function PreviewLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <p className="bg-marigold-300 p-4 text-center font-bold">
        Design preview — simulated data and actions. Use the dashboard for
        connected projects.
      </p>
      {children}
    </>
  );
}
