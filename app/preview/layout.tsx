import { ReactNode } from "react";
import { Alert } from "../../components/ui/Badge";

export default function PreviewLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Alert variant="warning" className="rounded-none border-x-0 border-t-0">
        Design preview — simulated data and actions. Use{" "}
        <strong>Watch</strong> for connected projects.
      </Alert>
      {children}
    </>
  );
}
