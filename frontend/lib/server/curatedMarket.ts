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
    currentPrice: 5.12,
    priceChange24h: 6.0,
    marketCap: 730_661_168,
    marketCapRank: 207,
    totalVolume: 3_528_927,
    circulatingSupply: 320_000_000,
    totalSupply: 320_000_000,
    maxSupply: null,
    ath: null,
    atl: null,
    priceChange7d: null,
    priceChange30d: null,
    fullyDilutedValuation: 730_661_168,
    holdersCount: 64_436,
    volumeChange24h: null,
    volToMktCapRatio: null,
    liqToMktCapRatio: null,
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
  if (source === "curated" && slug === "jlp") return "CoinMarketCap · live";
  if (source === "curated") return "Market data · live";
  return "CoinGecko · live";
}
