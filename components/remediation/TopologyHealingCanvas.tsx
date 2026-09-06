"use client";

import React from "react";
import clsx from "clsx";
import { CheckCircle, AlertTriangle, Network } from "lucide-react";

interface TopologyNode {
  id: string;
  label: string;
  type: "root" | "ok" | "error" | "sitemap";
  x: number;
  y: number;
}

interface TopologyEdge {
  from: string;
  to: string;
  active?: boolean;
}

interface TopologyHealingCanvasProps {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  title?: string;
  stats?: { depth: number; okRate: number; orphans: number };
}

const NODE_COLORS = {
  root: { fill: "#C23F10", text: "#F4EDE1", border: "#E8531C" },
  ok: { fill: "#EEF8F5", text: "#2E6E62", border: "#3E8C7E" },
  error: { fill: "#FEF3EE", text: "#C23F10", border: "#E8531C" },
  sitemap: { fill: "#F6F0E6", text: "#453A2E", border: "#E0D4C0" },
};

export const TopologyHealingCanvas: React.FC<TopologyHealingCanvasProps> = ({
  nodes,
  edges,
  title = "CRAWLER TOPOLOGY",
  stats,
}) => {
  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-bone-300 pb-3">
        <div className="flex items-center gap-3">
          <Network className="w-5 h-5 text-ink-900" />
          <span className="font-mono text-sm font-black text-ink-900 uppercase tracking-wider">
            {title}
          </span>
        </div>
        {stats && (
          <div className="flex items-center gap-4 font-mono text-xs text-bone-700">
            <span>
              Depth: <strong className="text-ink-900">{stats.depth}</strong>
            </span>
            <span>
              200 OK:{" "}
              <strong className="text-patina-600">{stats.okRate}%</strong>
            </span>
            <span>
              Orphans:{" "}
              <strong className="text-ember-600">{stats.orphans}</strong>
            </span>
          </div>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="bg-paper-50 border border-paper-200 rounded-md overflow-hidden">
        <svg
          viewBox="0 0 400 280"
          className="w-full h-auto"
          style={{ minHeight: "200px" }}
        >
          {/* Grid Background */}
          <defs>
            <pattern
              id="grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="#E0D4C0"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="400" height="280" fill="url(#grid)" />

          {/* Edges */}
          {edges.map((edge, i) => {
            const from = nodeById[edge.from];
            const to = nodeById[edge.to];
            if (!from || !to) return null;
            return (
              <line
                key={i}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={edge.active ? "#3E8C7E" : "#C4B6A0"}
                strokeWidth={edge.active ? 1.5 : 1}
                className={edge.active ? "line-active" : ""}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const colors = NODE_COLORS[node.type];
            const isRoot = node.type === "root";
            const w = isRoot ? 68 : 60;
            const h = isRoot ? 28 : 24;

            return (
              <g
                key={node.id}
                className={node.type === "root" ? "node-active" : ""}
              >
                <rect
                  x={node.x - w / 2}
                  y={node.y - h / 2}
                  width={w}
                  height={h}
                  rx={2}
                  fill={colors.fill}
                  stroke={colors.border}
                  strokeWidth={isRoot ? 1.5 : 1}
                />
                <text
                  x={node.x}
                  y={node.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={colors.text}
                  fontSize="11"
                  fontFamily="'JetBrains Mono', monospace"
                  fontWeight={isRoot ? "700" : "500"}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {[
          { type: "root", label: "Root Entry", color: "bg-ember-600" },
          { type: "ok", label: "200 OK", color: "bg-patina-400" },
          { type: "error", label: "Regression", color: "bg-ember-400" },
          { type: "sitemap", label: "Sitemap", color: "bg-bone-500" },
        ].map((item) => (
          <div key={item.type} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-sm ${item.color}`} />
            <span className="font-sans text-sm text-bone-700">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
