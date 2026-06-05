import "server-only";

import type { MarketData } from "@/lib/server/coingecko";

/** Partial market snapshot keyed by protocol slug — demo-pinned values. */
type CuratedSnapshot = Partial<Omit<MarketData, "coinId" | "source">> & {
  coinId?: string;
};

/**
 * Curated demo snapshots (Phantom for jlJUPUSD, CoinMarketCap for JLP).
 * When a slug is present here, curated values take precedence over live CoinGecko.
 */
export const CURATED_MARKET: Record<string, CuratedSnapshot> = {
  jljupusd: {
    coinId: "jljupusd",
    currentPrice: 1.01,
    priceChange24h: -0.54,
    marketCap: 78_000_000,
    marketCapRank: null,
    totalVolume: null,
    circulatingSupply: null,
    totalSupply: null,
    maxSupply: null,
    ath: null,
    atl: null,
    priceChange7d: null,
    priceChange30d: null,
  },
  jlp: {
    coinId: "jupiter-perpetuals-liquidity-provider-token",
    currentPrice: 3.22,
    priceChange24h: -4.93,
    marketCap: 716_030_000,
    marketCapRank: 207,
    totalVolume: 15_310_000,
    circulatingSupply: 221_970_000,
    totalSupply: 221_970_000,
    maxSupply: null,
    ath: null,
    atl: null,
    priceChange7d: null,
    priceChange30d: null,
    fullyDilutedValuation: 716_030_000,
    holdersCount: 64_050,
    volumeChange24h: 73.95,
    volToMktCapRatio: 2.13,
    liqToMktCapRatio: 0.98,
  },
};

/** Merge curated demo snapshot over live CoinGecko data when available. */
export function resolveMarketData(slug: string, live: MarketData | null): MarketData | null {
  const curated = CURATED_MARKET[slug];
  if (!curated) return live;

  const base: MarketData = live ?? {
    coinId: curated.coinId ?? slug,
    currentPrice: null,
    marketCap: null,
    marketCapRank: null,
    totalVolume: null,
    circulatingSupply: null,
    totalSupply: null,
    maxSupply: null,
    ath: null,
    atl: null,
    priceChange24h: null,
    priceChange7d: null,
    priceChange30d: null,
    source: "coingecko",
  };

  return {
    ...base,
    ...curated,
    coinId: curated.coinId ?? base.coinId,
    source: "curated",
  };
}

/** Badge label for the market data source. */
export function marketSourceBadge(slug: string, source: MarketData["source"]): string {
  if (source === "curated" && slug === "jlp") return "CoinMarketCap · curated demo";
  if (source === "curated") return "Curated · demo";
  return "CoinGecko · live";
}
