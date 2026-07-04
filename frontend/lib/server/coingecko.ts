import "server-only";

import {
  COINGECKO_IDS,
  NETWORK_COINGECKO_IDS,
  coinIdForNetworkSlug,
  coinIdForSlug,
} from "@/lib/coingeckoIds";
import { fetchLlamaProtocolMeta } from "@/lib/server/defillama";
import { readSecret } from "@/lib/server/env";
import { fetchJson, sleep } from "@/lib/server/http";

export {
  COINGECKO_IDS,
  NETWORK_COINGECKO_IDS,
  coinIdForNetworkSlug,
  coinIdForSlug,
};

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

export interface TokenResolution {
  coinId: string;
  address: string | null;
  decimals: number | null;
  priceUsd: number | null;
  /** Market fields parsed from the same /coins/{id} payload (no extra call). */
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  change24hPct: number | null;
  fdvUsd: number | null;
  circulatingSupply: number | null;
  /** Total supply in token units (named to avoid clashing with the store's TotalSupply). */
  totalSupplyUnits: number | null;
  maxSupply: number | null;
  /** Trailing 7d/30d price change (%) — same payload, promoted for universals. */
  priceChange7dPct: number | null;
  priceChange30dPct: number | null;
  /** CoinGecko market-cap rank (top-level `market_cap_rank`). */
  marketCapRank: number | null;
  /** Full chain→contract-address map (`platforms`) for universal contracts[]. */
  platforms: Record<string, string>;
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
  // Full chain→address map (universal contracts[]); also the Arbitrum fallback.
  const platforms: Record<string, string> = {};
  const rawPlatforms = data.platforms;
  if (rawPlatforms && typeof rawPlatforms === "object") {
    for (const [chain, addr] of Object.entries(rawPlatforms as Record<string, unknown>)) {
      if (typeof addr === "string" && addr.trim()) {
        platforms[chain] = addr.trim().toLowerCase();
      }
    }
    if (address === null) {
      address = platforms[ARBITRUM_PLATFORM] ?? null;
    }
  }

  const market = data.market_data;
  const m = market && typeof market === "object" ? market : null;
  const usd = (obj: unknown): number | null =>
    obj && typeof obj === "object" && typeof (obj as any).usd === "number"
      ? (obj as any).usd
      : null;

  const priceUsd = m ? usd(m.current_price) : null;
  const marketCapUsd = m ? usd(m.market_cap) : null;
  const volume24hUsd = m ? usd(m.total_volume) : null;
  const fdvUsd = m ? usd(m.fully_diluted_valuation) : null;
  const pct = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
  const change24hPct = m ? pct(m.price_change_percentage_24h) : null;
  const supply = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;

  return {
    coinId,
    address,
    decimals,
    priceUsd,
    marketCapUsd,
    volume24hUsd,
    change24hPct,
    fdvUsd,
    circulatingSupply: m ? supply(m.circulating_supply) : null,
    totalSupplyUnits: m ? supply(m.total_supply) : null,
    maxSupply: m ? supply(m.max_supply) : null,
    priceChange7dPct: m ? pct(m.price_change_percentage_7d) : null,
    priceChange30dPct: m ? pct(m.price_change_percentage_30d) : null,
    marketCapRank:
      typeof data.market_cap_rank === "number" && Number.isFinite(data.market_cap_rank)
        ? data.market_cap_rank
        : null,
    platforms,
    source: "coingecko",
  };
}

/**
 * Resolve via the curated COINGECKO_IDS map, falling back to DeFi Llama's exact
 * `gecko_id` when unmapped (safe — it is an exact CoinGecko id, not a guess).
 * Order: COINGECKO_IDS[slug] → Llama gecko_id → null.
 */
export async function resolveForSlug(
  slug: string,
  revalidate?: number,
): Promise<TokenResolution | null> {
  const coinId =
    COINGECKO_IDS[slug] ?? (await fetchLlamaProtocolMeta(slug, revalidate))?.geckoId ?? null;
  if (!coinId) return null;
  return resolveCoin(coinId, revalidate);
}


/* -------------------------------------------------------------------------- */
/* Cron batch cache (/coins/markets + throttled /coins/{id} for platforms)    */
/* -------------------------------------------------------------------------- */

const MARKETS_BATCH_SIZE = 200;
export const COINGECKO_BATCH_DELAY_MS = 2_000;
export const COINGECKO_PLATFORM_DELAY_MS = 1_500;

function marketRowToPartial(row: Record<string, unknown>, coinId: string): TokenResolution {
  const n = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  return {
    coinId,
    address: null,
    decimals: null,
    priceUsd: n(row.current_price),
    marketCapUsd: n(row.market_cap),
    volume24hUsd: n(row.total_volume),
    change24hPct: n(row.price_change_percentage_24h),
    fdvUsd: n(row.fully_diluted_valuation),
    circulatingSupply: n(row.circulating_supply),
    totalSupplyUnits: n(row.total_supply),
    maxSupply: n(row.max_supply),
    priceChange7dPct: n(row.price_change_percentage_7d_in_currency),
    priceChange30dPct: n(row.price_change_percentage_30d_in_currency),
    marketCapRank: n(row.market_cap_rank),
    platforms: {},
    source: "coingecko",
  };
}

function mergeTokenResolution(
  base: TokenResolution | null | undefined,
  overlay: TokenResolution,
): TokenResolution {
  if (!base) return overlay;
  return {
    ...base,
    ...overlay,
    address: overlay.address ?? base.address,
    decimals: overlay.decimals ?? base.decimals,
    platforms:
      Object.keys(overlay.platforms).length > 0 ? overlay.platforms : base.platforms,
  };
}

/** Batch market snapshot via `/coins/markets` (≤250 ids per request on free tier). */
export async function resolveCoinsBatch(
  coinIds: string[],
  revalidate?: number,
): Promise<Map<string, TokenResolution>> {
  const out = new Map<string, TokenResolution>();
  const unique = [...new Set(coinIds.filter(Boolean))];
  for (let i = 0; i < unique.length; i += MARKETS_BATCH_SIZE) {
    const chunk = unique.slice(i, i + MARKETS_BATCH_SIZE);
    const params = new URLSearchParams({
      vs_currency: "usd",
      ids: chunk.join(","),
      order: "market_cap_desc",
      price_change_percentage: "24h,7d,30d",
      sparkline: "false",
    });
    const data = await getJson(`${COINGECKO_BASE}/coins/markets?${params}`, revalidate);
    if (Array.isArray(data)) {
      for (const row of data) {
        if (!row || typeof row !== "object") continue;
        const id = typeof (row as any).id === "string" ? (row as any).id : null;
        if (!id) continue;
        out.set(id, marketRowToPartial(row as Record<string, unknown>, id));
      }
    }
    if (i + MARKETS_BATCH_SIZE < unique.length) {
      await sleep(COINGECKO_BATCH_DELAY_MS);
    }
  }
  return out;
}

/** In-run cache: batch markets first, then throttled `/coins/{id}` only for platforms. */
export class CoinGeckoCronCache {
  private readonly cache = new Map<string, TokenResolution | null>();

  /** Seed cache from `/coins/markets` batches (dedupes ids). */
  async prefetchMarkets(coinIds: string[]): Promise<void> {
    const missing = [...new Set(coinIds.filter(Boolean))].filter((id) => !this.cache.has(id));
    if (missing.length === 0) return;
    const batch = await resolveCoinsBatch(missing);
    for (const id of missing) {
      const partial = batch.get(id) ?? null;
      const existing = this.cache.get(id);
      this.cache.set(id, partial ? mergeTokenResolution(existing, partial) : existing ?? null);
    }
  }

  get(coinId: string): TokenResolution | null | undefined {
    return this.cache.get(coinId);
  }

  /** Market fields from cache; optional `/coins/{id}` for platforms + Arbitrum address. */
  async resolve(coinId: string, opts: { platforms?: boolean } = {}): Promise<TokenResolution | null> {
    const cached = this.cache.get(coinId);
    const hasPlatforms =
      cached != null && (Object.keys(cached.platforms).length > 0 || cached.address != null);

    if (cached && (!opts.platforms || hasPlatforms)) {
      return cached;
    }

    const full = await resolveCoin(coinId);
    if (full) {
      this.cache.set(coinId, mergeTokenResolution(cached, full));
      await sleep(COINGECKO_PLATFORM_DELAY_MS);
      return this.cache.get(coinId) ?? full;
    }

    if (cached) return cached;
    this.cache.set(coinId, null);
    return null;
  }

  async resolveForProductSlug(slug: string, platforms = true): Promise<TokenResolution | null> {
    const coinId = COINGECKO_IDS[slug];
    if (!coinId) return null;
    return this.resolve(coinId, { platforms });
  }
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
  fullyDilutedValuation?: number | null;
  holdersCount?: number | null;
  volumeChange24h?: number | null;
  volToMktCapRatio?: number | null;
  liqToMktCapRatio?: number | null;
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
