import { Sparkline } from "@/components/ui/Sparkline";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataSourceDot } from "@/components/ui/DataSourceDot";
import type { NetworkSnapshot } from "@/lib/networks/metrics";
import type { TvlDataPoint } from "@/lib/types";
import { formatPct, formatUsdCompact } from "@/lib/utils";

interface NetworkPulsePanelProps {
  snapshot: NetworkSnapshot;
  tvlLabel?: string;
  tvlSeries?: TvlDataPoint[];
  tvlSeriesSource?: string | null;
}

function PulseStat({
  label,
  value,
  hint,
  dataSource,
  sourceLabel,
}: {
  label: string;
  value: string;
  hint?: string;
  dataSource?: "live" | "demo" | "derived";
  sourceLabel?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1.5 text-xs text-ink-400">
        {label}
        {dataSource && <DataSourceDot dataSource={dataSource} sourceLabel={sourceLabel} />}
      </p>
      <p className="font-display text-lg font-semibold tracking-tight text-ink-50">{value}</p>
      {hint && <p className="text-[10px] text-ink-500">{hint}</p>}
    </div>
  );
}

export function NetworkPulsePanel({
  snapshot,
  tvlLabel = "Protocol TVL",
  tvlSeries = [],
  tvlSeriesSource,
}: NetworkPulsePanelProps) {
  const up = (snapshot.weightedChange24hPct ?? 0) >= 0;
  const tvlValues = tvlSeries.map((p) => p.value);

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold text-ink-50">Network pulse</h3>
          <p className="mt-0.5 text-xs text-ink-400">
            On-chain + off-chain aggregates across member coins
          </p>
        </div>
        <Badge tone="neutral">
          {snapshot.coinsLive}/{snapshot.coinsTotal} coins live
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {snapshot.protocolTvlUsd != null && (
          <PulseStat
            label={tvlLabel}
            value={formatUsdCompact(snapshot.protocolTvlUsd)}
            dataSource="live"
            sourceLabel="DeFi Llama"
          />
        )}
        {snapshot.memberMcapUsd != null && (
          <PulseStat
            label="Member mcap total"
            value={formatUsdCompact(snapshot.memberMcapUsd)}
            dataSource="live"
            sourceLabel="CoinGecko"
          />
        )}
        {snapshot.weightedChange24hPct != null && (
          <PulseStat
            label="Weighted 24h move"
            value={formatPct(snapshot.weightedChange24hPct)}
            hint={
              snapshot.netFlow24hUsd != null
                ? `${up ? "+" : "−"}${formatUsdCompact(Math.abs(snapshot.netFlow24hUsd))} implied`
                : undefined
            }
            dataSource="derived"
            sourceLabel="Mcap-weighted"
          />
        )}
        {snapshot.fees24hUsd != null && (
          <PulseStat
            label="Fees · 24h"
            value={formatUsdCompact(snapshot.fees24hUsd)}
            dataSource="live"
            sourceLabel="DeFi Llama"
          />
        )}
        {snapshot.revenue24hUsd != null && (
          <PulseStat
            label="Revenue · 24h"
            value={formatUsdCompact(snapshot.revenue24hUsd)}
            dataSource="live"
            sourceLabel="DeFi Llama"
          />
        )}
        {snapshot.topLendingApyPct != null && (
          <PulseStat
            label={`Top supply APY${snapshot.topLendingSymbol ? ` (${snapshot.topLendingSymbol})` : ""}`}
            value={`${snapshot.topLendingApyPct.toFixed(2)}%`}
            dataSource="live"
            sourceLabel="On-chain"
          />
        )}
      </div>

      {tvlValues.length >= 2 && (
        <div className="space-y-1.5 border-t border-ink-800/60 pt-4">
          <p className="flex items-center gap-1.5 text-xs text-ink-400">
            Protocol TVL · 30d
            <DataSourceDot
              dataSource="live"
              sourceLabel={tvlSeriesSource ?? "DeFi Llama"}
            />
          </p>
          <Sparkline id="network-tvl" values={tvlValues} height={48} color="#5C92FF" />
        </div>
      )}
    </Card>
  );
}
