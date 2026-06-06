"use client";

import { StatCard } from "@/components/ui/StatCard";
import { JLP_MARKET } from "@/lib/trade/jlpMarket";
import { formatNumberCompact, formatUsdCompact } from "@/lib/utils";

export function MarketStatsRow() {
  const utilPct = (JLP_MARKET.aumUsd / JLP_MARKET.aumCapUsd) * 100;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="glass rounded-2xl px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-300">Market cap</p>
        <div className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink-50">
          {formatUsdCompact(JLP_MARKET.marketCapUsd)}
        </div>
        <p className="mt-1 text-xs text-ink-500">
          {utilPct.toFixed(1)}% of {formatUsdCompact(JLP_MARKET.aumCapUsd)} cap
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-800">
          <div
            className="h-full rounded-full bg-electric-500"
            style={{ width: `${utilPct}%` }}
          />
        </div>
      </div>
      <StatCard
        label="Yield"
        value={`${JLP_MARKET.apyPct.toFixed(2)}%`}
        hint="Real-yield from perp fees"
      />
      <StatCard label="24h volume" value={formatUsdCompact(JLP_MARKET.volume24hUsd)} />
      <StatCard label="Holders" value={formatNumberCompact(JLP_MARKET.holders)} />
    </div>
  );
}
