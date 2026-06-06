"use client";

import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { JLP_MARKET } from "@/lib/trade/jlpMarket";
import { cn } from "@/lib/utils";

const VOLATILE_COLORS = [
  "bg-electric-600",
  "bg-electric-500",
  "bg-electric-400",
];
const STABLE_COLORS = ["bg-signal-500", "bg-signal-400"];

export function PoolCompositionBar() {
  const stablePct = JLP_MARKET.weights
    .filter((w) => w.kind === "stable")
    .reduce((s, w) => s + w.pct, 0);
  const volatilePct = 100 - stablePct;

  let volatileIdx = 0;
  let stableIdx = 0;

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>Pool composition</CardTitle>
        <Badge tone="neutral">
          {stablePct}% stable / {volatilePct}% volatile
        </Badge>
      </div>

      <div className="flex h-3 overflow-hidden rounded-full">
        {JLP_MARKET.weights.map((w) => {
          const color =
            w.kind === "volatile"
              ? VOLATILE_COLORS[volatileIdx++ % VOLATILE_COLORS.length]
              : STABLE_COLORS[stableIdx++ % STABLE_COLORS.length];
          return (
            <div
              key={w.symbol}
              className={cn(color, "transition-all")}
              style={{ width: `${w.pct}%` }}
              title={`${w.symbol} ${w.pct}%`}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {JLP_MARKET.weights.map((w, i) => {
          const dot =
            w.kind === "volatile"
              ? VOLATILE_COLORS[i % VOLATILE_COLORS.length]
              : STABLE_COLORS[i % STABLE_COLORS.length];
          return (
            <div key={w.symbol} className="flex items-center gap-2 text-sm">
              <span className={cn("h-2 w-2 rounded-full", dot)} />
              <span className="text-ink-200">{w.symbol}</span>
              <span className="font-mono text-ink-400">{w.pct}%</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
