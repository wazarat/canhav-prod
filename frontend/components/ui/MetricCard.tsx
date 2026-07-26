"use client";

import { Info } from "lucide-react";
import { useId, type ReactNode } from "react";

import { DataSourceDot } from "@/components/ui/DataSourceDot";
import { EmptyState, type EmptyStateChip } from "@/components/ui/EmptyState";
import { Sparkline } from "@/components/ui/Sparkline";
import { Tooltip } from "@/components/ui/Tooltip";
import type { SeriesPoint } from "@/components/ui/charts/TimeSeriesAreaChart";
import { cn, formatPct, formatUsdCompact, timeAgo } from "@/lib/utils";
import type { Sourced } from "@/lib/types";

export type MetricKind = "usd" | "pct" | "count" | "date" | "text" | "ratio" | "price";

/** Direction semantics for the change bar: which way is an improvement. */
export type ChangeTone = "up-good" | "down-good" | "neutral";

export interface MetricChange {
  pct: number | null;
  tone: ChangeTone;
  /** Window label, e.g. "7d" (default) or "24h". */
  label?: string;
}

function formatValue(value: number | string | null | undefined, kind: MetricKind): string {
  if (value == null || value === "") return "—";
  switch (kind) {
    case "usd":
      return typeof value === "number" ? formatUsdCompact(value) : String(value);
    case "pct":
      return typeof value === "number" ? formatPct(value, 2) : String(value);
    case "count":
      return typeof value === "number" ? value.toLocaleString() : String(value);
    case "ratio":
      return typeof value === "number" ? `${value.toFixed(2)}×` : String(value);
    case "price":
      return typeof value === "number"
        ? value >= 1000
          ? formatUsdCompact(value)
          : `$${value.toFixed(2)}`
        : String(value);
    case "date":
    case "text":
    default:
      return String(value);
  }
}

const STALE_DEFAULT_HOURS = 48;

function isStale(iso: string, staleAfterHours: number): boolean {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return Date.now() - t > staleAfterHours * 3600_000;
}

function changeColor(pct: number, tone: ChangeTone): string {
  if (tone === "neutral") return "text-ink-300";
  const improving = tone === "up-good" ? pct >= 0 : pct <= 0;
  return improving ? "text-emerald-400" : "text-rose-400";
}

function changeBarColor(pct: number, tone: ChangeTone): string {
  if (tone === "neutral") return "bg-ink-500";
  const improving = tone === "up-good" ? pct >= 0 : pct <= 0;
  return improving ? "bg-emerald-400" : "bg-rose-400";
}

/**
 * Canonical KPI card (CAN-53) upgraded to the Token Terminal anatomy
 * (CAN-57): label + calculation tooltip, unit-formatted value, inline
 * sparkline for the selected range, change row with an improvement-colored
 * direction bar, source pill + asOf freshness (amber past the stale
 * threshold), and an optional click target for a drill-down panel.
 *
 * All rich props are optional and additive: legacy call sites that pass
 * only label/sourced/value/kind render exactly as before. Never renders a
 * bare 0 for a missing value: absent values collapse to an em dash, plus a
 * "Pending"/"Tier 2" chip when `emptyChip` is set.
 */
export function MetricCard({
  label,
  sourced,
  value,
  kind = "text",
  source,
  hint,
  info,
  series,
  seriesNote,
  change,
  asOf,
  staleAfterHours = STALE_DEFAULT_HOURS,
  emptyChip,
  onOpen,
  loading = false,
  sparklineColor = "#5C92FF",
}: {
  label: string;
  /** Live/derived sourced field: takes precedence over `value`. */
  sourced?: Sourced<number | null> | null;
  /** Curated plain value (used when `sourced` is not provided). */
  value?: number | string | null;
  kind?: MetricKind;
  /** Provenance label for a curated `value` (ignored when `sourced` is set). */
  source?: string;
  /** Optional sub-label rendered under the value. */
  hint?: ReactNode;
  /** Calculation / methodology text: renders an info affordance on the label. */
  info?: string;
  /** Range-sliced daily series for the inline sparkline (needs >= 2 points). */
  series?: SeriesPoint[] | null;
  /** Honest one-liner shown when a rich card has no series. */
  seriesNote?: string | null;
  /** Change over the active window with improvement semantics. */
  change?: MetricChange | null;
  /** ISO timestamp driving the freshness readout. */
  asOf?: string | null;
  staleAfterHours?: number;
  /** Chip for the empty state ("Pending" tier-1-expected, "Tier 2" deliberate). */
  emptyChip?: EmptyStateChip;
  /** Makes the card a button opening the drill-down panel. */
  onOpen?: () => void;
  loading?: boolean;
  sparklineColor?: string;
}) {
  const sparkId = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  if (loading) {
    return (
      <div className="animate-pulse rounded-xl border border-ink-800/60 bg-ink-900/30 p-4">
        <div className="h-3 w-20 rounded bg-ink-800/70" />
        <div className="mt-2 h-6 w-24 rounded bg-ink-800/70" />
        <div className="mt-2 h-3 w-16 rounded bg-ink-800/50" />
      </div>
    );
  }

  const raw = sourced ? sourced.value : (value ?? null);
  const hasValue = raw != null && raw !== "";
  const text = formatValue(raw, kind);
  const sourceLabel = sourced?.sourceLabel ?? source ?? null;
  const footer = hasValue ? (sourceLabel ?? "Curated") : "Pending live refresh";
  const asOfIso = asOf ?? sourced?.updatedAt ?? null;
  const stale = asOfIso != null && isStale(asOfIso, staleAfterHours);
  const sparkValues = series && series.length >= 2 ? series.map((p) => p.value) : null;
  const isRich = Boolean(info || series !== undefined || change !== undefined || asOf || onOpen);

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-ink-500">
          {label}
          {info ? (
            <Tooltip content={info} className="pointer-events-auto">
              <Info className="h-3 w-3 text-ink-600 transition-colors hover:text-ink-300" aria-label={`How ${label} is calculated`} />
            </Tooltip>
          ) : null}
        </p>
        {sourced ? (
          <DataSourceDot dataSource={sourced.dataSource} sourceLabel={sourced.sourceLabel} />
        ) : null}
      </div>

      {hasValue || !emptyChip ? (
        <p className="mt-1 font-mono text-lg tabular-nums text-ink-50">{text}</p>
      ) : (
        <div className="mt-1">
          <EmptyState title={label} compact chip={emptyChip} />
        </div>
      )}

      {hint ? <p className="mt-1 text-[11px] leading-snug text-ink-400">{hint}</p> : null}

      {sparkValues ? (
        <Sparkline id={`mc-${sparkId}`} values={sparkValues} height={28} color={sparklineColor} className="mt-2" />
      ) : isRich && seriesNote ? (
        <p className="mt-2 text-[10px] italic text-ink-600">{seriesNote}</p>
      ) : null}

      {change && change.pct != null ? (
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className={cn("h-3 w-[3px] rounded-full", changeBarColor(change.pct, change.tone))} />
          <span className={cn("font-mono text-[11px] tabular-nums", changeColor(change.pct, change.tone))}>
            {change.pct >= 0 ? "+" : ""}
            {change.pct.toFixed(2)}%
          </span>
          <span className="text-[10px] text-ink-500">{change.label ?? "7d"}</span>
        </div>
      ) : null}

      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-ink-500">
        <span>{footer}</span>
        {asOfIso ? (
          <span className={cn(stale ? "font-medium text-amber-400" : "text-ink-600")}>
            {stale ? "stale · " : ""}
            {timeAgo(asOfIso)}
          </span>
        ) : null}
      </p>
    </>
  );

  const baseClasses = "rounded-xl border border-ink-800/60 bg-ink-900/30 p-4";
  const title = sourced?.updatedAt ? `Updated ${sourced.updatedAt}` : undefined;

  if (onOpen) {
    // Overlay-button pattern: the whole card is clickable without nesting
    // interactive elements (a button inside a button is invalid HTML and a
    // hydration error). Content ignores the pointer except the Tooltip
    // trigger, which re-enables it and sits above the overlay.
    return (
      <div
        className={cn(baseClasses, "relative transition-colors focus-within:border-ink-700 hover:border-ink-700")}
        title={title}
      >
        <button
          type="button"
          onClick={onOpen}
          aria-label={`${label}: open details`}
          className="absolute inset-0 z-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-500/70"
        />
        <div className="pointer-events-none relative z-10">{body}</div>
      </div>
    );
  }

  return (
    <div className={baseClasses} title={title}>
      {body}
    </div>
  );
}
