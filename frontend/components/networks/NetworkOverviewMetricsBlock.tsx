import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { NetworkUniversalCard } from "@/components/networks/NetworkUniversalCard";
import type { NetworkProfile } from "@/lib/types";
import { formatUsdCompact, formatUsersCompact } from "@/lib/utils";

/**
 * Tier-1 universal metrics for the Overview tab. Uses live `UniversalMetrics`
 * when cron has populated them; otherwise a consistent placeholder grid from
 * `currentScale` and portal metadata so every network has the same shape.
 */
export function NetworkOverviewMetricsBlock({ profile }: { profile: NetworkProfile }) {
  if (profile.universalMetrics) {
    return <NetworkUniversalCard universal={profile.universalMetrics} id="overview-universal" />;
  }

  const scale = profile.currentScale;
  const founded =
    profile.arbitrumPortalMetadata?.foundedDate ?? null;
  const chains = profile.arbitrumPortalMetadata?.chains ?? [];

  return (
    <section id="overview-universal" className="scroll-mt-24 space-y-4">
      <div className="border-b border-ink-800/60 pb-2">
        <h2 className="font-display text-lg font-semibold tracking-tight text-ink-50">
          Company statistics
        </h2>
        <p className="mt-1 text-sm text-ink-300">
          Cross-network snapshot · live Tier 1 fields populate on cron refresh
        </p>
      </div>
      <Card className="divide-y divide-ink-800/60">
        <div className="pb-4">
          <CardDescription>Headline scale</CardDescription>
          <CardTitle className="text-2xl">
            {scale.tvlUsd != null ? formatUsdCompact(scale.tvlUsd) : "—"}
          </CardTitle>
          <p className="mt-1 text-xs text-ink-500">Total deposits / TVL (curated snapshot)</p>
        </div>
        <div className="grid gap-0 pt-2 sm:grid-cols-2">
          <OverviewRow label="Users / depositors" value={scale.users != null ? formatUsersCompact(scale.users) : "—"} />
          <OverviewRow
            label="Market cap"
            value={scale.marketCapUsd != null ? formatUsdCompact(scale.marketCapUsd) : "—"}
          />
          <OverviewRow
            label="APR"
            value={scale.aprPct != null ? `${scale.aprPct.toFixed(2)}%` : "—"}
          />
          <OverviewRow label="Member products" value={String(profile.memberCoins.length)} />
          <OverviewRow label="Founded" value={founded ?? "—"} />
          <OverviewRow label="Chains" value={chains.length ? chains.join(", ") : "—"} />
        </div>
      </Card>
    </section>
  );
}

function OverviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-ink-800/40 py-2 sm:border-b sm:px-2">
      <span className="text-sm text-ink-300">{label}</span>
      <span className="text-right text-sm font-medium text-ink-100">{value}</span>
    </div>
  );
}
