"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface TabBarTab {
  id: string;
  label: string;
  /** Optional attention count rendered as a small pill after the label. */
  badge?: number;
}

interface TabBarProps {
  /** Route the tabs live on, e.g. "/agents" or "/agents/2". */
  basePath: string;
  activeTab: string;
  tabs: TabBarTab[];
  /** The tab that maps to the bare basePath (no ?tab= param). */
  defaultTab: string;
  /** Optional content pinned to the end of the bar (e.g. a CTA link). */
  trailing?: ReactNode;
  className?: string;
}

/**
 * Sticky pill tab bar driven by the `?tab=` search param — the agents-area
 * sibling of NetworkTabBar. Each pill is a real link (server navigation), so
 * only the active tab's content is rendered/fetched by the RSC page.
 */
export function TabBar({ basePath, activeTab, tabs, defaultTab, trailing, className }: TabBarProps) {
  if (tabs.length === 0) return null;

  return (
    <div className={cn("sticky top-16 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6", className)}>
      <div
        className="glass-strong flex items-center gap-1 overflow-x-auto rounded-full px-2 py-2"
        role="tablist"
        aria-label="Page sections"
      >
        {tabs.map((tab) => {
          const href = tab.id === defaultTab ? basePath : `${basePath}?tab=${tab.id}`;
          const isActive = tab.id === activeTab;

          return (
            <Link
              key={tab.id}
              href={href}
              scroll={false}
              role="tab"
              aria-selected={isActive}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "border-electric-500/50 bg-electric-500/10 text-electric-300"
                  : "border-ink-700/60 bg-ink-900/40 text-ink-300 hover:border-ink-600 hover:text-ink-100",
              )}
            >
              {tab.label}
              {typeof tab.badge === "number" && tab.badge > 0 ? (
                <span className="rounded-full bg-neon-500/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-neon-300">
                  {tab.badge}
                  <span className="sr-only"> pending</span>
                </span>
              ) : null}
            </Link>
          );
        })}
        {trailing ? <div className="ml-auto shrink-0 pl-1">{trailing}</div> : null}
      </div>
    </div>
  );
}
