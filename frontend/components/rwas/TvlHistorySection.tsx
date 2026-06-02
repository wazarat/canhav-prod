import { TvlChart } from "@/components/rwas/TvlChart";
import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { resolveTvlSeries, tvlTrend } from "@/lib/server/series";
import type { RwaProfile } from "@/lib/types";

const TREND_TONE = {
  growing: "positive",
  stable: "neutral",
  declining: "danger",
} as const;

const TREND_LABEL = {
  growing: "Growing",
  stable: "Stable",
  declining: "Declining",
} as const;

const SOURCE_LABEL: Record<string, string> = {
  dune: "Dune",
  coingecko: "CoinGecko (market cap proxy)",
};

/** TVL chart backed by the live-resolved series (Dune -> CoinGecko market cap). */
export async function TvlHistorySection({ profile }: { profile: RwaProfile }) {
  const { points, source } = await resolveTvlSeries(profile);
  const trend = tvlTrend(points);
  const sourceLabel = source ? SOURCE_LABEL[source] : "unavailable";

  const hasSeries = points.length >= 2;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Total value locked</CardTitle>
        {hasSeries && <Badge tone={TREND_TONE[trend]}>{TREND_LABEL[trend]}</Badge>}
      </div>
      <p className="mt-1 text-xs text-ink-300">
        {hasSeries
          ? `${points.length}-day series · source: ${sourceLabel}`
          : "No TVL history yet · a Dune query or CoinGecko market cap will populate this chart"}
      </p>
      <div className="mt-4">
        <TvlChart id={profile.slug} points={points} trend={trend} />
      </div>
    </Card>
  );
}
