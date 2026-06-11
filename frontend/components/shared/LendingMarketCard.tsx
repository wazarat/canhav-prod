import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { DataSourceDot } from "@/components/ui/DataSourceDot";
import type { LendingMarket } from "@/lib/types";

interface LendingMarketCardProps {
  market: LendingMarket;
}

function pct(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(2)}%`;
}

/**
 * Live Aave V3 lending rates for a reserve (GHO / aUSDC / aUSDT / aWETH).
 * Supply/borrow APY + utilization, read on-chain via Alchemy by the cron and
 * read here from the store — the answer to "what's my APR under Aave?".
 */
export function LendingMarketCard({ market }: LendingMarketCardProps) {
  const symbol = market.underlyingSymbol;

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle>Aave V3 lending market</CardTitle>
          <CardDescription className="mt-1">
            {symbol ? `Live ${symbol} reserve rates` : "Live reserve rates"} on Arbitrum.
          </CardDescription>
        </div>
        <DataSourceDot dataSource="live" sourceLabel="Aave V3 · on-chain" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-ink-400">Supply APY</p>
          <p className="mt-1 font-display text-xl font-semibold text-emerald-400">
            {pct(market.supplyApyPct)}
          </p>
        </div>
        <div className="rounded-lg border border-ink-800/60 bg-ink-900/40 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-ink-400">Borrow APY</p>
          <p className="mt-1 font-display text-xl font-semibold text-ink-100">
            {pct(market.variableBorrowApyPct)}
          </p>
          <p className="mt-0.5 text-[10px] text-ink-500">Variable</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-lg border border-ink-800/60 bg-ink-900/40 px-4 py-3">
        <span className="text-xs text-ink-400">Utilization</span>
        <Badge tone="neutral">{pct(market.utilizationPct)}</Badge>
      </div>
    </Card>
  );
}
