"use client";

import { useState, type ReactNode } from "react";

import { RangeChipBar } from "@/components/ui/RangeChipBar";
import type { TimeRange } from "@/lib/networks/timeRange";
import { cn } from "@/lib/utils";

export interface MetricsSubTab {
  id: string;
  label: string;
  content: ReactNode;
}

/** Shallow ?m= sync so range Link navigations preserve the active sub-tab. */
function writeSubTabParam(id: string, isDefault: boolean) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (isDefault) url.searchParams.delete("m");
  else url.searchParams.set("m", id);
  window.history.replaceState(window.history.state, "", url.toString());
}

/**
 * Sub-tab shell for the Metrics tab: the shared time-range chip bar, a pill
 * bar [sector rollup, ...tag tabs], and the selected panel below. Content
 * nodes are built server-side and passed in as props; this client component
 * owns only the selected-tab state, keyed by stable tab id (not index) and
 * mirrored into ?m= so range switches and deep links restore it (CAN-61).
 */
export function MetricsTabView({
  tabs,
  initialTabId,
  range,
}: {
  tabs: MetricsSubTab[];
  /** Validated ?m= value from the server; falls back to the first tab. */
  initialTabId?: string;
  range: TimeRange;
}) {
  const [activeId, setActiveId] = useState<string>(() => {
    if (initialTabId && tabs.some((t) => t.id === initialTabId)) return initialTabId;
    return tabs[0]?.id ?? "";
  });
  if (tabs.length === 0) return null;

  const current = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <div className="space-y-6 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {tabs.length > 1 ? (
          <div
            className="flex items-center gap-1 overflow-x-auto rounded-xl border border-ink-800/60 bg-ink-950/60 px-2 py-2"
            role="tablist"
            aria-label="Metric views"
          >
            {tabs.map((tab) => {
              const isActive = tab.id === current.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveId(tab.id);
                    writeSubTabParam(tab.id, tab.id === tabs[0].id);
                  }}
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
        ) : (
          <span />
        )}
        <RangeChipBar value={range} />
      </div>
      <div role="tabpanel">{current.content}</div>
    </div>
  );
}
