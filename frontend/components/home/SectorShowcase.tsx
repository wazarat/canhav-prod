import type { ReactNode } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import {
  CreditGraphic,
  DerivativesGraphic,
  GovernanceGraphic,
  LiquidityGraphic,
  RwaGraphic,
  StakingGraphic,
} from "@/components/home/sectorGraphics";
import { cn } from "@/lib/utils";

export interface SectorShowcaseItem {
  /** Store sector value ("Credit", "RWA", "Other", …) — used for the /networks link. */
  sector: string;
  count: number;
  tags: string[];
}

type Tint = "blue" | "violet" | "cyan";

const TINT_CLASSES: Record<Tint, string> = {
  blue: "bg-[radial-gradient(120%_90%_at_50%_8%,rgba(61,123,255,0.22),transparent_62%)]",
  violet: "bg-[radial-gradient(120%_90%_at_50%_8%,rgba(139,92,246,0.22),transparent_62%)]",
  cyan: "bg-[radial-gradient(120%_90%_at_50%_8%,rgba(34,211,238,0.20),transparent_62%)]",
};

const SHOWCASE_CONFIG: Record<
  string,
  { title: string; description: string; tint: Tint; mwinLabel: string; graphic: ReactNode }
> = {
  Credit: {
    title: "Credit",
    description:
      "Money markets and lending books: utilization, borrow and supply APRs, collateral health and bad-debt exposure.",
    tint: "blue",
    mwinLabel: "markets · util",
    graphic: <CreditGraphic />,
  },
  Staking: {
    title: "Staking",
    description:
      "Validator and liquid-staking flows: staked supply, real yield, unstaking queues and reward curves.",
    tint: "violet",
    mwinLabel: "staking · apr",
    graphic: <StakingGraphic />,
  },
  Derivatives: {
    title: "Derivatives",
    description:
      "Perps and options venues: open interest, funding rates, basis and liquidation depth.",
    tint: "cyan",
    mwinLabel: "perps · live",
    graphic: <DerivativesGraphic />,
  },
  RWA: {
    title: "RWAs",
    description:
      "Tokenized treasuries and off-chain assets: backing, attestation cadence, issuer and custody.",
    tint: "blue",
    mwinLabel: "rwa · tvl",
    graphic: <RwaGraphic />,
  },
  Liquidity: {
    title: "Liquidity",
    description:
      "DEX pools and routing: TVL, depth at price, fees, volume and impermanent-loss exposure.",
    tint: "violet",
    mwinLabel: "tvl · 90d",
    graphic: <LiquidityGraphic />,
  },
  Other: {
    title: "Governance & Underwriting",
    description:
      "Protocol governance and on-chain cover: proposals, quorum and treasury allocation alongside cover capacity, premiums and claims history.",
    tint: "cyan",
    mwinLabel: "gov · treasury",
    graphic: <GovernanceGraphic />,
  },
};

function SectorCard({ item }: { item: SectorShowcaseItem }) {
  const config = SHOWCASE_CONFIG[item.sector];
  if (!config) return null;

  return (
    <Link
      href={`/networks?sector=${encodeURIComponent(item.sector)}`}
      className="group glass block overflow-hidden rounded-2xl border border-ink-700/60 transition-all duration-300 hover:-translate-y-1 hover:border-electric-500/50 hover:shadow-[0_30px_70px_-34px_rgba(61,123,255,0.55)]"
    >
      {/* Visual header: tinted backdrop + floating mini terminal window */}
      <div
        aria-hidden="true"
        className={cn(
          "relative h-[190px] overflow-hidden border-b border-ink-800/60 bg-ink-950/40",
          TINT_CLASSES[config.tint],
        )}
      >
        <div className="absolute -right-6 left-5 top-6 overflow-hidden rounded-t-xl border border-b-0 border-ink-700/70 bg-ink-950/90 shadow-[0_24px_50px_-24px_rgba(0,0,0,0.7)] transition-transform duration-300 group-hover:-translate-y-1">
          <div className="flex items-center gap-1.5 border-b border-ink-800/70 px-3 py-2">
            <i className="block h-2 w-2 rounded-full bg-ink-600/60" />
            <i className="block h-2 w-2 rounded-full bg-ink-600/60" />
            <i className="block h-2 w-2 rounded-full bg-ink-600/60" />
            <span className="grow" />
            <span className="font-mono text-[9px] tracking-wide text-ink-500">
              {config.mwinLabel}
            </span>
          </div>
          {config.graphic}
        </div>
        {/* fade into card body, matching the design's .show-vis::after */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink-950/90" />
      </div>

      <div className="space-y-2 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg font-semibold tracking-tight text-ink-50">
            {config.title}
          </h3>
          <Badge tone="signal">{item.count} tracked</Badge>
        </div>
        <p className="text-sm leading-relaxed text-ink-300">{config.description}</p>
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-ink-700/60 bg-ink-900/40 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.06em] text-ink-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export function SectorShowcase({ items }: { items: SectorShowcaseItem[] }) {
  const live = items.filter((item) => item.count > 0).length;
  return (
    <section className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-electric-400">
            Data taxonomy
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
            One schema across every sector.
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-ink-300 md:text-base">
            Each sector is modeled the same way, with metrics, time-series, comparison
            tables and sourced provenance, so research stays comparable across the
            ecosystem.
          </p>
        </div>
        <span className="whitespace-nowrap font-mono text-xs text-ink-400">
          {String(live).padStart(2, "0")} sectors · now live in Beta
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <SectorCard key={item.sector} item={item} />
        ))}
      </div>
    </section>
  );
}
