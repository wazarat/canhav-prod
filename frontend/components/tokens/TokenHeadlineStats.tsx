import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { coinIdForSlug, fetchMarketData } from "@/lib/server/coingecko";
import type { TokenProfile } from "@/lib/types";
import { formatNumberCompact, formatPct, formatUsdCompact } from "@/lib/utils";

const LIVE_REVALIDATE = 300;

function changeTone(value: number | null): "positive" | "danger" | "neutral" {
  if (value === null) return "neutral";
  if (value > 0) return "positive";
  if (value < 0) return "danger";
  return "neutral";
}

/**
 * Headline market stats row for token detail pages (price, change, mkt cap,
 * volume, FDV, circulating). Live CoinGecko first; falls back to the
 * cron-written `profile.market` block so the row survives an upstream miss.
 */
export async function TokenHeadlineStats({ profile }: { profile: TokenProfile }) {
  const coinId = coinIdForSlug(profile.slug);
  const data = coinId ? await fetchMarketData(coinId, LIVE_REVALIDATE) : null;

  const stored = profile.market;
  const price = data?.currentPrice ?? stored?.priceUsd?.value ?? null;
  const change24h = data?.priceChange24h ?? stored?.change24hPct?.value ?? null;
  const marketCap = data?.marketCap ?? stored?.marketCapUsd?.value ?? null;
  const volume = data?.totalVolume ?? stored?.volume24hUsd?.value ?? null;
  const fdv = data?.fullyDilutedValuation ?? stored?.fdvUsd?.value ?? null;
  const circulating = data?.circulatingSupply ?? stored?.circulatingSupply?.value ?? null;

  if (price === null && marketCap === null) return null;

  const priceValue =
    price === null
      ? "—"
      : `$${price.toLocaleString(undefined, { maximumFractionDigits: price < 10 ? 2 : 4 })}`;

  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Price" value={priceValue} />
      <StatCard
        label="24h change"
        value={
          change24h != null ? (
            <Badge tone={changeTone(change24h)} className="text-base">
              {formatPct(change24h, 2)}
            </Badge>
          ) : (
            "—"
          )
        }
      />
      <StatCard label="Market cap" value={formatUsdCompact(marketCap)} />
      <StatCard label="24h volume" value={formatUsdCompact(volume)} />
      {fdv != null && <StatCard label="FDV" value={formatUsdCompact(fdv)} />}
      {circulating != null && (
        <StatCard label="Circulating" value={formatNumberCompact(circulating)} />
      )}
    </section>
  );
}
