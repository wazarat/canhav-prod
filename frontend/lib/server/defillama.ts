import "server-only";

import { fetchJson } from "@/lib/server/http";

/**
 * DeFi Llama overlay — circulating supply / peg history (stablecoins) and
 * protocol TVL history (RWAs). Free, keyless endpoints:
 *
 *   - https://stablecoins.llama.fi/stablecoin/{id}            asset detail +
 *     per-chain circulating series + issuance metadata (peg mechanism,
 *     mint/redeem description, audit links).
 *   - https://stablecoins.llama.fi/stablecoincharts/all?stablecoin={id}
 *     daily total circulating + circulating-USD series (price = USD / units).
 *   - https://api.llama.fi/protocol/{slug}                    daily TVL series
 *     with a per-chain (Arbitrum) breakdown.
 *
 * This is the recovery path for coins that Alchemy/CoinGecko can't resolve
 * (e.g. Monerium EURe, Pleasing USD) and the source that fills the previously
 * always-empty HistoricalPegData / HistoricalTvlData store series.
 *
 * Everything fails soft (null / []) so the cron and page renders never block on
 * a flaky upstream.
 */

const STABLECOINS_BASE = "https://stablecoins.llama.fi";
const PROTOCOLS_BASE = "https://api.llama.fi";

/**
 * Curated slug -> DeFi Llama stablecoin asset id. `null` = verified absent from
 * Llama's stablecoin index (e.g. Stably USDS.s, Monerium GBPe/ISKe, USDT0).
 * Ids verified against https://stablecoins.llama.fi/stablecoins on 2026-06-12.
 */
export const LLAMA_STABLECOIN_IDS: Record<string, number | null> = {
  tether: 1, // Tether USDT
  usdc: 2, // USD Coin
  dai: 5, // Dai
  trueusd: 7, // TrueUSD
  "inverse-finance": 15, // Dola
  monerium: 101, // Monerium EUR emoney (EURe) — peggedEUR
  gho: 118, // Aave GHO
  usdy: 129, // Ondo US Dollar Yield
  ethena: 146, // Ethena USDe
  sky: 209, // Sky Dollar USDS
  usdtb: 221, // Ethena USDtb
  usdai: 309, // USD.AI USDai
  jupusd: 335, // Jupiter JupUSD
  usdpm: 341, // Pleasing USD (PUSD)
  // Verified absent from the Llama stablecoin index:
  stably: null,
  gbpe: null,
  iske: null,
  usdt0: null,
  veusd: null,
  usdsc: null,
};

/**
 * Curated slug -> DeFi Llama protocol slug (TVL series). `null` = verified
 * absent. Slugs verified against https://api.llama.fi/protocols on 2026-06-12.
 */
export const LLAMA_PROTOCOL_SLUGS: Record<string, string | null> = {
  centrifuge: "centrifuge-protocol",
  dinari: "dinari",
  "estate-protocol": "estate-protocol",
  "chateau-capital": "chateau", // chateau.capital
  "florence-finance": "florence-finance",
  pgold: "pleasing-gold", // listed but adapter reports 0 — CoinGecko mcap covers it
  // Verified absent:
  arcton: null,
  atmosphera: null,
  aryze: null,
  dualmint: null,
  "franklin-templeton": null, // BENJI tracked via on-chain supply x $1 NAV instead
  ousg: null, // folded into ondo-yield-assets (mixed with USDY) — use CoinGecko
  "ondo-gm": null,
  "stably-gold": null,
};

export function llamaStablecoinIdForSlug(slug: string): number | null {
  return LLAMA_STABLECOIN_IDS[slug] ?? null;
}

export function llamaProtocolForSlug(slug: string): string | null {
  return LLAMA_PROTOCOL_SLUGS[slug] ?? null;
}

/* -------------------------------------------------------------------------- */
/* Shared parsing helpers                                                     */
/* -------------------------------------------------------------------------- */

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Llama dates are epoch seconds (sometimes as strings). -> YYYY-MM-DD. */
function isoDate(value: unknown): string | null {
  const sec = num(value);
  if (sec === null) return null;
  const d = new Date(sec * 1000);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** First numeric value of a `{ peggedUSD: n }`-style keyed object. */
function pegValue(obj: unknown): number | null {
  if (!obj || typeof obj !== "object") return null;
  for (const v of Object.values(obj as Record<string, unknown>)) {
    const n = num(v);
    if (n !== null) return n;
  }
  return null;
}

async function getJson(url: string, revalidate?: number): Promise<any | null> {
  const { status, data } = await fetchJson(url, {
    headers: { Accept: "application/json", "User-Agent": "canhav-research/1.0" },
    revalidate,
  });
  if (status < 200 || status >= 300) return null;
  return data;
}

/* -------------------------------------------------------------------------- */
/* Stablecoins                                                                */
/* -------------------------------------------------------------------------- */

export interface LlamaChainSupply {
  chain: string;
  /** Latest circulating supply on that chain, in peg-target units. */
  circulating: number;
}

export interface LlamaStablecoinAsset {
  id: number;
  name: string;
  symbol: string;
  /** e.g. "peggedUSD" | "peggedEUR". */
  pegType: string | null;
  /** e.g. "fiat-backed" | "crypto-backed" | "algorithmic". */
  pegMechanism: string | null;
  /** Current USD price (null for thin assets). */
  priceUsd: number | null;
  description: string | null;
  mintRedeemDescription: string | null;
  auditLinks: string[];
  url: string | null;
  /** Latest circulating supply per chain (peg-target units), largest first. */
  chainCirculating: LlamaChainSupply[];
  /** Total circulating across all chains (peg-target units). */
  totalCirculating: number | null;
}

/** Asset detail + per-chain circulating + issuance metadata for a slug. */
export async function fetchLlamaStablecoin(
  slug: string,
  revalidate?: number,
): Promise<LlamaStablecoinAsset | null> {
  const id = llamaStablecoinIdForSlug(slug);
  if (id === null) return null;
  const data = await getJson(`${STABLECOINS_BASE}/stablecoin/${id}`, revalidate);
  if (!data || typeof data !== "object") return null;

  const chainCirculating: LlamaChainSupply[] = [];
  const balances = data.chainBalances;
  if (balances && typeof balances === "object") {
    for (const [chain, entry] of Object.entries(balances as Record<string, any>)) {
      const tokens = entry?.tokens;
      if (!Array.isArray(tokens) || tokens.length === 0) continue;
      const latest = tokens[tokens.length - 1];
      const circulating = pegValue(latest?.circulating);
      if (circulating !== null && circulating > 0) {
        chainCirculating.push({ chain, circulating });
      }
    }
  }
  chainCirculating.sort((a, b) => b.circulating - a.circulating);
  const totalCirculating = chainCirculating.length
    ? chainCirculating.reduce((sum, c) => sum + c.circulating, 0)
    : null;

  const auditLinks = Array.isArray(data.auditLinks)
    ? (data.auditLinks as unknown[]).filter((l): l is string => typeof l === "string")
    : [];

  return {
    id,
    name: String(data.name ?? ""),
    symbol: String(data.symbol ?? ""),
    pegType: typeof data.pegType === "string" ? data.pegType : null,
    pegMechanism: typeof data.pegMechanism === "string" ? data.pegMechanism : null,
    priceUsd: num(data.price),
    description: typeof data.description === "string" ? data.description : null,
    mintRedeemDescription:
      typeof data.mintRedeemDescription === "string" ? data.mintRedeemDescription : null,
    auditLinks,
    url: typeof data.url === "string" ? data.url : null,
    chainCirculating,
    totalCirculating,
  };
}

export interface LlamaSeriesPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface LlamaStablecoinCharts {
  /** Daily total circulating supply (peg-target units). */
  supply: LlamaSeriesPoint[];
  /**
   * Daily peg price (USD value / circulating units). Only emitted for
   * `peggedUSD` assets — for other pegs the ratio conflates the FX rate with
   * peg deviation, so callers should chart via CoinGecko `vs_currency` instead.
   */
  pegPrice: LlamaSeriesPoint[];
}

/** Daily supply + (USD-pegged) peg-price history for a slug over `days`. */
export async function fetchLlamaStablecoinCharts(
  slug: string,
  days = 90,
  revalidate?: number,
): Promise<LlamaStablecoinCharts | null> {
  const id = llamaStablecoinIdForSlug(slug);
  if (id === null) return null;
  const data = await getJson(
    `${STABLECOINS_BASE}/stablecoincharts/all?stablecoin=${id}`,
    revalidate,
  );
  if (!Array.isArray(data) || data.length === 0) return null;

  const supply: LlamaSeriesPoint[] = [];
  const pegPrice: LlamaSeriesPoint[] = [];
  let usdPegged = false;

  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const date = isoDate(row.date);
    if (!date) continue;
    const circulating = pegValue(row.totalCirculating);
    if (circulating === null || circulating <= 0) continue;
    supply.push({ date, value: circulating });

    const keys = row.totalCirculating ? Object.keys(row.totalCirculating) : [];
    if (keys.includes("peggedUSD")) usdPegged = true;
    const usd = pegValue(row.totalCirculatingUSD);
    if (usd !== null && usd > 0) {
      pegPrice.push({ date, value: usd / circulating });
    }
  }
  if (supply.length === 0) return null;

  return {
    supply: days > 0 ? supply.slice(-days) : supply,
    pegPrice: usdPegged && days > 0 ? pegPrice.slice(-days) : usdPegged ? pegPrice : [],
  };
}

/* -------------------------------------------------------------------------- */
/* Protocol TVL (RWAs)                                                        */
/* -------------------------------------------------------------------------- */

export interface LlamaChainTvl {
  chain: string;
  tvlUsd: number;
}

export interface LlamaProtocolTvl {
  /** Daily TVL series, USD. */
  points: LlamaSeriesPoint[];
  /** Which slice the series is: "Arbitrum" when available, else "all". */
  scope: string;
  /** Latest TVL per chain (USD), largest first. */
  chainTvls: LlamaChainTvl[];
}

/**
 * Daily TVL history for an RWA slug. Prefers the Arbitrum slice (this is an
 * Arbitrum research platform); falls back to the protocol-wide series.
 */
export async function fetchLlamaProtocolTvl(
  slug: string,
  days = 90,
  revalidate?: number,
): Promise<LlamaProtocolTvl | null> {
  const protocol = llamaProtocolForSlug(slug);
  if (!protocol) return null;
  const data = await getJson(
    `${PROTOCOLS_BASE}/protocol/${encodeURIComponent(protocol)}`,
    revalidate,
  );
  if (!data || typeof data !== "object") return null;

  const parseSeries = (raw: unknown): LlamaSeriesPoint[] => {
    if (!Array.isArray(raw)) return [];
    const byDate = new Map<string, number>();
    for (const row of raw) {
      if (!row || typeof row !== "object") continue;
      const date = isoDate((row as any).date);
      const value = num((row as any).totalLiquidityUSD);
      if (!date || value === null) continue;
      byDate.set(date, value);
    }
    return Array.from(byDate, ([date, value]) => ({ date, value })).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  };

  const chainTvls: LlamaChainTvl[] = [];
  let arbSeries: LlamaSeriesPoint[] = [];
  const chains = data.chainTvls;
  if (chains && typeof chains === "object") {
    for (const [chain, entry] of Object.entries(chains as Record<string, any>)) {
      // Skip synthetic slices like "Arbitrum-borrowed" / "staking".
      if (/[-_]/.test(chain) || /borrowed|staking|pool2|treasury|vesting/i.test(chain)) continue;
      const series = parseSeries(entry?.tvl);
      if (series.length === 0) continue;
      const latest = series[series.length - 1].value;
      if (latest > 0) chainTvls.push({ chain, tvlUsd: latest });
      if (chain === "Arbitrum") arbSeries = series;
    }
  }
  chainTvls.sort((a, b) => b.tvlUsd - a.tvlUsd);

  const total = parseSeries(data.tvl);
  const points = arbSeries.length >= 2 ? arbSeries : total;
  if (points.length === 0) return null;
  // A dead adapter reports a flat-zero series — treat as no data.
  if (points[points.length - 1].value <= 0 && points.every((p) => p.value <= 0)) return null;

  return {
    points: days > 0 ? points.slice(-days) : points,
    scope: arbSeries.length >= 2 ? "Arbitrum" : "all",
    chainTvls,
  };
}
