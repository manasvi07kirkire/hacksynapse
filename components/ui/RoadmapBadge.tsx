import React from "react";
import clsx from "clsx";

interface RoadmapBadgeProps {
  label?: string;
  className?: string;
}

export const RoadmapBadge: React.FC<RoadmapBadgeProps> = ({
  label = "ROADMAP",
  className,
}) => {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded-sm bg-paper-50 border border-paper-200 font-mono text-xs font-bold text-bone-700 uppercase tracking-widest",
        className,
      )}
    >
      {label}
    </span>
  );
};
