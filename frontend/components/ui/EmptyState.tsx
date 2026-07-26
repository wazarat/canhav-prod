import { CircleDashed } from "lucide-react";

import { cn } from "@/lib/utils";

export type EmptyStateChip = "Pending" | "Tier 2";

const CHIP_CLASSES: Record<EmptyStateChip, string> = {
  Pending: "border-ink-700/70 bg-ink-800/40 text-ink-300",
  "Tier 2": "border-amber-500/40 bg-amber-500/10 text-amber-300",
};

/**
 * Honest empty state (never a fabricated value, never a bare 0). The compact
 * variant fits inside a MetricCard body; the default variant replaces a
 * whole panel. "Pending" = Tier 1 value expected on a future refresh;
 * "Tier 2" = needs a paid/curated source and stays null deliberately.
 */
export function EmptyState({
  title,
  note,
  chip,
  compact = false,
  className,
}: {
  title: string;
  note?: string;
  chip?: EmptyStateChip;
  compact?: boolean;
  className?: string;
}) {
  const chipEl = chip ? (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none",
        CHIP_CLASSES[chip],
      )}
    >
      {chip}
    </span>
  ) : null;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <p className="font-mono text-lg tabular-nums text-ink-500">—</p>
        {chipEl}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid place-items-center gap-2 rounded-xl border border-dashed border-ink-800/60 bg-ink-900/20 px-6 py-10 text-center",
        className,
      )}
    >
      <CircleDashed className="h-6 w-6 text-ink-600" aria-hidden />
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-ink-300">{title}</p>
        {chipEl}
      </div>
      {note ? <p className="max-w-prose text-xs text-ink-400">{note}</p> : null}
    </div>
  );
}
