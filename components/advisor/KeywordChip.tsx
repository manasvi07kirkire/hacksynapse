"use client";

import React from "react";
import clsx from "clsx";

interface KeywordChipProps {
  label: string;
  variant?: "add" | "remove" | "neutral";
  onRemove?: () => void;
}

export const KeywordChip: React.FC<KeywordChipProps> = ({
  label,
  variant = "neutral",
  onRemove,
}) => {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 font-mono text-xs px-2 py-1 rounded-sm border",
        variant === "add" &&
          "bg-patina-soft text-patina-600 border-patina-600/30",
        variant === "remove" &&
          "bg-ember-soft text-espresso-700 border-paper-200 line-through",
        variant === "neutral" && "bg-bone-300/40 text-ink-900 border-bone-300",
      )}
    >
      {variant === "add" && "+ "}
      {variant === "remove" && "− "}
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 text-bone-500 hover:text-ink-900"
          aria-label={`Remove ${label}`}
        >
          ×
        </button>
      )}
    </span>
  );
};
