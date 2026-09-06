"use client";

import React from "react";
import clsx from "clsx";
import { CheckCircle, AlertTriangle, ExternalLink } from "lucide-react";

interface CrawlRow {
  route: string;
  status: number;
  canonicalOk: boolean;
  structuredData: boolean;
  indexing: "YES" | "NO" | "NOINDEX";
}

interface CrawlVerificationTableProps {
  rows: CrawlRow[];
  title?: string;
}

const statusBadge = (code: number) => {
  if (code === 200)
    return (
      <span className="font-mono text-xs font-bold text-patina-600 bg-patina-soft px-2 py-0.5 rounded-sm border border-patina-600/30">
        200 OK
      </span>
    );
  if (code >= 300 && code < 400)
    return (
      <span className="font-mono text-xs font-bold text-steel-400 bg-paper-50 px-2 py-0.5 rounded-sm border border-paper-200">
        {code} REDIRECT
      </span>
    );
  if (code >= 400)
    return (
      <span className="font-mono text-xs font-bold text-ember-600 bg-ember-soft px-2 py-0.5 rounded-sm border border-ember-600/30">
        {code} ERROR
      </span>
    );
  return null;
};

export const CrawlVerificationTable: React.FC<CrawlVerificationTableProps> = ({
  rows,
  title = "CRAWL VERIFICATION",
}) => {
  const passCount = rows.filter(
    (r) => r.canonicalOk && r.status === 200,
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-bone-300 pb-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-black text-ink-900 uppercase tracking-wider">
            {title}
          </span>
          <span className="font-mono text-xs font-bold text-patina-600 bg-patina-400/15 px-2.5 py-0.5 rounded-sm border border-patina-400/30">
            {passCount}/{rows.length} PASSING
          </span>
        </div>
        <span className="font-sans text-xs text-bone-700">
          Post-merge validation · All routes re-crawled
        </span>
      </div>

      {/* Table */}
      <div className="w-full overflow-x-auto rounded-md border border-bone-300">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-bone-300/40 border-b border-bone-300">
              <th className="text-left font-mono text-xs font-black text-ink-900 uppercase tracking-wider px-4 py-3">
                Route
              </th>
              <th className="text-center font-mono text-xs font-black text-ink-900 uppercase tracking-wider px-4 py-3">
                HTTP
              </th>
              <th className="text-center font-mono text-xs font-black text-ink-900 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                Canonical
              </th>
              <th className="text-center font-mono text-xs font-black text-ink-900 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                JSON-LD
              </th>
              <th className="text-center font-mono text-xs font-black text-ink-900 uppercase tracking-wider px-4 py-3">
                Indexing
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const allGood =
                row.canonicalOk && row.status === 200 && row.indexing === "YES";
              return (
                <tr
                  key={i}
                  className={clsx(
                    "border-b border-bone-300 last:border-0 transition-colors hover:bg-bone-300/20",
                    allGood ? "" : "bg-ember-soft/40",
                  )}
                >
                  {/* Route */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {allGood ? (
                        <CheckCircle className="w-4 h-4 text-patina-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-ember-400 shrink-0" />
                      )}
                      <code className="font-mono text-sm text-ink-900 font-semibold truncate max-w-[180px] sm:max-w-none">
                        {row.route}
                      </code>
                    </div>
                  </td>

                  {/* HTTP Status */}
                  <td className="px-4 py-3 text-center">
                    {statusBadge(row.status)}
                  </td>

                  {/* Canonical */}
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    {row.canonicalOk ? (
                      <CheckCircle className="w-4 h-4 text-patina-400 mx-auto" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-ember-400 mx-auto" />
                    )}
                  </td>

                  {/* Structured Data */}
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    {row.structuredData ? (
                      <CheckCircle className="w-4 h-4 text-patina-400 mx-auto" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-ember-400 mx-auto" />
                    )}
                  </td>

                  {/* Indexing */}
                  <td className="px-4 py-3 text-center">
                    <span
                      className={clsx(
                        "font-mono text-xs font-bold px-2 py-0.5 rounded-sm border",
                        row.indexing === "YES"
                          ? "text-patina-600 bg-patina-soft border-patina-600/30"
                          : "text-ember-600 bg-ember-soft border-ember-600/30",
                      )}
                    >
                      {row.indexing}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
