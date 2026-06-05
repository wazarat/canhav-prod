import "server-only";

import { readSecret } from "@/lib/server/env";
import { fetchJson, sleep } from "@/lib/server/http";

/**
 * CoinGecko resolver — Arbitrum contract address + USD price.
 *
 * TS port of `backend/app/live/coingecko.py`. Token/vault addresses are not in
 * the Portal CSV, but Alchemy needs an address to read on-chain supply.
 * CoinGecko's free public API exposes, per coin:
 *   - detail_platforms["arbitrum-one"] -> { contract_address, decimal_place }
 *   - market_data.current_price.usd     -> spot price (for RWA TVL pricing)
 *
 * Fails soft: any network/lookup miss returns null rather than throwing, so the
 * cron refresh can skip that protocol and continue.
 */

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const ARBITRUM_PLATFORM = "arbitrum-one";

// Best-effort slug -> CoinGecko coin id. `null` means "no known liquid token on
// CoinGecko" (common for early-stage RWAs). This map is the single place to
// curate the mapping; keep it in sync with the Python module.
export const COINGECKO_IDS: Record<string, string | null> = {
  // Stablecoins
  ethena: "ethena-usde",
  susde: "ethena-staked-usde",
  usdtb: null,
  ena: "ethena",
  "inverse-finance": "dola-usd",
  monerium: "monerium-eur-money",
  gbpe: null,
  sky: "usds",
  susds: "susds",
  dai: "dai",
  stusds: null,
  "sky-gov": "sky",
  stably: null,
  veusd: "veusd",
  tether: "tether",
  trueusd: "true-usd",
  // USD.AI synthetic dollars (verified on CoinGecko, Arbitrum One).
  usdai: "usdai",
  susdai: "susdai",
  // CHIP (USD.AI governance token) — not listed on CoinGecko yet.
  chip: null,
  // Jupiter (Solana) — market data via CoinGecko; on-chain supply is Solana-only.
  jup: "jupiter-exchange-solana",
  jlp: "jupiter-perpetuals-liquidity-provider-token",
  jupsol: "jupiter-staked-sol",
  jupusd: "jupusd",
  jljupusd: null,
  usdpm: null,
  gho: "gho",
  sgho: null,
  usdy: "ondo-us-dollar-yield",
  "ondo-gov": "ondo-finance",
  "aave-gov": "aave",
  stkaave: "staked-aave",
  pgold: "pleasing-gold",
  ousg: "ousg",
  usdc: "usd-coin",
  usdt0: "usdt0",
  // RWAs (most have no CoinGecko-listed Arbitrum token yet). Verified via the
  // CoinGecko /search + /coins endpoints:
  //   - franklin-templeton-benji: BENJI on Arbitrum One ($1.00 NAV) -> full
  //     on-chain (Alchemy) + market data.
  //   - aryze-eusd / centrifuge: listed but NOT on Arbitrum -> market data only.
  arcton: null,
  aryze: "aryze-eusd",
  atmosphera: null,
  centrifuge: "centrifuge",
  "chateau-capital": null,
  dinari: null,
  dualmint: null,
  "estate-protocol": null,
  "florence-finance": null,
  "franklin-templeton": "franklin-templeton-benji",
};

export interface TokenResolution {
  coinId: string;
  address: string | null;
  decimals: number | null;
  priceUsd: number | null;
  source: "coingecko";
}

/**
 * Fetch JSON from CoinGecko with one 429 backoff retry. Pass `revalidate`
 * (seconds) for cached live-render reads on the detail pages; omit it for the
 * always-fresh cron path.
 */
async function getJson(url: string, revalidate?: number): Promise<any | null> {
  const headers: Record<string, string> = {
    "User-Agent": "canhav-research/1.0",
    Accept: "application/json",
  };
  const apiKey = readSecret("COINGECKO_API_KEY");
  if (apiKey) headers["x-cg-demo-api-key"] = apiKey;

  let res = await fetchJson(url, { headers, revalidate });
  if (res.status === 429) {
    await sleep(8_000); // back off once and retry
    res = await fetchJson(url, { headers, revalidate });
    if (res.status === 429) return null;
  }
  if (res.status < 200 || res.status >= 300) return null;
  return res.data;
}

/** Resolve a CoinGecko coin id to its Arbitrum address + USD price. */
export async function resolveCoin(
  coinId: string,
  revalidate?: number,
): Promise<TokenResolution | null> {
  const params = new URLSearchParams({
    localization: "false",
    tickers: "false",
    market_data: "true",
    community_data: "false",
    developer_data: "false",
    sparkline: "false",
  });
  const data = await getJson(
    `${COINGECKO_BASE}/coins/${encodeURIComponent(coinId)}?${params}`,
    revalidate,
  );
  if (!data || typeof data !== "object") return null;

  let address: string | null = null;
  let decimals: number | null = null;

  const detail = data.detail_platforms;
  const arb = detail && typeof detail === "object" ? detail[ARBITRUM_PLATFORM] : null;
  if (arb && typeof arb === "object") {
    address = (arb.contract_address || "").trim().toLowerCase() || null;
    const dp = arb.decimal_place;
    decimals = typeof dp === "number" ? dp : null;
  }
  if (address === null) {
    const platforms = data.platforms;
    if (platforms && typeof platforms === "object") {
      address = (platforms[ARBITRUM_PLATFORM] || "").trim().toLowerCase() || null;
    }
  }

  let priceUsd: number | null = null;
  const market = data.market_data;
  const cur = market && typeof market === "object" ? market.current_price : null;
  if (cur && typeof cur === "object" && typeof cur.usd === "number") {
    priceUsd = cur.usd;
  }

  return { coinId, address, decimals, priceUsd, source: "coingecko" };
}

/** Resolve via the curated COINGECKO_IDS map; null if unmapped. */
export async function resolveForSlug(
  slug: string,
  revalidate?: number,
): Promise<TokenResolution | null> {
  const coinId = COINGECKO_IDS[slug];
  if (!coinId) return null;
  return resolveCoin(coinId, revalidate);
}

/** The curated CoinGecko coin id for a slug, or null if unmapped. */
export function coinIdForSlug(slug: string): string | null {
  return COINGECKO_IDS[slug] ?? null;
}

/* -------------------------------------------------------------------------- */
/* Market data + history (detail pages)                                       */
/* -------------------------------------------------------------------------- */

export interface MarketData {
  coinId: string;
  currentPrice: number | null;
  marketCap: number | null;
  marketCapRank: number | null;
  totalVolume: number | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  ath: number | null;
  atl: number | null;
  priceChange24h: number | null;
  priceChange7d: number | null;
  priceChange30d: number | null;
  source: "coingecko";
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Rich market snapshot for a coin id (market cap, volume, ATH/ATL, changes). */
export async function fetchMarketData(
  coinId: string,
  revalidate?: number,
): Promise<MarketData | null> {
  const params = new URLSearchParams({
    localization: "false",
    tickers: "false",
    market_data: "true",
    community_data: "false",
    developer_data: "false",
    sparkline: "false",
  });
  const data = await getJson(
    `${COINGECKO_BASE}/coins/${encodeURIComponent(coinId)}?${params}`,
    revalidate,
  );
  if (!data || typeof data !== "object") return null;
  const m = data.market_data;
  if (!m || typeof m !== "object") return null;

  const usd = (obj: unknown): number | null =>
    obj && typeof obj === "object" ? num((obj as any).usd) : null;

  return {
    coinId,
    currentPrice: usd(m.current_price),
    marketCap: usd(m.market_cap),
    marketCapRank: num(data.market_cap_rank),
    totalVolume: usd(m.total_volume),
    circulatingSupply: num(m.circulating_supply),
    totalSupply: num(m.total_supply),
    maxSupply: num(m.max_supply),
    ath: usd(m.ath),
    atl: usd(m.atl),
    priceChange24h: num(m.price_change_percentage_24h),
    priceChange7d: num(m.price_change_percentage_7d),
    priceChange30d: num(m.price_change_percentage_30d),
    source: "coingecko",
  };
}

export interface ChartPoint {
  date: string; // YYYY-MM-DD
  price: number;
}

export interface MarketChart {
  /** Daily USD price series (≈1.0 for healthy stablecoins). */
  prices: ChartPoint[];
  /** Daily USD market-cap series (used as an RWA TVL proxy). */
  marketCaps: { date: string; value: number }[];
  source: "coingecko";
}

/** Keep the last observation per UTC day from CoinGecko's [ts, value] pairs. */
function dailyFromPairs(pairs: any): Map<string, number> {
  const byDate = new Map<string, number>();
  if (!Array.isArray(pairs)) return byDate;
  for (const pair of pairs) {
    if (!Array.isArray(pair) || pair.length < 2) continue;
    const ts = num(pair[0]);
    const value = num(pair[1]);
    if (ts === null || value === null) continue;
    byDate.set(new Date(ts).toISOString().slice(0, 10), value);
  }
  return byDate;
}

/**
 * Daily price + market-cap history for a coin id over `days`. CoinGecko's free
 * tier auto-selects granularity, so we downsample to one point per UTC day.
 */
export async function fetchMarketChart(
  coinId: string,
  days = 30,
  opts: { vsCurrency?: string; revalidate?: number } = {},
): Promise<MarketChart | null> {
  const { vsCurrency = "usd", revalidate } = opts;
  const params = new URLSearchParams({
    vs_currency: vsCurrency,
    days: String(days),
  });
  const data = await getJson(
    `${COINGECKO_BASE}/coins/${encodeURIComponent(coinId)}/market_chart?${params}`,
    revalidate,
  );
  if (!data || typeof data !== "object") return null;

  const prices = dailyFromPairs(data.prices);
  const caps = dailyFromPairs(data.market_caps);
  if (prices.size === 0 && caps.size === 0) return null;

  return {
    prices: Array.from(prices, ([date, price]) => ({ date, price })).sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
    marketCaps: Array.from(caps, ([date, value]) => ({ date, value })).sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
    source: "coingecko",
  };
}
