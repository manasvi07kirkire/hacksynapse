"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  AlertTriangle,
  Compass,
  Network,
  RefreshCw,
  Zap,
  Sparkles,
  CheckCircle,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

interface FieldManualNavProps {
  currentDeployNumber?: number;
  onSelectDeploy?: (num: number) => void;
  onTriggerPoisonedDeploy?: () => void;
  isTriggering?: boolean;
}

const navLinks = [
  { href: "/", label: "Dashboard", shortLabel: "DASH", icon: LayoutDashboard },
  {
    href: "/regression/184",
    label: "Regression",
    shortLabel: "REG",
    icon: AlertTriangle,
  },
  { href: "/geo", label: "GEO Engine", shortLabel: "GEO", icon: Compass },
  {
    href: "/graph",
    label: "Crawler Graph",
    shortLabel: "GRAPH",
    icon: Network,
  },
  {
    href: "/remediation",
    label: "Remediation & Gate",
    shortLabel: "FIX",
    icon: CheckCircle,
  },
  {
    href: "/seo-advisor",
    label: "SEO Advisor",
    shortLabel: "SEO",
    icon: Sparkles,
  },
];

export const FieldManualNav: React.FC<FieldManualNavProps> = ({
  currentDeployNumber = 184,
  onSelectDeploy,
  onTriggerPoisonedDeploy,
  isTriggering = false,
}) => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    // Extract base path without deploy number for matching
    const basePath = href.replace(/\/\d+$/, "");
    return pathname?.startsWith(basePath);
  };

  return (
    <>
      {/* ── TOP NAV BAR ── */}
      <header className="w-full bg-bone-100 border-b border-bone-300 sticky top-0 z-50 shadow-card">
        <div className="w-full px-4 sm:px-6 py-0 flex items-center justify-between gap-3 h-14">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-8 h-8 bg-ember-600 text-bone-100 font-mono font-black text-sm flex items-center justify-center rounded-sm shadow-cta flex-shrink-0">
                SO
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-mono font-bold text-base sm:text-lg text-ink-900 tracking-tight">
                  SEARCHOPS
                </span>
                <span className="hidden sm:block font-mono text-2xs text-bone-500 uppercase tracking-widest leading-tight">
                  Discoverability CI/CD
                </span>
              </div>
            </Link>

            <span className="hidden lg:inline text-paper-200 font-mono text-base">
              |
            </span>

            <span className="hidden lg:inline text-xs font-sans text-bone-700">
              Target:{" "}
              <code className="text-ink-900 font-semibold font-mono bg-bone-300/40 px-1.5 py-0.5 rounded-sm">
                acme/precision-store
              </code>
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center h-full gap-0.5 font-mono text-xs">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-all uppercase tracking-wider font-bold text-xs border-b-2 h-full",
                    active
                      ? link.href === "/seo-advisor"
                        ? "border-steel-400 text-ink-900 bg-bone-300/30"
                        : link.href === "/remediation"
                          ? "border-patina-500 text-patina-600 bg-patina-soft"
                          : "border-ember-600 text-ink-900 bg-bone-300/30"
                      : "border-transparent text-bone-700 hover:text-ink-900 hover:border-bone-400 hover:bg-bone-300/20",
                  )}
                >
                  <link.icon
                    className={clsx(
                      "w-3.5 h-3.5 shrink-0",
                      active ? "text-ember-600" : "text-bone-500",
                    )}
                  />
                  <span>{link.shortLabel}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2">
            {onSelectDeploy && (
              <div className="hidden sm:flex items-center gap-0.5 bg-bone-300/40 p-0.5 rounded-sm border border-bone-300 font-mono text-xs">
                {[183, 184, 185].map((num) => (
                  <button
                    key={num}
                    onClick={() => onSelectDeploy(num)}
                    className={clsx(
                      "px-2.5 py-1 rounded-sm font-bold uppercase transition-all text-xs min-h-touch",
                      currentDeployNumber === num
                        ? num === 184
                          ? "bg-ember-600 text-bone-100"
                          : "bg-patina-500 text-bone-100"
                        : "text-bone-700 hover:text-ink-900 hover:bg-bone-300/40",
                    )}
                  >
                    #{num}
                  </button>
                ))}
              </div>
            )}

            {onTriggerPoisonedDeploy && (
              <button
                onClick={onTriggerPoisonedDeploy}
                disabled={isTriggering}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-ember-600 hover:bg-ember-500 text-bone-100 rounded-sm font-mono text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-cta shrink-0 min-h-touch"
              >
                <Zap className="w-3.5 h-3.5" />
                <span className="hidden md:inline">
                  {isTriggering ? "SIMULATING..." : "SIMULATE POISON"}
                </span>
              </button>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden flex items-center justify-center w-9 h-9 text-ink-900 rounded-sm border border-bone-300 hover:bg-bone-300/40 transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── MOBILE DRAWER OVERLAY ── */}
      {mobileOpen && (
        <div
          className="overlay-backdrop lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── MOBILE DRAWER PANEL ── */}
      <aside
        className={clsx(
          "fixed top-0 right-0 bottom-0 z-50 w-72 bg-bone-100 border-l border-bone-300 flex flex-col shadow-2xl lg:hidden transition-transform duration-300",
          mobileOpen ? "translate-x-0 drawer-slide-in" : "translate-x-full",
        )}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-bone-300">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-ember-600 text-bone-100 font-mono font-black text-sm flex items-center justify-center rounded-sm">
              SO
            </div>
            <span className="font-mono font-bold text-base text-ink-900">
              SEARCHOPS
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-9 h-9 flex items-center justify-center text-ink-900 rounded-sm hover:bg-bone-300/40 transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
          <span className="px-3 py-1 font-mono text-2xs font-bold text-bone-500 uppercase tracking-widest">
            Navigation
          </span>
          {navLinks.map((link) => {
            const active = isActive(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "flex items-center justify-between gap-3 px-3 py-3 rounded-sm transition-all font-sans text-sm font-semibold",
                  active
                    ? "bg-ember-600/10 text-ember-600 border-l-4 border-ember-600 pl-2"
                    : "text-ink-900 hover:bg-bone-300/30 border-l-4 border-transparent pl-2",
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={clsx(
                      "w-4.5 h-4.5 shrink-0",
                      active ? "text-ember-600" : "text-bone-500",
                    )}
                  />
                  <span>{link.label}</span>
                </div>
                <ChevronRight
                  className={clsx(
                    "w-4 h-4 shrink-0",
                    active ? "text-ember-600" : "text-bone-400",
                  )}
                />
              </Link>
            );
          })}
        </nav>

        {/* Drawer Footer */}
        <div className="px-4 py-4 border-t border-bone-300 flex flex-col gap-2">
          {onSelectDeploy && (
            <div className="flex items-center gap-1 bg-bone-300/40 p-1 rounded-sm border border-bone-300">
              {[183, 184, 185].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    onSelectDeploy(num);
                    setMobileOpen(false);
                  }}
                  className={clsx(
                    "flex-1 py-1.5 rounded-sm font-mono text-xs font-bold uppercase transition-all",
                    currentDeployNumber === num
                      ? num === 184
                        ? "bg-ember-600 text-bone-100"
                        : "bg-patina-500 text-bone-100"
                      : "text-bone-700 hover:text-ink-900",
                  )}
                >
                  #{num}
                </button>
              ))}
            </div>
          )}
          {onTriggerPoisonedDeploy && (
            <button
              onClick={() => {
                onTriggerPoisonedDeploy?.();
                setMobileOpen(false);
              }}
              disabled={isTriggering}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-ember-600 hover:bg-ember-500 text-bone-100 rounded-sm font-mono text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-cta"
            >
              <Zap className="w-4 h-4" />
              <span>
                {isTriggering ? "SIMULATING..." : "SIMULATE POISONED DEPLOY"}
              </span>
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-bone-300 text-ink-900 hover:bg-bone-300/40 rounded-sm font-mono text-xs font-bold uppercase tracking-wider transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>SYNC_LATEST</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export const FieldManualSidebar: React.FC = () => {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    {
      href: "/regression/184",
      label: "Regression Detected",
      icon: AlertTriangle,
    },
    { href: "/geo", label: "GEO Citation Test", icon: Compass },
    { href: "/graph", label: "Crawler Topology", icon: Network },
    { href: "/remediation", label: "Remediation & Gate", icon: CheckCircle },
    { href: "/seo-advisor", label: "SEO Advisor", icon: Sparkles },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    // Extract base path without deploy number for matching
    const basePath = href.replace(/\/\d+$/, "");
    return pathname?.startsWith(basePath);
  };

  return (
    <aside className="w-64 xl:w-72 shrink-0 bg-bone-100 border-r border-bone-300 min-h-[calc(100vh-56px)] hidden xl:flex flex-col justify-between p-4">
      <div className="flex flex-col gap-6">
        {/* Navigation Section */}
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-2xs font-bold text-bone-500 uppercase tracking-widest px-3 py-1">
            Navigation
          </span>
          <nav className="flex flex-col gap-0.5">
            {links.map((link) => {
              const active = isActive(link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all font-sans text-sm font-semibold border-l-[3px]",
                    active
                      ? "border-ember-600 bg-ember-600/8 text-ink-900 shadow-sm"
                      : "border-transparent text-bone-700 hover:text-ink-900 hover:bg-bone-300/20",
                  )}
                >
                  <Icon
                    className={clsx(
                      "w-4 h-4 shrink-0",
                      active ? "text-ember-600" : "text-bone-500",
                    )}
                  />
                  <span className="truncate">{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Dual Lenses Status */}
        <div className="flex flex-col gap-3 bg-bone-300/30 p-4 rounded-sm border border-bone-300">
          <span className="font-mono text-2xs font-bold text-bone-700 uppercase tracking-widest">
            Active Lenses
          </span>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-sans text-sm font-semibold text-ink-900">
                1. Search Crawlers
              </span>
              <span className="font-mono text-2xs px-2 py-0.5 bg-patina-400/20 text-patina-600 font-bold rounded-sm border border-patina-400/30">
                ONLINE
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-sans text-sm font-semibold text-ink-900">
                2. AI Answer Engines
              </span>
              <span className="font-mono text-2xs px-2 py-0.5 bg-ember-600/15 text-ember-600 font-bold rounded-sm border border-ember-600/30">
                WATCHING
              </span>
            </div>
          </div>
        </div>

        {/* Engine Telemetry */}
        <div className="flex flex-col gap-2 font-mono text-xs text-bone-700 px-1">
          <div className="flex items-center justify-between">
            <span>ENGINE</span>
            <span className="text-ink-900 font-bold">ACTIVE (v1.0.4)</span>
          </div>
          <div className="flex items-center justify-between">
            <span>AST PARSER</span>
            <span className="text-patina-600 font-bold">0.8ms</span>
          </div>
          <div className="flex items-center justify-between">
            <span>ENVIRONMENT</span>
            <span className="text-ink-900 font-semibold">STAGING</span>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="pt-4 border-t border-bone-300">
        <button
          onClick={() => window.location.reload()}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-ember-600 hover:bg-ember-500 text-bone-100 rounded-sm font-mono text-sm font-bold uppercase tracking-wider transition-all shadow-cta"
        >
          <RefreshCw className="w-4 h-4" />
          <span>SYNC_LATEST</span>
        </button>
      </div>
    </aside>
  );
};
