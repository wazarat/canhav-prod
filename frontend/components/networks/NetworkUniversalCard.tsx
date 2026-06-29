import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { DataSourceDot } from "@/components/ui/DataSourceDot";
import type { Sourced, UniversalMetrics } from "@/lib/types";
import { formatNumberCompact, formatPct, formatUsdCompact, timeAgo } from "@/lib/utils";

interface NetworkUniversalCardProps {
  universal: UniversalMetrics;
  id?: string;
}

function MetricRow({
  label,
  display,
  field,
}: {
  label: string;
  display: string;
  field: Sourced<unknown>;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="flex items-center gap-2 text-sm text-ink-300">
        {label}
        <DataSourceDot dataSource={field.dataSource} sourceLabel={field.sourceLabel} />
      </span>
      <span className="text-right text-sm font-medium text-ink-100">{display}</span>
    </div>
  );
}

function ChangeRow({ label, field }: { label: string; field: Sourced<number | null> }) {
  const v = field.value;
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="flex items-center gap-2 text-sm text-ink-300">
        {label}
        <DataSourceDot dataSource={field.dataSource} sourceLabel={field.sourceLabel} />
      </span>
      <span
        className={
          v == null
            ? "text-right text-sm font-medium text-ink-500"
            : v >= 0
              ? "text-right text-sm font-medium text-emerald-400"
              : "text-right text-sm font-medium text-rose-400"
        }
      >
        {v == null ? "—" : formatPct(v)}
      </span>
    </div>
  );
}

/**
 * Tier-1 universal metrics panel — the consistent cross-network block (price,
 * market cap, FDV, TVL, trailing deltas) with per-field provenance dots. Renders
 * for every network regardless of sector; fields degrade to "—" when null.
 */
export function NetworkUniversalCard({ universal, id = "universal" }: NetworkUniversalCardProps) {
  const { identity, market, tvl } = universal;
  const price = market.priceUsd.value;
  const change24h = market.priceChangePct.d1.value;
  const perChain = tvl.perChain.value ?? [];

  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div className="border-b border-ink-800/60 pb-2">
        <h2 className="font-display text-lg font-semibold tracking-tight text-ink-50">
          Universal metrics
        </h2>
        <p className="mt-1 text-sm text-ink-300">
          Consistent cross-network snapshot · synced {timeAgo(universal.syncedAt)}
        </p>
      </div>
      <Card className="divide-y divide-ink-800/60">
        <div className="pb-4">
          <CardDescription>Price</CardDescription>
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            <CardTitle className="text-2xl">
              {price != null ? `$${price < 1 ? price.toFixed(4) : price.toFixed(2)}` : "—"}
            </CardTitle>
            {change24h != null && (
              <span className={change24h >= 0 ? "text-sm text-emerald-400" : "text-sm text-rose-400"}>
                {formatPct(change24h)} 24h
              </span>
            )}
            <DataSourceDot
              dataSource={market.priceUsd.dataSource}
              sourceLabel={market.priceUsd.sourceLabel}
            />
          </div>
        </div>
        <div className="pt-2">
          <MetricRow
            label="TVL"
            display={formatUsdCompact(tvl.tvlUsd.value)}
            field={tvl.tvlUsd}
          />
          {universal.treasuryUsd && (
            <MetricRow
              label="Treasury"
              display={formatUsdCompact(universal.treasuryUsd.value)}
              field={universal.treasuryUsd}
            />
          )}
          {identity.raises && identity.raises.value.length > 0 && (
            <MetricRow
              label="Funding rounds"
              display={`${identity.raises.value.length}${
                identity.raises.value[0]?.round ? ` · latest: ${identity.raises.value[0].round}` : ""
              }`}
              field={identity.raises}
            />
          )}
          {identity.governanceIds && identity.governanceIds.value.length > 0 && (
            <MetricRow
              label="Governance IDs"
              display={identity.governanceIds.value.slice(0, 2).join(", ")}
              field={identity.governanceIds}
            />
          )}
          <p className="py-2 text-xs uppercase tracking-wide text-ink-500">Token market (secondary)</p>
          <MetricRow
            label="Market cap"
            display={formatUsdCompact(market.marketCapUsd.value)}
            field={market.marketCapUsd}
          />
          {market.volume24hUsd != null && (
            <MetricRow
              label="Volume (24h)"
              display={formatUsdCompact(market.volume24hUsd.value)}
              field={market.volume24hUsd}
            />
          )}
          <MetricRow
            label="FDV"
            display={formatUsdCompact(market.fdvUsd.value)}
            field={market.fdvUsd}
          />
          <MetricRow
            label="Circulating supply"
            display={formatNumberCompact(market.circulatingSupply.value)}
            field={market.circulatingSupply}
          />
          <MetricRow
            label="Total supply"
            display={formatNumberCompact(market.totalSupply.value)}
            field={market.totalSupply}
          />
          {market.marketCapRank.value != null && (
            <MetricRow
              label="Market-cap rank"
              display={`#${market.marketCapRank.value}`}
              field={market.marketCapRank}
            />
          )}
          {universal.cmcId && (
            <div className="flex items-center justify-between gap-4 py-2">
              <span className="text-sm text-ink-300">CMC id</span>
              <span className="font-mono text-sm text-ink-100">{universal.cmcId}</span>
            </div>
          )}
          {universal.holderCount.value != null && (
            <MetricRow
              label="Holders"
              display={formatNumberCompact(universal.holderCount.value)}
              field={universal.holderCount}
            />
          )}
          <ChangeRow label="Price 7d" field={market.priceChangePct.d7} />
          <ChangeRow label="Price 30d" field={market.priceChangePct.d30} />
          <ChangeRow label="TVL 1d" field={tvl.tvlChangePct.d1} />
          <ChangeRow label="TVL 7d" field={tvl.tvlChangePct.d7} />
        </div>
        {perChain.length > 0 && (
          <div className="pt-4">
            <p className="text-xs uppercase tracking-wide text-ink-500">TVL by chain</p>
            <div className="mt-2 space-y-1">
              {perChain.slice(0, 5).map((row) => (
                <div
                  key={row.chain}
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <span className="text-ink-300">{row.chain}</span>
                  <span className="font-mono text-ink-100">{formatUsdCompact(row.tvlUsd)}</span>
                </div>
              ))}
            </div>
            <div className="mt-2">
              <DataSourceDot
                dataSource={tvl.perChain.dataSource}
                sourceLabel={tvl.perChain.sourceLabel}
              />
            </div>
          </div>
        )}
        {identity.tokenStandard?.value && (
          <div className="flex items-center justify-between gap-4 py-2 pt-4">
            <span className="flex items-center gap-2 text-sm text-ink-300">
              Token standard
              <DataSourceDot
                dataSource={identity.tokenStandard.dataSource}
                sourceLabel={identity.tokenStandard.sourceLabel}
              />
            </span>
            <span className="text-sm font-medium text-ink-100">{identity.tokenStandard.value}</span>
          </div>
        )}
      </Card>
    </section>
  );
}
