"use client";

import { useRouter } from "next/navigation";

import { TIME_RANGES, type TimeRange } from "@/lib/networks/timeRange";
import { cn } from "@/lib/utils";

/**
 * Single persistent time-range control for the Metrics tab (CAN-61, Nansen
 * pattern: one control governs every chart and sparkline, no per-chart
 * pickers). Selection lives in the URL (?range=) via a server navigation so
 * all server-sliced series re-render.
 *
 * The target URL is built from window.location at CLICK time, not render
 * time: the sub-tab writes ?m= via history.replaceState, which render-time
 * useSearchParams snapshots can miss, silently dropping the sub-tab on a
 * range switch.
 */
export function RangeChipBar({ value }: { value: TimeRange }) {
  const router = useRouter();

  const go = (range: TimeRange) => {
    const url = new URL(window.location.href);
    url.searchParams.set("range", range);
    router.replace(`${url.pathname}?${url.searchParams.toString()}`, { scroll: false });
  };

  return (
    <div
      className="flex items-center gap-1 self-start rounded-full border border-ink-800/60 bg-ink-950/60 p-1"
      role="group"
      aria-label="Time range"
    >
      {TIME_RANGES.map((range) => {
        const isActive = range === value;
        return (
          <button
            key={range}
            type="button"
            onClick={() => go(range)}
            aria-pressed={isActive}
            className={cn(
              "rounded-full px-2.5 py-1 font-mono text-[11px] transition-colors",
              isActive
                ? "bg-electric-500/15 text-electric-300"
                : "text-ink-400 hover:text-ink-100",
            )}
          >
            {range}
          </button>
        );
      })}
    </div>
  );
}
