import { PriceHistoryChart } from "@/components/tokens/PriceHistoryChart";
import { Badge } from "@/components/ui/Badge";
import { resolvePriceSeries } from "@/lib/server/series";
import type { TokenProfile } from "@/lib/types";

const SOURCE_LABEL: Record<string, string> = {
  dune: "Dune",
  coingecko: "CoinGecko",
};

/** Price history chart backed by the live-resolved series (stored -> CoinGecko). */
export async function TokenPriceHistorySection({ profile }: { profile: TokenProfile }) {
  const { points, source } = await resolvePriceSeries(profile);
  const sourceLabel = source ? SOURCE_LABEL[source] : "unavailable";

  if (points.length < 2) {
    return (
      <PriceHistoryChart
        history={{ points: [], dataSource: "live", updatedAt: null }}
        id={profile.slug}
        title="30-day price"
      />
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-ink-300">
        {points.length}-day series · source: {sourceLabel}
      </p>
      <PriceHistoryChart
        history={{
          points,
          dataSource: "live",
          updatedAt: new Date().toISOString(),
        }}
        id={profile.slug}
        title="30-day price"
      />
      {source && (
        <div className="flex justify-end">
          <Badge tone="signal">{SOURCE_LABEL[source]} · live</Badge>
        </div>
      )}
    </div>
  );
}
