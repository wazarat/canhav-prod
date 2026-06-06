import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { DataSourceDot } from "@/components/ui/DataSourceDot";
import type { TokenMarket } from "@/lib/types";
import { formatPct, formatUsdCompact } from "@/lib/utils";

interface EntityMarketCardProps {
  market: TokenMarket;
  symbol: string;
  id?: string;
}

function MarketRow({
  label,
  value,
  dataSource,
  sourceLabel,
}: {
  label: string;
  value: string;
  dataSource: "live" | "demo" | "derived";
  sourceLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="flex items-center gap-2 text-sm text-ink-300">
        {label}
        <DataSourceDot dataSource={dataSource} sourceLabel={sourceLabel} />
      </span>
      <span className="text-right text-sm font-medium text-ink-100">{value}</span>
    </div>
  );
}

export function EntityMarketCard({
  market,
  symbol,
  id = "market",
}: EntityMarketCardProps) {
  const price = market.priceUsd.value;
  const change = market.change24hPct?.value;

  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div className="border-b border-ink-800/60 pb-2">
        <h2 className="font-display text-lg font-semibold tracking-tight text-ink-50">
          {symbol} market
        </h2>
        <p className="mt-1 text-sm text-ink-300">Governance token snapshot</p>
      </div>
      <Card className="divide-y divide-ink-800/60">
        <div className="pb-4">
          <CardDescription>Price</CardDescription>
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            <CardTitle className="text-2xl">
              {price != null ? `$${price.toFixed(2)}` : "—"}
            </CardTitle>
            {change != null && (
              <span
                className={
                  change >= 0 ? "text-sm text-emerald-400" : "text-sm text-rose-400"
                }
              >
                {formatPct(change)} 24h
              </span>
            )}
            <DataSourceDot
              dataSource={market.priceUsd.dataSource}
              sourceLabel={market.priceUsd.sourceLabel}
            />
          </div>
        </div>
        <div className="pt-2">
          <MarketRow
            label="Market cap"
            value={formatUsdCompact(market.marketCapUsd.value)}
            dataSource={market.marketCapUsd.dataSource}
            sourceLabel={market.marketCapUsd.sourceLabel}
          />
          {market.high52w && (
            <MarketRow
              label="52w high"
              value={market.high52w.value != null ? `$${market.high52w.value.toFixed(2)}` : "—"}
              dataSource={market.high52w.dataSource}
            />
          )}
          {market.low52w && (
            <MarketRow
              label="52w low"
              value={market.low52w.value != null ? `$${market.low52w.value.toFixed(2)}` : "—"}
              dataSource={market.low52w.dataSource}
            />
          )}
          {market.maxSupply && (
            <MarketRow
              label="Max supply"
              value={
                market.maxSupply.value != null
                  ? market.maxSupply.value.toLocaleString()
                  : "Uncapped"
              }
              dataSource={market.maxSupply.dataSource}
            />
          )}
        </div>
      </Card>
    </section>
  );
}
