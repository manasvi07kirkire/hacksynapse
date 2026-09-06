"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ChevronDown,
  Compass,
  GitBranch,
  LayoutDashboard,
  Menu,
  Network,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { ConnectedProject } from "@/components/ProjectAccess";

const navLinks = [
  { href: "/watch", label: "Watch", icon: LayoutDashboard },
  { href: "/regression", label: "Regressions", icon: Activity },
  { href: "/graph", label: "Graph", icon: Network },
  { href: "/geo", label: "GEO", icon: Compass },
  { href: "/seo-advisor", label: "SEO Advisor", icon: Sparkles },
  { href: "/remediation", label: "Recovery", icon: ShieldCheck },
];

interface AppShellProps {
  project: ConnectedProject | null;
  projects: ConnectedProject[];
  selectedId: string;
  onSelectProject: (id: string) => void;
  statusMessage?: string;
  error?: string;
  children: React.ReactNode;
}

export function AppShell({
  project,
  projects,
  selectedId,
  onSelectProject,
  statusMessage,
  error,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isActive = (href: string) =>
    href === "/watch"
      ? pathname === "/" || pathname === "/watch"
      : pathname?.startsWith(href);

  const isConnectPage = pathname === "/connect";

  return (
    <div className="flex min-h-screen flex-col bg-paper-50">
      <header className="sticky top-0 z-50 border-b border-paper-200 bg-surface/95">
        <div className="mx-auto flex h-14 max-w-[75rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-6">
            <Link href="/watch" className="group flex shrink-0 items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-ember-500 font-mono text-xs font-bold text-white shadow-cta transition-transform duration-[160ms] group-hover:scale-[1.02]">
                SO
              </div>
              <div className="hidden leading-none sm:block">
                <span className="font-display text-base font-normal tracking-tight text-espresso-900">
                  SearchOps
                </span>
                <span className="mono-label mt-0.5 block text-bone-700">
                  Discoverability CI/CD
                </span>
              </div>
            </Link>

            <nav className="hidden items-center gap-0.5 lg:flex">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-1.5 rounded-sm px-3 py-2 text-sm font-medium transition-colors duration-[160ms] focus-ring",
                      active
                        ? "bg-ember-soft text-ember-600"
                        : "text-espresso-700 hover:bg-paper-100 hover:text-espresso-900",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 stroke-[1.5]",
                        active ? "text-ember-600" : "text-bone-700",
                      )}
                    />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {projects.length > 0 && (
              <div className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setProjectOpen((v) => !v)}
                  className="flex max-w-[220px] items-center gap-2 rounded-md border border-paper-200 bg-surface px-3 py-1.5 text-left text-sm transition-colors hover:border-paper-200 focus-ring lg:max-w-[280px]"
                  aria-expanded={projectOpen}
                  aria-haspopup="listbox"
                >
                  <GitBranch className="h-3.5 w-3.5 shrink-0 text-bone-700" />
                  <span className="truncate font-medium text-espresso-900">
                    {project?.repo || "Select project"}
                  </span>
                  <ChevronDown
                    className={cn(
                      "ml-auto h-4 w-4 shrink-0 text-bone-700 transition-transform duration-[160ms]",
                      projectOpen && "rotate-180",
                    )}
                  />
                </button>
                {projectOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setProjectOpen(false)}
                      aria-hidden
                    />
                    <ul
                      role="listbox"
                      className="absolute right-0 z-50 mt-1.5 w-72 overflow-hidden rounded-lg border border-paper-200 bg-surface py-1 animate-fade-in"
                    >
                      {projects.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={p.id === selectedId}
                            onClick={() => {
                              onSelectProject(p.id);
                              setProjectOpen(false);
                            }}
                            className={cn(
                              "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-paper-50",
                              p.id === selectedId && "bg-ember-soft/60",
                            )}
                          >
                            <span className="font-medium text-espresso-900">
                              {p.repo}
                            </span>
                            <span className="truncate font-mono text-xs text-bone-700">
                              {p.siteUrl}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            <Link href="/connect" className="hidden sm:block">
              <Button
                variant={isConnectPage ? "primary" : "outline"}
                size="sm"
              >
                {projects.length ? "Settings" : "Connect"}
              </Button>
            </Link>

            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-paper-200 text-espresso-900 transition-colors hover:bg-paper-100 lg:hidden focus-ring"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5 stroke-[1.5]" />
            </button>
          </div>
        </div>

        {(project || error || statusMessage) && (
          <div className="border-t border-paper-200 bg-paper-50">
            <div className="mx-auto flex max-w-[75rem] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 text-xs sm:px-6 lg:px-8">
              {project && (
                <>
                  <Badge variant="success" dot>
                    Connected
                  </Badge>
                  <span className="font-mono text-bone-700">{project.siteUrl}</span>
                </>
              )}
              {error && <span className="text-ember-600">{error}</span>}
              {!error && statusMessage && (
                <span className="text-bone-700">{statusMessage}</span>
              )}
            </div>
          </div>
        )}
      </header>

      {mobileOpen && (
        <div
          className="overlay-backdrop lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-80 flex-col border-l border-paper-200 bg-surface transition-transform duration-[160ms] ease-instrument lg:hidden",
          mobileOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-paper-200 px-4 py-3">
          <span className="font-semibold text-espresso-900">Menu</span>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-paper-100 focus-ring"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 stroke-[1.5]" />
          </button>
        </div>

        {projects.length > 0 && (
          <div className="border-b border-paper-200 px-4 py-3">
            <label className="mono-label mb-1.5 block text-bone-700">
              Project
            </label>
            <select
              value={selectedId}
              onChange={(e) => onSelectProject(e.target.value)}
              className="w-full rounded-md border border-paper-200 bg-surface px-3 py-2 text-sm text-espresso-900 focus-ring"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.repo}
                </option>
              ))}
            </select>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto p-3">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "mb-0.5 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-[160ms]",
                  active
                    ? "bg-ember-soft text-ember-600"
                    : "text-espresso-700 hover:bg-paper-100 hover:text-espresso-900",
                )}
              >
                <Icon className="h-4 w-4 stroke-[1.5]" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-paper-200 p-4">
          <Link href="/connect" className="block">
            <Button variant="outline" className="w-full">
              {projects.length ? "Project settings" : "Connect repository"}
            </Button>
          </Link>
        </div>
      </aside>

      <main className="flex-1">{children}</main>
    </div>
  );
}
