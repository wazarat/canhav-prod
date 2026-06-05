import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { coinIdForSlug, fetchMarketData } from "@/lib/server/coingecko";
import { resolveMarketData } from "@/lib/server/curatedMarket";
import type { RwaProfile, StablecoinProfile, TokenProfile } from "@/lib/types";
import { formatNumberCompact, formatPct, formatUsdCompact } from "@/lib/utils";

const LIVE_REVALIDATE = 300;

export function MarketStatsSkeleton() {
  return (
    <Card className="space-y-3">
      <div className="h-5 w-32 animate-pulse rounded bg-ink-800/70" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-5 animate-pulse rounded bg-ink-800/40" />
      ))}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-ink-300">{label}</span>
      <span className="text-right text-sm font-medium text-ink-100">{value}</span>
    </div>
  );
}

function changeTone(value: number | null): "positive" | "danger" | "neutral" {
  if (value === null) return "neutral";
  if (value > 0) return "positive";
  if (value < 0) return "danger";
  return "neutral";
}

function marketBadge(slug: string, source: "coingecko" | "curated"): string {
  if (source === "curated" && slug === "jlp") return "CoinMarketCap · curated demo";
  if (source === "curated") return "Curated · demo";
  return "CoinGecko · live";
}

function NoMarketCard({ message }: { message: string }) {
  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between pb-1">
        <CardTitle>Market</CardTitle>
        <Badge tone="neutral">Not listed</Badge>
      </div>
      <p className="text-sm text-ink-300">{message}</p>
    </Card>
  );
}

export async function MarketStats({
  profile,
}: {
  profile: StablecoinProfile | RwaProfile | TokenProfile;
}) {
  const isStablecoin = profile.category === "Stablecoin";
  const coinId = coinIdForSlug(profile.slug);
  const live = coinId ? await fetchMarketData(coinId, LIVE_REVALIDATE) : null;
  const data = resolveMarketData(profile.slug, live);

  if (!data) {
    if (isStablecoin) return null;
    return (
      <NoMarketCard message="This protocol has no CoinGecko-listed token, so live market data (price, market cap, volume) isn't available yet." />
    );
  }

  const badgeLabel = marketBadge(profile.slug, data.source);
  const badgeTone = data.source === "curated" ? "neutral" : "signal";

  return (
    <Card className="space-y-1 divide-y divide-ink-800/60">
      <div className="flex items-center justify-between pb-3">
        <CardTitle>Market</CardTitle>
        <Badge tone={badgeTone}>{badgeLabel}</Badge>
      </div>
      <div className="pt-1">
        <Row
          label="Price"
          value={
            data.currentPrice === null
              ? "—"
              : `$${data.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 6 })}`
          }
        />
        <Row label="Market cap" value={formatUsdCompact(data.marketCap)} />
        {data.marketCapRank != null && (
          <Row label="Rank" value={`#${data.marketCapRank}`} />
        )}
        <Row label="24h volume" value={formatUsdCompact(data.totalVolume)} />
        {data.volumeChange24h != null && (
          <Row
            label="Volume 24h change"
            value={
              <Badge tone={changeTone(data.volumeChange24h)}>
                {formatPct(data.volumeChange24h)}
              </Badge>
            }
          />
        )}
        {data.fullyDilutedValuation != null && (
          <Row label="FDV" value={formatUsdCompact(data.fullyDilutedValuation)} />
        )}
        <Row label="Circulating" value={formatNumberCompact(data.circulatingSupply)} />
        {data.totalSupply != null && (
          <Row label="Total supply" value={formatNumberCompact(data.totalSupply)} />
        )}
        {data.holdersCount != null && (
          <Row label="Holders" value={formatNumberCompact(data.holdersCount)} />
        )}
        {data.volToMktCapRatio != null && (
          <Row label="Vol / Mkt Cap" value={formatPct(data.volToMktCapRatio, 2)} />
        )}
        {data.liqToMktCapRatio != null && (
          <Row label="Liq / Mkt Cap" value={formatPct(data.liqToMktCapRatio, 2)} />
        )}
        <Row
          label="24h change"
          value={
            <Badge tone={changeTone(data.priceChange24h)}>{formatPct(data.priceChange24h)}</Badge>
          }
        />
        {data.priceChange7d != null && (
          <Row
            label="7d change"
            value={
              <Badge tone={changeTone(data.priceChange7d)}>{formatPct(data.priceChange7d)}</Badge>
            }
          />
        )}
        {data.priceChange30d != null && (
          <Row
            label="30d change"
            value={
              <Badge tone={changeTone(data.priceChange30d)}>{formatPct(data.priceChange30d)}</Badge>
            }
          />
        )}
        {(data.ath != null || data.atl != null) && (
          <Row
            label="ATH / ATL"
            value={`$${(data.ath ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} / $${(data.atl ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}`}
          />
        )}
      </div>
    </Card>
  );
}
