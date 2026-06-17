import { TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { TvlFlow } from "@/lib/networks/metrics";
import { cn, formatPct, formatUsdCompact } from "@/lib/utils";

/**
 * 24h value-flow widget. The aggregate move is a market-cap-weighted roll-up of
 * the network's member coins' live 24h price changes (real CoinGecko data) — we
 * have no entity-level TVL time series, so this is the honest derivation. When
 * no member reports live market data the widget shows an explicit empty state.
 */
export function TvlFlowWidget({ flow }: { flow: TvlFlow }) {
  if (!flow.hasData) {
    return (
      <Card className="flex h-full flex-col gap-2 p-5">
        <Header />
        <p className="mt-2 text-sm text-ink-400">
          No live 24h market data for this network&apos;s coins yet — the value flow will
          appear once a member coin is tracked.
        </p>
      </Card>
    );
  }

  const up = (flow.change24hPct ?? 0) >= 0;
  const tone = flow.change24hPct == null ? "neutral" : up ? "positive" : "danger";
  const barColor = up ? "bg-emerald-500/70" : "bg-rose-500/70";
  const maxValue = Math.max(...flow.contributions.map((c) => c.valueUsd ?? 0), 1);
  const withValue = flow.contributions.filter((c) => c.valueUsd != null && c.valueUsd > 0);

  return (
    <Card className="flex h-full flex-col gap-4 p-5">
      <Header />
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-display text-2xl font-semibold tracking-tight text-ink-50">
          {formatUsdCompact(flow.totalUsd)}
        </span>
        {flow.change24hPct != null && (
          <Badge tone={tone}>
            {up ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {formatPct(flow.change24hPct)} 24h
          </Badge>
        )}
      </div>
      {flow.netFlow24hUsd != null && (
        <p className="-mt-2 text-xs text-ink-400">
          {up ? "+" : "−"}
          {formatUsdCompact(Math.abs(flow.netFlow24hUsd))} implied net flow over 24h
        </p>
      )}

      <div className="space-y-2">
        {withValue.map((c) => {
          const pct = ((c.valueUsd ?? 0) / maxValue) * 100;
          return (
            <div key={c.slug} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-mono text-ink-200">{c.symbol}</span>
                <span className="flex items-center gap-2 text-ink-400">
                  <span className="font-mono text-ink-200">
                    {formatUsdCompact(c.valueUsd)}
                  </span>
                  {c.change24hPct != null && (
                    <span
                      className={
                        c.change24hPct >= 0 ? "text-emerald-400" : "text-rose-400"
                      }
                    >
                      {formatPct(c.change24hPct)}
                    </span>
                  )}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-800/70">
                <div
                  className={cn("h-full rounded-full", barColor)}
                  style={{ width: `${Math.max(pct, 3)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Header() {
  return (
    <div className="space-y-0.5">
      <h3 className="text-sm font-semibold text-ink-100">Value flow (24h)</h3>
      <p className="text-xs text-ink-500">Market-cap-weighted move across member coins</p>
    </div>
  );
}
