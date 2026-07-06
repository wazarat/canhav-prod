import type { ReactNode } from "react";

import { DataSourceDot } from "@/components/ui/DataSourceDot";
import { formatPct, formatUsdCompact } from "@/lib/utils";
import type { Sourced } from "@/lib/types";

export type MetricKind = "usd" | "pct" | "count" | "date" | "text";

function formatValue(value: number | string | null | undefined, kind: MetricKind): string {
  if (value == null || value === "") return "—";
  switch (kind) {
    case "usd":
      return typeof value === "number" ? formatUsdCompact(value) : String(value);
    case "pct":
      return typeof value === "number" ? formatPct(value, 2) : String(value);
    case "count":
      return typeof value === "number" ? value.toLocaleString() : String(value);
    case "date":
    case "text":
    default:
      return String(value);
  }
}

/**
 * Reusable KPI card for the Metrics sub-tabs. Renders a label, a formatted value
 * (tabular-nums), and a provenance footer. Accepts either a `Sourced<>` field
 * (shows the live/derived source dot + label) or a plain curated `value` with an
 * optional `source` string. Never renders a bare `0` for a missing value — an
 * absent/nullish value collapses to an em-dash with a "Not yet collected" note.
 */
export function MetricCard({
  label,
  sourced,
  value,
  kind = "text",
  source,
  hint,
}: {
  label: string;
  /** Live/derived sourced field — takes precedence over `value`. */
  sourced?: Sourced<number | null> | null;
  /** Curated plain value (used when `sourced` is not provided). */
  value?: number | string | null;
  kind?: MetricKind;
  /** Provenance label for a curated `value` (ignored when `sourced` is set). */
  source?: string;
  /** Optional sub-label rendered under the value. */
  hint?: ReactNode;
}) {
  const raw = sourced ? sourced.value : (value ?? null);
  const hasValue = raw != null && raw !== "";
  const text = formatValue(raw, kind);
  const sourceLabel = sourced?.sourceLabel ?? source ?? null;
  const footer = hasValue
    ? (sourceLabel ?? "Curated")
    : "Not yet collected";

  return (
    <div
      className="rounded-xl border border-ink-800/60 bg-ink-900/30 p-4"
      title={sourced?.updatedAt ? `Updated ${sourced.updatedAt}` : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-ink-500">{label}</p>
        {sourced ? (
          <DataSourceDot dataSource={sourced.dataSource} sourceLabel={sourced.sourceLabel} />
        ) : null}
      </div>
      <p className="mt-1 font-mono text-lg tabular-nums text-ink-50">{text}</p>
      {hint ? (
        <p className="mt-1 text-[11px] leading-snug text-ink-400">{hint}</p>
      ) : null}
      <p className="mt-1 text-[10px] text-ink-500">{footer}</p>
    </div>
  );
}
