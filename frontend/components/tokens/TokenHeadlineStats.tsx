import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { coinIdForSlug, fetchMarketData } from "@/lib/server/coingecko";
import type { TokenProfile } from "@/lib/types";
import { formatPct, formatUsdCompact } from "@/lib/utils";

const LIVE_REVALIDATE = 300;

function changeTone(value: number | null): "positive" | "danger" | "neutral" {
  if (value === null) return "neutral";
  if (value > 0) return "positive";
  if (value < 0) return "danger";
  return "neutral";
}

/** Headline market stats row for token detail pages (price, change, mkt cap, volume). */
export async function TokenHeadlineStats({ profile }: { profile: TokenProfile }) {
  const coinId = coinIdForSlug(profile.slug);
  const data = coinId ? await fetchMarketData(coinId, LIVE_REVALIDATE) : null;

  if (!data) return null;

  const priceValue =
    data.currentPrice === null
      ? "—"
      : `$${data.currentPrice.toLocaleString(undefined, { maximumFractionDigits: data.currentPrice < 10 ? 2 : 4 })}`;

  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Price" value={priceValue} />
      <StatCard
        label="24h change"
        value={
          data.priceChange24h != null ? (
            <Badge tone={changeTone(data.priceChange24h)} className="text-base">
              {formatPct(data.priceChange24h, 2)}
            </Badge>
          ) : (
            "—"
          )
        }
      />
      <StatCard label="Market cap" value={formatUsdCompact(data.marketCap)} />
      <StatCard label="24h volume" value={formatUsdCompact(data.totalVolume)} />
    </section>
  );
}
