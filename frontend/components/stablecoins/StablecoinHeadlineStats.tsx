import { StatCard } from "@/components/ui/StatCard";
import { coinIdForSlug, fetchMarketData } from "@/lib/server/coingecko";
import { latestPrice, pegDeviationBps, pegHealth, resolvePegSeries } from "@/lib/server/series";
import type { StablecoinProfile } from "@/lib/types";
import { formatPeg, formatUsdCompact } from "@/lib/utils";

const LIVE_REVALIDATE = 300;

const HEALTH_LABEL = {
  tight: "Tight peg",
  watch: "Watch",
  loose: "Loose peg",
} as const;

/** Live headline stats: latest peg, deviation, market cap, peg health. */
export async function StablecoinHeadlineStats({ profile }: { profile: StablecoinProfile }) {
  const coinId = coinIdForSlug(profile.slug);
  const [{ points }, market] = await Promise.all([
    resolvePegSeries(profile),
    coinId ? fetchMarketData(coinId, LIVE_REVALIDATE) : Promise.resolve(null),
  ]);

  const latest = latestPrice(points);
  const bps = pegDeviationBps(points);
  const health = pegHealth(points);
  const symbol = profile.pegTarget === "EUR" ? "€" : "$";

  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Latest peg" value={latest === null ? "—" : `${symbol}${formatPeg(latest)}`} />
      <StatCard label="Deviation" value={bps === null ? "—" : `${bps} bps`} />
      <StatCard label="Market cap" value={formatUsdCompact(market?.marketCap ?? null)} />
      <StatCard label="Peg health" value={HEALTH_LABEL[health]} />
    </section>
  );
}
