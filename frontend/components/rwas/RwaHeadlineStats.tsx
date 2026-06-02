import { StatCard } from "@/components/ui/StatCard";
import { changePct, latestValue, resolveTvlSeries, tvlTrend } from "@/lib/server/series";
import type { RwaProfile } from "@/lib/types";
import { formatPct, formatUsdCompact } from "@/lib/utils";

const TREND_LABEL = {
  growing: "Growing",
  stable: "Stable",
  declining: "Declining",
} as const;

/** Live headline stats: TVL, 30d change, asset class, trend. */
export async function RwaHeadlineStats({ profile }: { profile: RwaProfile }) {
  const { points } = await resolveTvlSeries(profile);
  const tvl = latestValue(points);
  const pct = changePct(points);
  const trend = tvlTrend(points);

  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="TVL" value={formatUsdCompact(tvl)} />
      <StatCard label="30d change" value={formatPct(pct)} />
      <StatCard label="Asset class" value={profile.assetClass} />
      <StatCard label="Trend" value={TREND_LABEL[trend]} />
    </section>
  );
}
