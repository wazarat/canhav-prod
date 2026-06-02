import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { coinIdForSlug, fetchMarketData } from "@/lib/server/coingecko";
import type { RwaProfile, StablecoinProfile } from "@/lib/types";
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

/**
 * CoinGecko market snapshot (market cap, volume, ATH/ATL, price changes). Hidden
 * when the protocol has no CoinGecko-listed token.
 */
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
  profile: StablecoinProfile | RwaProfile;
}) {
  const isStablecoin = profile.category === "Stablecoin";
  const coinId = coinIdForSlug(profile.slug);

  if (!coinId) {
    if (isStablecoin) return null;
    return (
      <NoMarketCard message="This protocol has no CoinGecko-listed token, so live market data (price, market cap, volume) isn't available yet." />
    );
  }

  const data = await fetchMarketData(coinId, LIVE_REVALIDATE);
  if (!data) {
    if (isStablecoin) return null;
    return <NoMarketCard message="Market data is temporarily unavailable from CoinGecko." />;
  }

  return (
    <Card className="space-y-1 divide-y divide-ink-800/60">
      <div className="flex items-center justify-between pb-3">
        <CardTitle>Market</CardTitle>
        <Badge tone="signal">CoinGecko · live</Badge>
      </div>
      <div className="pt-1">
        <Row
          label="Price"
          value={data.currentPrice === null ? "—" : `$${data.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 6 })}`}
        />
        <Row label="Market cap" value={formatUsdCompact(data.marketCap)} />
        <Row label="Rank" value={data.marketCapRank === null ? "—" : `#${data.marketCapRank}`} />
        <Row label="24h volume" value={formatUsdCompact(data.totalVolume)} />
        <Row label="Circulating" value={formatNumberCompact(data.circulatingSupply)} />
        <Row
          label="24h change"
          value={<Badge tone={changeTone(data.priceChange24h)}>{formatPct(data.priceChange24h)}</Badge>}
        />
        <Row
          label="7d change"
          value={<Badge tone={changeTone(data.priceChange7d)}>{formatPct(data.priceChange7d)}</Badge>}
        />
        <Row
          label="30d change"
          value={<Badge tone={changeTone(data.priceChange30d)}>{formatPct(data.priceChange30d)}</Badge>}
        />
        <Row
          label="ATH / ATL"
          value={
            data.ath === null && data.atl === null
              ? "—"
              : `$${(data.ath ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} / $${(data.atl ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}`
          }
        />
      </div>
    </Card>
  );
}
