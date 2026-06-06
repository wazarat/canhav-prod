"use client";

import { JLP_MARKET } from "@/lib/trade/jlpMarket";
import { tradeLabel, tradePanel, tradeMuted } from "@/components/trade/tradeStyles";
import { cn } from "@/lib/utils";

const WEIGHT_COLORS: Record<string, string> = {
  SOL: "bg-[#9945FF]",
  USDC: "bg-[#2775CA]",
  BTC: "bg-[#F7931A]",
  ETH: "bg-[#627EEA]",
  USDT: "bg-[#26A17B]",
};

export function PoolCompositionBar() {
  const stablePct = JLP_MARKET.weights
    .filter((w) => w.kind === "stable")
    .reduce((s, w) => s + w.pct, 0);

  return (
    <div className={cn(tradePanel, "px-4 py-3")}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className={tradeLabel}>Pool composition</span>
        <span className={cn("text-xs", tradeMuted)}>
          {stablePct}% stables · {100 - stablePct}% volatile
        </span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-sm">
        {JLP_MARKET.weights.map((w) => (
          <div
            key={w.symbol}
            className={cn(WEIGHT_COLORS[w.symbol] ?? "bg-ink-500", "transition-all")}
            style={{ width: `${w.pct}%` }}
            title={`${w.symbol} ${w.pct}%`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {JLP_MARKET.weights.map((w) => (
          <div key={w.symbol} className="flex items-center gap-1.5 text-xs">
            <span className={cn("h-2 w-2 rounded-sm", WEIGHT_COLORS[w.symbol])} />
            <span className="text-[#A0A3AD]">{w.symbol}</span>
            <span className="font-mono tabular-nums text-[#787B87]">{w.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
