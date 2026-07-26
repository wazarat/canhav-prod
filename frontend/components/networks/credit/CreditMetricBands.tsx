"use client";

import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";

import { Drawer } from "@/components/ui/Drawer";
import { MetricCard } from "@/components/ui/MetricCard";
import type { MetricCardModel } from "@/components/ui/MetricCardGrid";
import { SectionHeading } from "@/components/ui/SectionHeading";

// Lazy: the drill-down (and its visx chart) loads on first card open, so the
// bands add no chart weight to the route's First Load JS (MetricCardGrid
// precedent, CAN-57).
const MetricDetailPanel = dynamic(
  () => import("@/components/ui/MetricDetailPanel").then((m) => m.MetricDetailPanel),
  { loading: () => <div className="h-40 animate-pulse rounded-xl bg-ink-900/40" /> },
);

/**
 * One labelled band of metric cards. `primaryCount` caps how many cards show
 * before the tab-wide "Show all metrics" toggle reveals the rest (progressive
 * disclosure, CAN-69). Omit it to always show the whole band.
 */
export interface MetricBandModel {
  id: string;
  title: string;
  subtitle?: string | null;
  cards: MetricCardModel[];
  primaryCount?: number | null;
}

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
 * The M4 per-tag layout: labelled bands ("Shared across Credit", then the
 * tag-specific sub-groups), never one flat grid. All bands share ONE Drawer
 * and one lazy MetricDetailPanel; this component owns only the open-card and
 * show-all state. `children` renders below the bands (tag-specific charts).
 */
export function CreditMetricBands({
  bands,
  children,
}: {
  bands: MetricBandModel[];
  children?: ReactNode;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const allCards = bands.flatMap((b) => b.cards);
  const open = allCards.find((c) => c.id === openId) ?? null;
  const hiddenCount = bands.reduce((n, b) => {
    const cap = b.primaryCount ?? b.cards.length;
    return n + Math.max(0, b.cards.length - cap);
  }, 0);

  return (
    <div className="space-y-8">
      {hiddenCount > 0 ? (
        <div className="flex justify-end">
          <button
            type="button"
            aria-expanded={showAll}
            onClick={() => setShowAll((v) => !v)}
            className="rounded-full border border-ink-700/70 bg-ink-800/40 px-3 py-1 text-xs font-medium text-ink-300 transition-colors hover:border-ink-500 hover:text-ink-100"
          >
            {showAll ? "Show primary metrics" : `Show all metrics (+${hiddenCount})`}
          </button>
        </div>
      ) : null}
      {bands.map((band) => {
        const cap = showAll ? band.cards.length : (band.primaryCount ?? band.cards.length);
        const cards = band.cards.slice(0, cap);
        if (cards.length === 0) return null;
        return (
          <section key={band.id} className="space-y-4">
            <SectionHeading title={band.title} subtitle={band.subtitle ?? undefined} />
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
          </section>
        );
      })}
      {children}
      <Drawer open={open != null} onClose={() => setOpenId(null)} title={open?.label ?? ""}>
        {open ? <MetricDetailPanel card={open} /> : null}
      </Drawer>
    </div>
  );
}
