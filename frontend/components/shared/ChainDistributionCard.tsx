import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import type { ChainDistribution } from "@/lib/types";
import { formatNumberCompact, formatUsdCompact, timeAgo } from "@/lib/utils";

interface ChainDistributionCardProps {
  distribution: ChainDistribution | null | undefined;
  /** Display symbol for supply-denominated values (e.g. "EURe"). */
  symbol?: string;
}

/**
 * Cross-chain footprint of a stablecoin (circulating supply per chain) or an
 * RWA protocol (TVL per chain). Data is written to the store by the daily cron
 * from DeFi Llama; the card self-hides when nothing has been written yet.
 */
export function ChainDistributionCard({ distribution, symbol }: ChainDistributionCardProps) {
  if (!distribution || distribution.chains.length === 0) return null;

  const total = distribution.chains.reduce((sum, c) => sum + c.value, 0);
  if (total <= 0) return null;

  const isUsd = distribution.unit === "usd";
  const format = (value: number) =>
    isUsd
      ? formatUsdCompact(value)
      : `${formatNumberCompact(value)}${symbol ? ` ${symbol}` : ""}`;

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle>Chain distribution</CardTitle>
          <CardDescription className="mt-1">
            {isUsd ? "TVL by chain" : "Circulating supply by chain"} ·{" "}
            {distribution.updatedAt ? `updated ${timeAgo(distribution.updatedAt)}` : "—"}
          </CardDescription>
        </div>
        <Badge tone="signal">DeFi Llama</Badge>
      </div>

      <div className="space-y-2.5">
        {distribution.chains.map((c) => {
          const sharePct = (c.value / total) * 100;
          const isArbitrum = c.chain.toLowerCase() === "arbitrum";
          return (
            <div key={c.chain}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className={isArbitrum ? "font-medium text-electric-400" : "text-ink-200"}>
                  {c.chain}
                </span>
                <span className="font-mono text-ink-100">
                  {format(c.value)}
                  <span className="ml-2 text-xs text-ink-400">{sharePct.toFixed(1)}%</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-800/60">
                <div
                  className={
                    isArbitrum ? "h-full rounded-full bg-electric-400" : "h-full rounded-full bg-ink-500"
                  }
                  style={{ width: `${Math.max(sharePct, 1.5)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
