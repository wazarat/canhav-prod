import { PegVarianceChart } from "@/components/stablecoins/PegVarianceChart";
import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { pegHealth, resolvePegSeries } from "@/lib/server/series";
import type { StablecoinProfile } from "@/lib/types";

const HEALTH_TONE = {
  tight: "positive",
  watch: "warning",
  loose: "danger",
} as const;

const HEALTH_LABEL = {
  tight: "Tight peg",
  watch: "Watch",
  loose: "Loose peg",
} as const;

const SOURCE_LABEL: Record<string, string> = {
  dune: "Dune",
  coingecko: "CoinGecko",
};

/** Peg-variance chart backed by the live-resolved series (Dune -> CoinGecko). */
export async function PegHistorySection({ profile }: { profile: StablecoinProfile }) {
  const { points, source } = await resolvePegSeries(profile);
  const health = pegHealth(points);
  const sourceLabel = source ? SOURCE_LABEL[source] : "unavailable";

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Historical peg variance</CardTitle>
        <Badge tone={HEALTH_TONE[health]}>{HEALTH_LABEL[health]}</Badge>
      </div>
      <p className="mt-1 text-xs text-ink-300">
        {points.length}-day series · source: {sourceLabel}
      </p>
      <div className="mt-4">
        <PegVarianceChart id={profile.slug} points={points} pegTarget={profile.pegTarget} />
      </div>
    </Card>
  );
}
