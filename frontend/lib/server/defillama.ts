import "server-only";

import { fetchJson } from "@/lib/server/http";

/**
 * DeFi Llama overlay — circulating supply / peg history (stablecoins) and
 * protocol TVL history (RWAs), plus fees/revenue, DEX volume, yield APY, a
 * contract-address price fallback, and stablecoin peg-price history. Free,
 * keyless endpoints across four subdomains:
 *
 *   - https://stablecoins.llama.fi/stablecoin/{id}            asset detail +
 *     per-chain circulating series + issuance metadata (peg mechanism,
 *     mint/redeem description, audit links).
 *   - https://stablecoins.llama.fi/stablecoincharts/all?stablecoin={id}
 *     daily total circulating + circulating-USD series (price = USD / units).
 *   - https://stablecoins.llama.fi/stablecoinprices                daily peg
 *     price for every stablecoin (depeg track, separate from supply).
 *   - https://api.llama.fi/protocol/{slug}                    daily TVL series
 *     with a per-chain (Arbitrum) breakdown.
 *   - https://api.llama.fi/summary/fees/{slug}?dataType=...    protocol fees /
 *     revenue / holders-revenue summary + methodology.
 *   - https://api.llama.fi/summary/dexs/{slug}                 DEX volume.
 *   - https://api.llama.fi/overview/options[/{chain}], /summary/options/{slug}
 *     options notional / premium volume (deferred — wired but not yet called).
 *   - https://api.llama.fi/overview/open-interest              perp OI (deferred).
 *   - https://yields.llama.fi/pools, https://yields.llama.fi/chart/{pool}
 *     pool APY (apyBase/apyReward) + historical APY series.
 *   - https://coins.llama.fi/prices/current|first/{coins}, /chart/{coins},
 *     /percentage/{coins}                                       price fallback
 *     keyed by {chain}:{address} for tokens unlisted on CoinGecko.
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
const YIELDS_BASE = "https://yields.llama.fi";
const COINS_BASE = "https://coins.llama.fi";

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
  // Stablecoin Sector Expansion (PDF §3). Numeric ids verified against
  // https://stablecoins.llama.fi/stablecoins on 2026-06-18, disambiguated by
  // issuer name (several symbols collide, e.g. USDF/USDP/BOLD/eUSD/cUSD).
  pyusd: 120, // PayPal USD
  fdusd: 119, // First Digital USD
  usdp: 11, // Pax Dollar (Paxos)
  usdg: 286, // Global Dollar (Paxos/GDN)
  eurc: 50, // EURC (Circle)
  m0: 213, // M by M0
  ausd: 205, // Agora Dollar
  zusd: 43, // GMO ZUSD
  gyen: 122, // GMO GYEN
  lusd: 8, // Liquity USD
  bold: 269, // Liquity BOLD (V2; 227 is legacy BOLD)
  crvusd: 110, // Curve crvUSD
  lisusd: 79, // Lista USD
  rsv: 25, // Reserve
  eusd: 106, // Reserve Electronic Dollar (eUSD)
  rgusd: 190, // Reserve Revenue Generating USD
  frax: 6, // Frax
  frxusd: 235, // Frax USD
  usr: 197, // Resolv USD
  usdf: 246, // Falcon USD (246 = Falcon; 219 is Astherus USDF)
  cusd: 296, // Cap cUSD
  deusd: 210, // Elixir deUSD
  usdz: 202, // Anzen USDz
  // Still unmapped (no clean Llama match; cron falls back to CoinGecko +
  // Alchemy totalSupply): scrvusd, sfrax, stusr, rlp, susdf, sdeusd, susdz,
  // bgusd (Bitget, exchange-native), usdm (Mountain — name collides with
  // several other USDM entries on Llama).
};

/**
 * Curated slug -> DeFi Llama protocol slug (TVL series). `null` = verified
 * absent. Slugs verified against https://api.llama.fi/protocols on 2026-06-12.
 */
export const LLAMA_PROTOCOL_SLUGS: Record<string, string | null> = {
  // Lending networks (PDF Week 7+8) — protocol TVL series (verified 2026-06-18).
  aave: "aave-v3",
  morpho: "morpho-blue",
  spark: "spark",
  compound: "compound-v3",
  fluid: "fluid",
  venus: "venus-core-pool",
  justlend: "justlend",
  kamino: "kamino-lend",
  maple: "maple",
  centrifuge: "centrifuge-protocol",
  dinari: "dinari",
  "estate-protocol": "estate-protocol",
  "chateau-capital": "chateau", // chateau.capital
  "florence-finance": "florence-finance",
  pgold: "pleasing-gold", // listed but adapter reports 0 — CoinGecko mcap covers it
  // DEX networks (sector expansion) — parent-protocol TVL (verified 2026-06-18).
  uniswap: "uniswap",
  "curve-finance": "curve-finance",
  balancer: "balancer",
  aerodrome: "aerodrome-slipstream", // parent "aerodrome" 400s; Slipstream is the live CLMM // verify
  pancakeswap: "pancakeswap",
  "trader-joe": "lfj", // verify (LFJ, fka Trader Joe)
  sushiswap: "sushiswap",
  raydium: "raydium",
  thorchain: "thorchain-dex",
  hyperliquid: "hyperliquid",
  dydx: "dydx",
  gmx: "gmx",
  "drift-protocol": "drift-trade",
  "gains-network": "gains-network",
  // RWA networks (sector expansion) — issuer/protocol TVL (verified 2026-06-18).
  securitize: "securitize",
  goldfinch: "goldfinch",
  clearpool: "clearpool",
  realt: "realt",
  "lofty-ai": "lofty",
  "toucan-protocol": "toucan-protocol",
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

/**
 * Curated slug -> DeFi Llama fees/revenue protocol slug. Falls back to
 * `LLAMA_PROTOCOL_SLUGS` when no dedicated entry exists (fees and TVL usually
 * share the same Llama protocol slug). `null` = no fees adapter on Llama.
 * Seeded with the obvious revenue-bearing protocols; mark `// verify` entries
 * before relying on them. Verify against https://defillama.com/fees.
 */
export const LLAMA_FEES_SLUGS: Record<string, string | null> = {
  aave: "aave-v3", // Aave V3 fees/revenue
  // Lending networks (PDF Week 7+8) — fees/revenue adapters (verified 2026-06-18).
  morpho: "morpho-blue",
  spark: "spark",
  compound: "compound-v3",
  fluid: "fluid",
  venus: "venus",
  justlend: "justlend",
  kamino: "kamino-lend",
  maple: "maple",
  ethena: "ethena", // Ethena (USDe yield)
  sky: "sky-lending", // Sky / MakerDAO lending fees // verify
  "sky-gov": "sky-lending", // verify
  ondo: "ondo-finance", // verify
  "ondo-finance": "ondo-finance", // verify
  usdai: "usdai", // verify
  "usd-ai": "usdai", // verify
  jupiter: "jupiter-perpetual-exchange", // verify
  // Verified absent / no fees adapter:
  monerium: null,
  centrifuge: null,
};

/**
 * Curated slug -> DeFi Llama DEX protocol slug (volume). `null` = not a DEX /
 * no volume adapter. Verify against https://defillama.com/dexs.
 */
export const LLAMA_DEX_SLUGS: Record<string, string | null> = {
  jupiter: "jupiter-aggregator", // Jupiter (Solana) aggregator volume // verify
  uniswap: "uniswap", // verify
  camelot: "camelot", // Arbitrum-native DEX // verify
  // Spot / AMM DEX networks (sector expansion) — trading volume. summary/dexs
  // fails soft, so unverified slugs simply yield no live volume. // verify
  "curve-finance": "curve-dex",
  balancer: "balancer",
  aerodrome: "aerodrome-slipstream",
  pancakeswap: "pancakeswap",
  "trader-joe": "lfj",
  sushiswap: "sushiswap",
  raydium: "raydium",
  thorchain: "thorchain-dex",
};

/**
 * Curated slug -> DeFi Llama yield-pool resolution. Provide an explicit
 * `poolId` (most precise) OR `project`/`symbol`/`chain` hints for the
 * best-effort auto-matcher (highest-TVL pool wins; Arbitrum preferred).
 * `null` = verified to have no tracked yield pool. Pool ids come from the
 * `pool` property of https://yields.llama.fi/pools.
 */
export interface LlamaYieldHint {
  poolId?: string;
  project?: string;
  symbol?: string;
  chain?: string;
}
export const LLAMA_YIELD_POOLS: Record<string, LlamaYieldHint | null> = {
  // Aave V3 reserves are covered on-chain (lib/server/aave.ts); these are for
  // tokens whose yield is best sourced from a Llama pool instead.
  susde: { project: "ethena", symbol: "SUSDE" }, // verify
  susds: { project: "sky", symbol: "SUSDS" }, // verify
  usdy: { project: "ondo-finance", symbol: "USDY" }, // verify
  jlp: { project: "jupiter-perpetuals", symbol: "JLP", chain: "Solana" }, // verify
};

export function llamaStablecoinIdForSlug(slug: string): number | null {
  return LLAMA_STABLECOIN_IDS[slug] ?? null;
}

export function llamaProtocolForSlug(slug: string): string | null {
  return LLAMA_PROTOCOL_SLUGS[slug] ?? null;
}

/** Fees protocol slug: dedicated map first, then the shared TVL slug map. */
export function llamaFeesProtocolForSlug(slug: string): string | null {
  if (slug in LLAMA_FEES_SLUGS) return LLAMA_FEES_SLUGS[slug];
  return LLAMA_PROTOCOL_SLUGS[slug] ?? null;
}

export function llamaDexProtocolForSlug(slug: string): string | null {
  return LLAMA_DEX_SLUGS[slug] ?? null;
}

export function llamaYieldHintForSlug(slug: string): LlamaYieldHint | null {
  return LLAMA_YIELD_POOLS[slug] ?? null;
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

/* -------------------------------------------------------------------------- */
/* Shared helpers for the dimension/coin endpoints                            */
/* -------------------------------------------------------------------------- */

/** Sum the last `n` daily values of a Llama `totalDataChart` ([unixSec, v][]). */
function chartSumLastN(chart: unknown, n: number): number | null {
  if (!Array.isArray(chart) || chart.length === 0) return null;
  let sum = 0;
  let any = false;
  for (const row of chart.slice(-n)) {
    if (!Array.isArray(row) || row.length < 2) continue;
    const v = num(row[1]);
    if (v !== null) {
      sum += v;
      any = true;
    }
  }
  return any ? sum : null;
}

/** ISO date from a full date string (yields/coins use ISO strings, not epochs). */
function isoDateFromString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** Flatten Llama's `methodology` (string or `{Fees, Revenue}` object) to text. */
function methodologyText(m: unknown): string | null {
  if (typeof m === "string") return m.trim() || null;
  if (m && typeof m === "object") {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(m as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim()) parts.push(`${k}: ${v.trim()}`);
    }
    return parts.length ? parts.join("\n") : null;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Fees & Revenue                                                             */
/* -------------------------------------------------------------------------- */

export interface LlamaFeesRevenue {
  fees24hUsd: number | null;
  fees7dUsd: number | null;
  fees30dUsd: number | null;
  feesAllTimeUsd: number | null;
  revenue24hUsd: number | null;
  revenue7dUsd: number | null;
  revenue30dUsd: number | null;
  holdersRevenue24hUsd: number | null;
  feesChange1dPct: number | null;
  methodology: string | null;
  methodologyUrl: string | null;
  category: string | null;
}

async function fetchFeesSummary(
  protocol: string,
  dataType: "dailyFees" | "dailyRevenue" | "dailyHoldersRevenue",
  revalidate?: number,
): Promise<any | null> {
  return getJson(
    `${PROTOCOLS_BASE}/summary/fees/${encodeURIComponent(protocol)}?dataType=${dataType}`,
    revalidate,
  );
}

/**
 * Protocol fees + revenue + holders-revenue summary for a slug. Llama exposes
 * `total24h/total7d/totalAllTime` per dataType; 30d is derived from the daily
 * chart. Returns the methodology note that powers the fee/revenue benchmark.
 */
export async function fetchLlamaFeesRevenue(
  slug: string,
  revalidate?: number,
): Promise<LlamaFeesRevenue | null> {
  const protocol = llamaFeesProtocolForSlug(slug);
  if (!protocol) return null;

  const fees = await fetchFeesSummary(protocol, "dailyFees", revalidate);
  if (!fees || typeof fees !== "object") return null;
  const revenue = await fetchFeesSummary(protocol, "dailyRevenue", revalidate);
  const holders = await fetchFeesSummary(protocol, "dailyHoldersRevenue", revalidate);

  const fees24h = num(fees.total24h);
  const fees7d = num(fees.total7d);
  const feesAll = num(fees.totalAllTime);
  const fees30d = num(fees.total30d) ?? chartSumLastN(fees.totalDataChart, 30);

  // No usable fee figure at all -> treat as no data.
  if (fees24h === null && fees7d === null && fees30d === null && feesAll === null) return null;

  const rev = revenue && typeof revenue === "object" ? revenue : null;
  const hold = holders && typeof holders === "object" ? holders : null;

  return {
    fees24hUsd: fees24h,
    fees7dUsd: fees7d,
    fees30dUsd: fees30d,
    feesAllTimeUsd: feesAll,
    revenue24hUsd: rev ? num(rev.total24h) : null,
    revenue7dUsd: rev ? num(rev.total7d) : null,
    revenue30dUsd: rev ? (num(rev.total30d) ?? chartSumLastN(rev.totalDataChart, 30)) : null,
    holdersRevenue24hUsd: hold ? num(hold.total24h) : null,
    feesChange1dPct: num(fees.change_1d),
    methodology: methodologyText(fees.methodology),
    methodologyUrl: typeof fees.methodologyURL === "string" ? fees.methodologyURL : null,
    category: typeof fees.category === "string" ? fees.category : null,
  };
}

/* -------------------------------------------------------------------------- */
/* DEX volume                                                                 */
/* -------------------------------------------------------------------------- */

export interface LlamaDexVolume {
  volume24hUsd: number | null;
  volume7dUsd: number | null;
  volume30dUsd: number | null;
  volumeAllTimeUsd: number | null;
  change1dPct: number | null;
}

/** DEX trading volume summary for a slug. */
export async function fetchLlamaDexVolume(
  slug: string,
  revalidate?: number,
): Promise<LlamaDexVolume | null> {
  const protocol = llamaDexProtocolForSlug(slug);
  if (!protocol) return null;
  const data = await getJson(
    `${PROTOCOLS_BASE}/summary/dexs/${encodeURIComponent(protocol)}`,
    revalidate,
  );
  if (!data || typeof data !== "object") return null;

  const v24 = num(data.total24h);
  const v7 = num(data.total7d);
  const vAll = num(data.totalAllTime);
  const v30 = num(data.total30d) ?? chartSumLastN(data.totalDataChart, 30);
  if (v24 === null && v7 === null && v30 === null && vAll === null) return null;

  return {
    volume24hUsd: v24,
    volume7dUsd: v7,
    volume30dUsd: v30,
    volumeAllTimeUsd: vAll,
    change1dPct: num(data.change_1d),
  };
}

/* -------------------------------------------------------------------------- */
/* Yields & APY                                                               */
/* -------------------------------------------------------------------------- */

export interface LlamaPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number | null;
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
  apyMean30d: number | null;
}

// The /pools payload is large (every tracked pool); cache it briefly so a cron
// pass that resolves many slugs only fetches it once.
let _poolsCache: { at: number; pools: LlamaPool[] } | null = null;
const POOLS_CACHE_MS = 5 * 60_000;

/** All tracked yield pools (cached ~5 min within a process). */
export async function fetchLlamaPools(revalidate?: number): Promise<LlamaPool[]> {
  if (_poolsCache && Date.now() - _poolsCache.at < POOLS_CACHE_MS) return _poolsCache.pools;
  const data = await getJson(`${YIELDS_BASE}/pools`, revalidate);
  const rows = data && Array.isArray(data.data) ? data.data : [];
  const pools: LlamaPool[] = [];
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const pool = typeof r.pool === "string" ? r.pool : null;
    if (!pool) continue;
    pools.push({
      pool,
      chain: String(r.chain ?? ""),
      project: String(r.project ?? ""),
      symbol: String(r.symbol ?? ""),
      tvlUsd: num(r.tvlUsd),
      apy: num(r.apy),
      apyBase: num(r.apyBase),
      apyReward: num(r.apyReward),
      apyMean30d: num(r.apyMean30d),
    });
  }
  if (pools.length > 0) _poolsCache = { at: Date.now(), pools };
  return pools;
}

/* -------------------------------------------------------------------------- */
/* Lending borrow metrics (yields /poolsBorrow)                               */
/* -------------------------------------------------------------------------- */

/**
 * Curated network slug -> DeFi Llama yields `project` value, used to aggregate
 * the `/poolsBorrow` rows into protocol-level lending metrics (supply/borrow
 * APY, utilization). Distinct from the TVL/fees protocol slugs. `// verify`
 * entries should be confirmed against https://yields.llama.fi/poolsBorrow.
 */
export const LLAMA_LENDING_PROJECTS: Record<string, string | null> = {
  aave: "aave-v3",
  morpho: "morpho-blue",
  spark: "sparklend",
  compound: "compound-v3",
  fluid: "fluid-lending",
  venus: "venus-core-pool",
  justlend: "justlend",
  kamino: "kamino-lend",
  maple: "maple",
};

export function llamaLendingProjectForSlug(slug: string): string | null {
  return LLAMA_LENDING_PROJECTS[slug] ?? null;
}

interface LlamaBorrowPool {
  project: string;
  chain: string;
  symbol: string;
  totalSupplyUsd: number | null;
  totalBorrowUsd: number | null;
  apyBase: number | null;
  apyBaseBorrow: number | null;
  ltv: number | null;
}

let _borrowCache: { at: number; pools: LlamaBorrowPool[] } | null = null;

/** All tracked borrow pools (cached ~5 min). Large payload; fetched once. */
export async function fetchLlamaBorrowPools(revalidate?: number): Promise<LlamaBorrowPool[]> {
  if (_borrowCache && Date.now() - _borrowCache.at < POOLS_CACHE_MS) return _borrowCache.pools;
  const data = await getJson(`${YIELDS_BASE}/poolsBorrow`, revalidate);
  const rows = data && Array.isArray(data.data) ? data.data : [];
  const pools: LlamaBorrowPool[] = [];
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    pools.push({
      project: String(r.project ?? ""),
      chain: String(r.chain ?? ""),
      symbol: String(r.symbol ?? ""),
      totalSupplyUsd: num(r.totalSupplyUsd),
      totalBorrowUsd: num(r.totalBorrowUsd),
      apyBase: num(r.apyBase),
      apyBaseBorrow: num(r.apyBaseBorrow),
      ltv: num(r.ltv),
    });
  }
  if (pools.length > 0) _borrowCache = { at: Date.now(), pools };
  return pools;
}

export interface LlamaLendingBorrow {
  /** Total supplied / deposits across the project's pools (USD). */
  totalSupplyUsd: number | null;
  /** Total outstanding borrows across the project's pools (USD). */
  totalBorrowUsd: number | null;
  /** borrowed / supplied (0–100). */
  utilizationPct: number | null;
  /** Supply-weighted base supply APY (%). */
  supplyApyPct: number | null;
  /** Borrow-weighted base borrow APY (%). */
  borrowApyPct: number | null;
}

/**
 * Aggregate a project's `/poolsBorrow` rows into protocol-level lending
 * metrics. Supply/borrow APYs are TVL-weighted so a single dominant market
 * doesn't get drowned out by long-tail pools. Returns null when the project
 * has no borrow pools in the snapshot.
 */
export function aggregateLendingBorrow(
  slug: string,
  pools: LlamaBorrowPool[],
): LlamaLendingBorrow | null {
  const project = llamaLendingProjectForSlug(slug);
  if (!project) return null;
  const proj = project.toLowerCase();
  const rows = pools.filter((p) => p.project.toLowerCase() === proj);
  if (rows.length === 0) return null;

  let supply = 0;
  let borrow = 0;
  let supplyApyWeighted = 0;
  let supplyWeight = 0;
  let borrowApyWeighted = 0;
  let borrowWeight = 0;

  for (const r of rows) {
    const s = r.totalSupplyUsd ?? 0;
    const b = r.totalBorrowUsd ?? 0;
    supply += s;
    borrow += b;
    if (r.apyBase != null && s > 0) {
      supplyApyWeighted += r.apyBase * s;
      supplyWeight += s;
    }
    if (r.apyBaseBorrow != null && b > 0) {
      borrowApyWeighted += r.apyBaseBorrow * b;
      borrowWeight += b;
    }
  }

  const supplyApyPct = supplyWeight > 0 ? supplyApyWeighted / supplyWeight : null;
  const borrowApyPct = borrowWeight > 0 ? borrowApyWeighted / borrowWeight : null;
  const utilizationPct = supply > 0 ? (borrow / supply) * 100 : null;

  return {
    totalSupplyUsd: supply > 0 ? supply : null,
    totalBorrowUsd: borrow > 0 ? borrow : null,
    utilizationPct,
    supplyApyPct,
    borrowApyPct,
  };
}

export interface LlamaYieldPool {
  poolId: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number | null;
  apyPct: number | null;
  apyBasePct: number | null;
  apyRewardPct: number | null;
  apyMean30dPct: number | null;
}

function toYieldPool(p: LlamaPool): LlamaYieldPool {
  return {
    poolId: p.pool,
    chain: p.chain,
    project: p.project,
    symbol: p.symbol,
    tvlUsd: p.tvlUsd,
    apyPct: p.apy ?? ((p.apyBase ?? 0) + (p.apyReward ?? 0) || null),
    apyBasePct: p.apyBase,
    apyRewardPct: p.apyReward,
    apyMean30dPct: p.apyMean30d,
  };
}

/**
 * Resolve a slug to its best yield pool from a `/pools` snapshot. Uses an
 * explicit `poolId` hint when provided, else matches by project/symbol/chain
 * and picks the highest-TVL pool (Arbitrum preferred when no chain hint).
 */
export function resolveLlamaYieldPool(slug: string, pools: LlamaPool[]): LlamaYieldPool | null {
  const hint = llamaYieldHintForSlug(slug);
  if (!hint) return null;

  if (hint.poolId) {
    const found = pools.find((p) => p.pool === hint.poolId);
    return found ? toYieldPool(found) : null;
  }

  let candidates = pools;
  if (hint.project) {
    const proj = hint.project.toLowerCase();
    candidates = candidates.filter((p) => p.project.toLowerCase() === proj);
  }
  if (hint.symbol) {
    const sym = hint.symbol.toLowerCase();
    candidates = candidates.filter((p) => p.symbol.toLowerCase() === sym);
  }
  if (hint.chain) {
    const chain = hint.chain.toLowerCase();
    candidates = candidates.filter((p) => p.chain.toLowerCase() === chain);
  }
  if (candidates.length === 0) return null;

  const sorted = [...candidates].sort((a, b) => {
    if (!hint.chain) {
      const aArb = a.chain.toLowerCase() === "arbitrum" ? 1 : 0;
      const bArb = b.chain.toLowerCase() === "arbitrum" ? 1 : 0;
      if (aArb !== bArb) return bArb - aArb;
    }
    return (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0);
  });
  return toYieldPool(sorted[0]);
}

/** Convenience: resolve a slug's pool, fetching `/pools` if not supplied. */
export async function fetchLlamaYieldPool(
  slug: string,
  opts: { pools?: LlamaPool[]; revalidate?: number } = {},
): Promise<LlamaYieldPool | null> {
  const pools = opts.pools ?? (await fetchLlamaPools(opts.revalidate));
  return resolveLlamaYieldPool(slug, pools);
}

/** Historical APY series for a pool id (`apy` field), most recent last. */
export async function fetchLlamaYieldChart(
  poolId: string,
  days = 30,
  revalidate?: number,
): Promise<LlamaSeriesPoint[]> {
  const data = await getJson(`${YIELDS_BASE}/chart/${encodeURIComponent(poolId)}`, revalidate);
  const rows = data && Array.isArray(data.data) ? data.data : [];
  const byDate = new Map<string, number>();
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const date = isoDateFromString((r as any).timestamp);
    const apy = num((r as any).apy);
    if (date && apy !== null) byDate.set(date, apy);
  }
  const points = Array.from(byDate, ([date, value]) => ({ date, value })).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  return days > 0 ? points.slice(-days) : points;
}

/* -------------------------------------------------------------------------- */
/* Coins & Prices (contract-address keyed fallback)                           */
/* -------------------------------------------------------------------------- */

/** Build a Llama coin key for an Arbitrum contract address. */
export function arbCoinKey(address: string): string {
  return `arbitrum:${address.trim().toLowerCase()}`;
}

export interface LlamaCoinPrice {
  priceUsd: number | null;
  symbol: string | null;
  decimals: number | null;
  confidence: number | null;
  timestamp: number | null;
}

/** Current price for a `{chain}:{address}` coin key. */
export async function fetchLlamaCoinPrice(
  coinKey: string,
  revalidate?: number,
): Promise<LlamaCoinPrice | null> {
  // Colons/hex addresses are URL-safe; do not encode (Llama wants the raw key).
  const data = await getJson(`${COINS_BASE}/prices/current/${coinKey}`, revalidate);
  const coin = data && data.coins && typeof data.coins === "object" ? data.coins[coinKey] : null;
  if (!coin || typeof coin !== "object") return null;
  const price = num(coin.price);
  if (price === null) return null;
  return {
    priceUsd: price,
    symbol: typeof coin.symbol === "string" ? coin.symbol : null,
    decimals: num(coin.decimals),
    confidence: num(coin.confidence),
    timestamp: num(coin.timestamp),
  };
}

/** 24h (or `period`) percentage price change for a coin key. */
export async function fetchLlamaCoinPercentage(
  coinKey: string,
  period = "24h",
  revalidate?: number,
): Promise<number | null> {
  const data = await getJson(`${COINS_BASE}/percentage/${coinKey}?period=${period}`, revalidate);
  const coin = data && data.coins && typeof data.coins === "object" ? data.coins[coinKey] : null;
  return num(coin);
}

/** Daily price series for a coin key over `days`. */
export async function fetchLlamaCoinChart(
  coinKey: string,
  days = 30,
  revalidate?: number,
): Promise<LlamaSeriesPoint[]> {
  const span = Math.max(days, 1);
  const data = await getJson(`${COINS_BASE}/chart/${coinKey}?span=${span}&period=1d`, revalidate);
  const coin = data && data.coins && typeof data.coins === "object" ? data.coins[coinKey] : null;
  const prices = coin && Array.isArray(coin.prices) ? coin.prices : [];
  const byDate = new Map<string, number>();
  for (const p of prices) {
    if (!p || typeof p !== "object") continue;
    const date = isoDate((p as any).timestamp);
    const value = num((p as any).price);
    if (date && value !== null) byDate.set(date, value);
  }
  const points = Array.from(byDate, ([date, value]) => ({ date, value })).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  return days > 0 ? points.slice(-days) : points;
}

/** Earliest recorded price for a coin key (historical context). */
export async function fetchLlamaCoinFirstPrice(
  coinKey: string,
  revalidate?: number,
): Promise<{ priceUsd: number | null; timestamp: number | null } | null> {
  const data = await getJson(`${COINS_BASE}/prices/first/${coinKey}`, revalidate);
  const coin = data && data.coins && typeof data.coins === "object" ? data.coins[coinKey] : null;
  if (!coin || typeof coin !== "object") return null;
  return { priceUsd: num(coin.price), timestamp: num(coin.timestamp) };
}

/* -------------------------------------------------------------------------- */
/* Stablecoin peg-price history (depeg track)                                 */
/* -------------------------------------------------------------------------- */

/**
 * Daily peg-price series for a stablecoin slug from `/stablecoinprices`. This
 * is the depeg track (separate from circulating supply) and a fallback when
 * `fetchLlamaStablecoinCharts` produces no peg-price series.
 */
export async function fetchLlamaStablecoinPrices(
  slug: string,
  days = 90,
  revalidate?: number,
): Promise<LlamaSeriesPoint[]> {
  const id = llamaStablecoinIdForSlug(slug);
  if (id === null) return [];
  const data = await getJson(`${STABLECOINS_BASE}/stablecoinprices`, revalidate);
  if (!Array.isArray(data)) return [];
  const key = String(id);
  const points: LlamaSeriesPoint[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const date = isoDate((row as any).date);
    const prices = (row as any).prices;
    const price = prices && typeof prices === "object" ? num(prices[key]) : null;
    if (date && price !== null && price > 0) points.push({ date, value: price });
  }
  return days > 0 ? points.slice(-days) : points;
}

/* -------------------------------------------------------------------------- */
/* Options & Open Interest (deferred — implemented, not yet called by cron)   */
/* -------------------------------------------------------------------------- */

export interface LlamaOptionsVolume {
  notionalVolume24hUsd: number | null;
  notionalVolume30dUsd: number | null;
  premiumVolume24hUsd: number | null;
  premiumVolume30dUsd: number | null;
}

/** Options dex volume (notional + premium) for a Llama options protocol slug. */
export async function fetchLlamaOptionsVolume(
  protocol: string,
  revalidate?: number,
): Promise<LlamaOptionsVolume | null> {
  const notional = await getJson(
    `${PROTOCOLS_BASE}/summary/options/${encodeURIComponent(protocol)}?dataType=dailyNotionalVolume`,
    revalidate,
  );
  const premium = await getJson(
    `${PROTOCOLS_BASE}/summary/options/${encodeURIComponent(protocol)}?dataType=dailyPremiumVolume`,
    revalidate,
  );
  if (!notional && !premium) return null;
  return {
    notionalVolume24hUsd: num(notional?.total24h),
    notionalVolume30dUsd: num(notional?.total30d) ?? chartSumLastN(notional?.totalDataChart, 30),
    premiumVolume24hUsd: num(premium?.total24h),
    premiumVolume30dUsd: num(premium?.total30d) ?? chartSumLastN(premium?.totalDataChart, 30),
  };
}

export interface LlamaOpenInterest {
  openInterestUsd: number | null;
  longOpenInterestUsd: number | null;
  shortOpenInterestUsd: number | null;
}

/**
 * Perp open interest for a protocol, read from the `/overview/open-interest`
 * roster (there is no per-protocol summary endpoint on the free tier).
 */
export async function fetchLlamaOpenInterest(
  protocol: string,
  revalidate?: number,
): Promise<LlamaOpenInterest | null> {
  const data = await getJson(`${PROTOCOLS_BASE}/overview/open-interest`, revalidate);
  const protocols = data && Array.isArray(data.protocols) ? data.protocols : [];
  const target = protocol.toLowerCase();
  const match = protocols.find((p: any) => {
    const slug = typeof p?.slug === "string" ? p.slug.toLowerCase() : null;
    const name = typeof p?.name === "string" ? p.name.toLowerCase() : null;
    return slug === target || name === target;
  });
  if (!match) return null;
  const oi =
    num(match.openInterestAtEnd) ?? num(match.total24h) ?? num(match.totalOpenInterest);
  if (oi === null) return null;
  return {
    openInterestUsd: oi,
    longOpenInterestUsd: num(match.longOpenInterestAtEnd),
    shortOpenInterestUsd: num(match.shortOpenInterestAtEnd),
  };
}
