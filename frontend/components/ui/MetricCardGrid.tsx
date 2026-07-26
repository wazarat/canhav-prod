"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { Drawer } from "@/components/ui/Drawer";
import type { EmptyStateChip } from "@/components/ui/EmptyState";
import { MetricCard, type MetricChange, type MetricKind } from "@/components/ui/MetricCard";
import type { SeriesPoint, SeriesUnit } from "@/components/ui/charts/TimeSeriesAreaChart";

// Lazy: the drill-down (and its visx chart) loads on first card open, so the
// grid itself adds no chart weight to the route's First Load JS.
const MetricDetailPanel = dynamic(
  () => import("@/components/ui/MetricDetailPanel").then((m) => m.MetricDetailPanel),
  { loading: () => <div className="h-40 animate-pulse rounded-xl bg-ink-900/40" /> },
);

/**
 * Fully serializable card model: assembled on the server (e.g.
 * lib/networks/creditRollup.ts), rendered by this client grid. Keep it
 * JSON-safe: it crosses the RSC boundary.
 */
export interface MetricCardModel {
  id: string;
  label: string;
  kind: MetricKind;
  /** Chart tick/axis formatting for the drill-down. */
  unit: SeriesUnit;
  value: number | string | null;
  dataSource: "live" | "demo" | "derived" | null;
  sourceLabel: string | null;
  sourceUrl: string | null;
  asOf: string | null;
  /** Range-sliced series for the inline sparkline. */
  series: SeriesPoint[] | null;
  /** Full-window series (90d) for the drill-down chart. */
  fullSeries: SeriesPoint[] | null;
  seriesNote: string | null;
  change: MetricChange | null;
  /** Plain-language methodology; feeds the info tooltip and the drill-down. */
  calculation: string;
  caveats: string[];
  emptyChip: EmptyStateChip | null;
  hint: string | null;
}

/** Split a card model into MetricCard's sourced/value prop pair. */
function cardValueProps(card: MetricCardModel) {
  if (card.dataSource && typeof card.value !== "string") {
    return {
      sourced: {
        value: card.value,
        dataSource: card.dataSource,
        sourceLabel: card.sourceLabel ?? undefined,
        updatedAt: card.asOf,
      },
    } as const;
  }
  return { value: card.value, source: card.sourceLabel ?? undefined } as const;
}

/**
 * Client grid of rich MetricCards sharing ONE Drawer for drill-downs
 * (CAN-57). The server assembles MetricCardModel[]; this component owns only
 * the open-card state.
 */
export function MetricCardGrid({ cards }: { cards: MetricCardModel[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = cards.find((c) => c.id === openId) ?? null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((card) => (
          <MetricCard
            key={card.id}
            label={card.label}
            kind={card.kind}
            {...cardValueProps(card)}
            hint={card.hint}
            info={card.calculation}
            series={card.series}
            seriesNote={card.seriesNote}
            change={card.change}
            asOf={card.asOf}
            emptyChip={card.emptyChip ?? undefined}
            onOpen={() => setOpenId(card.id)}
          />
        ))}
      </div>
      <Drawer open={open != null} onClose={() => setOpenId(null)} title={open?.label ?? ""}>
        {open ? <MetricDetailPanel card={open} /> : null}
      </Drawer>
    </>
  );
}
