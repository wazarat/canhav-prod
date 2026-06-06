import { DataSourceDot } from "@/components/ui/DataSourceDot";
import { StatCard } from "@/components/ui/StatCard";
import type { TokenProfile } from "@/lib/types";
import { formatPct, formatUsdCompact, formatUsersCompact } from "@/lib/utils";

interface TokenHeroStatsProps {
  profile: TokenProfile;
}

function SourcedStat({
  label,
  value,
  hint,
  dataSource,
  sourceLabel,
}: {
  label: string;
  value: string;
  hint?: string;
  dataSource: "live" | "demo" | "derived";
  sourceLabel?: string;
}) {
  return (
    <div className="glass relative rounded-2xl px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-300">{label}</p>
        <DataSourceDot dataSource={dataSource} sourceLabel={sourceLabel} />
      </div>
      <div className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink-50">
        {value}
      </div>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

export function TokenHeroStats({ profile }: TokenHeroStatsProps) {
  const market = profile.market;
  const pool = profile.poolComposition;
  const yieldM = profile.yieldMechanics;

  if (!market) {
    return (
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Price" value="—" />
      </section>
    );
  }

  const price = market.priceUsd.value;
  const change = market.change24hPct?.value;

  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      <SourcedStat
        label="Price"
        value={price != null ? `$${price.toFixed(2)}` : "—"}
        hint={change != null ? `${formatPct(change)} 24h` : undefined}
        dataSource={market.priceUsd.dataSource}
        sourceLabel={market.priceUsd.sourceLabel}
      />
      {market.marketCapUsd && (
        <SourcedStat
          label="Market cap"
          value={formatUsdCompact(market.marketCapUsd.value)}
          dataSource={market.marketCapUsd.dataSource}
          sourceLabel={market.marketCapUsd.sourceLabel}
        />
      )}
      {pool && (
        <SourcedStat
          label="Pool AUM"
          value={formatUsdCompact(pool.aumUsd)}
          hint={`${pool.utilizationPct.toFixed(1)}% of cap`}
          dataSource={pool.dataSource}
        />
      )}
      {yieldM && (
        <SourcedStat
          label="Current APY"
          value={`${yieldM.currentApyPct.toFixed(1)}%`}
          hint={
            yieldM.apy30dPct != null
              ? `30d avg ${yieldM.apy30dPct.toFixed(1)}%`
              : undefined
          }
          dataSource={yieldM.dataSource}
        />
      )}
      {market.holders && (
        <SourcedStat
          label="Holders"
          value={formatUsersCompact(market.holders.value)}
          dataSource={market.holders.dataSource}
          sourceLabel={market.holders.sourceLabel}
        />
      )}
      {market.volume24hUsd && (
        <SourcedStat
          label="24h volume"
          value={formatUsdCompact(market.volume24hUsd.value)}
          dataSource={market.volume24hUsd.dataSource}
        />
      )}
    </section>
  );
}
