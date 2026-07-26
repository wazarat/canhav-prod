"use client";

import { ArrowUpRight } from "lucide-react";

import { DataSourceDot } from "@/components/ui/DataSourceDot";
import { EmptyState } from "@/components/ui/EmptyState";
import type { MetricCardModel } from "@/components/ui/MetricCardGrid";
import { TimeSeriesAreaChart } from "@/components/ui/charts/TimeSeriesAreaChart";
import { timeAgo } from "@/lib/utils";

/**
 * Drill-down body rendered inside the shared Drawer (CAN-57 anatomy item 6):
 * full time series with axes, the calculation, the source with a link, and
 * caveats. Summary on the surface, depth on demand.
 */
export function MetricDetailPanel({ card }: { card: MetricCardModel }) {
  return (
    <div className="space-y-5">
      {card.fullSeries && card.fullSeries.length >= 2 ? (
        <TimeSeriesAreaChart
          points={card.fullSeries}
          id={`detail-${card.id}`}
          height={240}
          unit={card.unit}
          showAxes
          ariaLabel={`${card.label} full history`}
        />
      ) : (
        <EmptyState
          title="No time series for this metric"
          note={card.seriesNote ?? "No daily history is tracked from the current sources."}
          chip={card.emptyChip ?? undefined}
        />
      )}

      <section className="space-y-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Calculation</h3>
        <p className="text-sm leading-relaxed text-ink-300">{card.calculation}</p>
      </section>

      <section className="space-y-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Source</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-300">
          {card.dataSource ? (
            <DataSourceDot dataSource={card.dataSource} sourceLabel={card.sourceLabel ?? undefined} />
          ) : null}
          <span>{card.sourceLabel ?? "Curated"}</span>
          {card.sourceUrl ? (
            <a
              href={card.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-electric-400 underline-offset-2 hover:underline"
            >
              endpoint <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          ) : null}
          {card.asOf ? <span className="text-xs text-ink-500">as of {timeAgo(card.asOf)}</span> : null}
        </div>
      </section>

      {card.caveats.length > 0 ? (
        <section className="space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Caveats</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-400">
            {card.caveats.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
