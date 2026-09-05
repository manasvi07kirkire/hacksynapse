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
        "inline-flex items-center px-2 py-0.5 rounded-sm bg-ink-850 border border-steel-400/40 font-mono text-xs font-bold text-steel-400 uppercase tracking-widest",
        className,
      )}
    >
      {label}
    </span>
  );
};
