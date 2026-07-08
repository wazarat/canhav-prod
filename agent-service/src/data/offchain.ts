import type { WatchedAsset } from "../types";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

const COINGECKO_IDS: Record<string, string> = {
  susde: "ethena-staked-usde",
  susdai: "susdai",
  // Majors — L1 base assets (roadmap B1).
  eth: "ethereum",
  btc: "bitcoin",
};

export interface OffchainMarket {
  priceUsd: number | null;
  marketCapUsd: number | null;
  /** Trailing 24h price change as a fraction (e.g. -0.02 = -2%). */
  priceChange24h: number | null;
  apy: number | null;
  /** Trailing 30d price change as a fraction (majors momentum input). */
  trend30d: number | null;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** CoinGecko market data for a watched asset (free tier, read-only). */
export async function readOffchainMarket(asset: WatchedAsset): Promise<OffchainMarket> {
  const coinId = COINGECKO_IDS[asset.slug];
  if (!coinId) {
    return { priceUsd: null, marketCapUsd: null, priceChange24h: null, apy: null, trend30d: null };
  }

  type CoinDetail = {
    market_data?: {
      current_price?: { usd?: number };
      market_cap?: { usd?: number };
      price_change_percentage_24h?: number;
    };
  };

  const detail = await fetchJson<CoinDetail>(
    `${COINGECKO_BASE}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`,
  );

  const priceUsd = detail?.market_data?.current_price?.usd ?? null;
  const marketCapUsd = detail?.market_data?.market_cap?.usd ?? null;
  const priceChange24h =
    detail?.market_data?.price_change_percentage_24h != null
      ? detail.market_data.price_change_percentage_24h / 100
      : null;

  // 30d price change: APY proxy for yield-bearing stables (annualized), raw
  // momentum input for majors.
  let apy: number | null = null;
  let trend30d: number | null = null;
  type MarketChart = { prices?: [number, number][] };
  const chart = await fetchJson<MarketChart>(
    `${COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=30&interval=daily`,
  );
  const prices = chart?.prices ?? [];
  if (prices.length >= 2) {
    const first = prices[0]?.[1];
    const last = prices[prices.length - 1]?.[1];
    if (first != null && last != null && first > 0 && last > 0) {
      const growth = (last - first) / first;
      trend30d = growth;
      apy = growth * (365 / 30);
    }
  }

  return { priceUsd, marketCapUsd, priceChange24h, apy, trend30d };
}
