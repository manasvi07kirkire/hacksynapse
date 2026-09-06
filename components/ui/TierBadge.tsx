import React from "react";
import clsx from "clsx";
import {
  classifyRemediationTier,
  RemediationTier,
} from "@/lib/remediate/tier-manager";

interface TierBadgeProps {
  tier?: RemediationTier;
  findingType?: any;
  className?: string;
  showDescription?: boolean;
}

export const TierBadge: React.FC<TierBadgeProps> = ({
  tier = "TIER_A",
  findingType,
  className,
  showDescription = false,
}) => {
  const classification = findingType
    ? classifyRemediationTier(findingType)
    : {
        tier,
        label:
          tier === "TIER_A"
            ? "AUTO-FIX"
            : tier === "TIER_B"
              ? "DRAFT PR"
              : "APPROVAL ONLY",
        colorToken:
          tier === "TIER_A"
            ? "patina"
            : tier === "TIER_B"
              ? "marigold"
              : "ember",
        description:
          tier === "TIER_A"
            ? "Declarative template-safe fix"
            : tier === "TIER_B"
              ? "Structural draft PR"
              : "Requires manual human approval",
      };

  const isPatina = classification.colorToken === "patina";
  const isMarigold = classification.colorToken === "marigold";

  // Symbols: ● patina (Auto-fix), ▲ marigold (Draft PR), ■ ember (Approval)
  const symbol = isPatina ? "●" : isMarigold ? "▲" : "■";

  const colorStyles = isPatina
    ? "text-patina-600 bg-patina-soft border-patina-500/40"
    : isMarigold
      ? "text-marigold-600 bg-marigold-soft border-marigold-400/40"
      : "text-ember-600 bg-ember-soft border-ember-600/40";

  return (
    <div className={clsx("inline-flex flex-col items-start gap-1", className)}>
      <span
        className={clsx(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border font-mono text-xs font-bold uppercase tracking-wider",
          colorStyles,
        )}
      >
        <span className="text-xs leading-none" aria-hidden="true">
          {symbol}
        </span>
        <span>{classification.label}</span>
      </span>
      {showDescription && (
        <span className="font-sans text-xs text-bone-500 max-w-xs">
          {classification.description}
        </span>
      )}
    </div>
  );
};
