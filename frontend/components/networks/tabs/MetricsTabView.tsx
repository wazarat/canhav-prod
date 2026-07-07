"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface MetricsSubTab {
  id: string;
  label: string;
  content: ReactNode;
}

/**
 * Sub-tab shell for the Metrics tab: a pill bar [sector rollup, ...tag tabs]
 * plus the selected panel below. Content nodes are built server-side and passed
 * in as props, so this client component only owns the selected-index state.
 */
export function MetricsTabView({ tabs }: { tabs: MetricsSubTab[] }) {
  const [active, setActive] = useState(0);
  if (tabs.length === 0) return null;

  const current = tabs[Math.min(active, tabs.length - 1)];

  return (
    <div className="space-y-6 pt-6">
      {tabs.length > 1 ? (
        <div
          className="flex items-center gap-1 overflow-x-auto rounded-xl border border-ink-800/60 bg-ink-950/60 px-2 py-2"
          role="tablist"
          aria-label="Metric views"
        >
          {tabs.map((tab, i) => {
            const isActive = i === active;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(i)}
                className={cn(
                  "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "border-electric-500/50 bg-electric-500/10 text-electric-300"
                    : "border-ink-700/60 bg-ink-900/40 text-ink-300 hover:border-ink-600 hover:text-ink-100",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : null}
      <div role="tabpanel">{current.content}</div>
    </div>
  );
}
