"use client";

import React, { useState } from "react";
import clsx from "clsx";
import { Network, Info } from "lucide-react";
import { GraphEdgeData, GraphNodeData } from "@/lib/graph/types";

interface GraphCanvasProps {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  selectedNodeId?: string;
  onSelectNode?: (node: GraphNodeData) => void;
  className?: string;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  className,
}) => {
  const [activeFilter, setActiveFilter] = useState<
    "ALL" | "PAGES" | "TEMPLATES" | "REGRESSIONS"
  >("ALL");
  const [hoveredNode, setHoveredNode] = useState<GraphNodeData | null>(null);

  const filteredNodes = nodes.filter((n) => {
    if (activeFilter === "PAGES") return n.type === "page";
    if (activeFilter === "TEMPLATES")
      return n.type === "template" || n.type === "schema";
    if (activeFilter === "REGRESSIONS")
      return n.health === "REGRESSION" || n.health === "DEGRADED";
    return true;
  });

  const pageCount = nodes.filter((n) => n.type === "page").length;
  const regressedCount = nodes.filter((n) => n.health === "REGRESSION").length;

  return (
    <div
      className={clsx(
        "bg-ink-800 border border-ink-700 rounded-sm p-4 sm:p-5 flex flex-col gap-4 relative overflow-hidden",
        className,
      )}
    >
      {/* Canvas Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700 pb-3">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-steel-400 shrink-0" />
          <span className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-bone-100">
            DISCOVERABILITY GRAPH & PROPAGATION TOPOLOGY
          </span>
          <span className="font-mono text-xs text-bone-400 bg-ink-850 px-2.5 py-1 rounded-sm border border-ink-700 font-bold">
            {nodes.length} NODES · {edges.length} RELATIONS
          </span>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-1.5 bg-ink-850 p-1 rounded-sm border border-ink-700 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveFilter("ALL")}
            className={clsx(
              "font-mono text-xs sm:text-sm px-3 py-1.5 rounded-sm transition-all shrink-0 font-bold uppercase min-h-[36px]",
              activeFilter === "ALL"
                ? "bg-ink-750 text-bone-100 border border-ink-700 shadow-sm"
                : "text-bone-400 hover:text-bone-200",
            )}
          >
            ALL ({nodes.length})
          </button>
          <button
            onClick={() => setActiveFilter("PAGES")}
            className={clsx(
              "font-mono text-xs sm:text-sm px-3 py-1.5 rounded-sm transition-all shrink-0 font-bold uppercase min-h-[36px]",
              activeFilter === "PAGES"
                ? "bg-ink-750 text-bone-100 border border-ink-700 shadow-sm"
                : "text-bone-400 hover:text-bone-200",
            )}
          >
            PAGES ({pageCount})
          </button>
          <button
            onClick={() => setActiveFilter("TEMPLATES")}
            className={clsx(
              "font-mono text-xs sm:text-sm px-3 py-1.5 rounded-sm transition-all shrink-0 font-bold uppercase min-h-[36px]",
              activeFilter === "TEMPLATES"
                ? "bg-ink-750 text-bone-100 border border-ink-700 shadow-sm"
                : "text-bone-400 hover:text-bone-200",
            )}
          >
            TEMPLATES / SCHEMAS
          </button>
          <button
            onClick={() => setActiveFilter("REGRESSIONS")}
            className={clsx(
              "font-mono text-xs sm:text-sm px-3 py-1.5 rounded-sm transition-all shrink-0 font-bold uppercase min-h-[36px]",
              activeFilter === "REGRESSIONS"
                ? "bg-ember-tint text-ember-400 border border-ember-600/40 shadow-sm"
                : "text-bone-400 hover:text-bone-200",
            )}
          >
            IMPACTED ({regressedCount})
          </button>
        </div>
      </div>

      {/* Topology Canvas */}
      <div className="bg-ink-900 border border-ink-700 rounded-sm p-4 sm:p-5 min-h-[240px] flex flex-col justify-between relative overflow-hidden">
        {/* Nodes Grid */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredNodes.map((node) => {
            const isRegressed = node.health === "REGRESSION";
            const isDegraded = node.health === "DEGRADED";
            const isRootCauseEmitter =
              node.key === "ProductPage.tsx" && isRegressed;
            const isSelected = node.id === selectedNodeId;

            // Discrete Status Atom per design system
            let statusSymbol = "■";
            let statusLabel = "PASS";
            let statusClass = "text-patina-400";

            if (isRegressed) {
              statusSymbol = "●";
              statusLabel = "REGRESSION";
              statusClass = "text-ember-400";
            } else if (isDegraded) {
              statusSymbol = "▲";
              statusLabel = "DEGRADED";
              statusClass = "text-marigold-400";
            }

            return (
              <div
                key={node.id}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => onSelectNode && onSelectNode(node)}
                className={clsx(
                  "p-3 rounded-sm border bg-ink-800 transition-all duration-150 flex flex-col justify-between gap-2.5 cursor-pointer font-mono",
                  isRootCauseEmitter
                    ? "border-ember-600/80 bg-ember-tint ring-1 ring-ember-600/40"
                    : isSelected
                      ? "border-line-500 bg-ink-750 ring-1 ring-line-500"
                      : "border-ink-700 hover:border-line-500 hover:bg-ink-750",
                )}
              >
                {/* Node Title & Type Chip */}
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-bone-100 truncate">
                    {node.title || node.url}
                  </span>
                  <span className="text-xs uppercase tracking-wider text-bone-400 px-2 py-0.5 bg-ink-850 border border-ink-700 rounded-sm shrink-0 font-bold">
                    {node.type}
                  </span>
                </div>

                {/* Subtitle / Path */}
                <div className="text-xs text-bone-400 truncate">
                  <code>{node.url}</code>
                </div>

                {/* Status Atom */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-ink-700/80">
                  <span
                    className={clsx(
                      "flex items-center gap-1.5 font-bold",
                      statusClass,
                    )}
                  >
                    <span className="text-xs leading-none">{statusSymbol}</span>
                    <span>{statusLabel}</span>
                  </span>

                  {isRootCauseEmitter ? (
                    <span className="text-ember-400 text-xs font-bold uppercase tracking-wider bg-ember-tint px-2 py-0.5 border border-ember-600/40 rounded-sm">
                      ROOT CAUSE
                    </span>
                  ) : (
                    <span className="text-bone-400 text-xs">
                      {node.type === "template"
                        ? "Emitter"
                        : node.type === "schema"
                          ? "Entity"
                          : "Route"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Telemetry Inspection Footer */}
        <div className="relative z-10 mt-4 pt-3 border-t border-ink-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm font-mono text-bone-400">
          <div className="flex items-center gap-2 truncate">
            <Info className="w-4 h-4 text-steel-400 shrink-0" />
            {hoveredNode ? (
              <span className="truncate">
                Inspecting:{" "}
                <strong className="text-bone-100">{hoveredNode.url}</strong> (
                {hoveredNode.health}) · Template:{" "}
                {hoveredNode.attrs?.templateName || "None"}
              </span>
            ) : (
              <span>
                Hover or click any node to trace impact propagation topology
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs font-bold shrink-0">
            <span className="flex items-center gap-1.5 text-patina-400">
              <span>■</span> Pass
            </span>
            <span className="flex items-center gap-1.5 text-marigold-400">
              <span>▲</span> Degraded
            </span>
            <span className="flex items-center gap-1.5 text-ember-400">
              <span>●</span> Regression
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
