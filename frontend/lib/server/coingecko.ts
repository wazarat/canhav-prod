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
  usdtb: "usdtb", // Ethena USDtb (Ethereum/Solana only — market data, no Arbitrum address)
  ena: "ethena",
  "inverse-finance": "dola-usd",
  monerium: "monerium-eur-money",
  gbpe: "monerium-gbp-emoney", // Gnosis only — market data, no Arbitrum address
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
  // Pleasing USD — supply/peg via DeFi Llama (id 341); CG id for market data.
  usdpm: "pleasing-usd",
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
  // Data-expansion coins. Most are low-liquidity / unlisted / institutional-gated,
  // so they map to null (live overlay simply skips them). Only confident ids set.
  sena: "ethena-staked-ena",
  iusde: null,
  mkr: "maker",
  schip: null,
  true: null,
  tgbp: null,
  taud: null,
  tcad: null,
  thkd: null,
  "monerium-usde": null,
  iske: null,
  rusdy: "rebasing-ondo-us-dollar-yield",
  usdsc: null,
  "ondo-gm": null,
  "stably-gold": null,
  reg: "realtoken-ecosystem-governance",
  // DEX governance tokens (PDF "DEX Sector Expansion" §3).
  uni: "uniswap",
  crv: "curve-dao-token",
  bal: "balancer",
  aero: "aerodrome-finance",
  cake: "pancakeswap-token",
  sushi: "sushi",
  ray: "raydium",
  "dydx-gov": "dydx-chain",
  drift: "drift-protocol",
  "gmx-gov": "gmx",
  hype: "hyperliquid",
  gns: "gains-network",
  joe: "joe",
  rune: "thorchain",
  // Lending-network governance tokens (PDF Week 7+8). Ids verified via the
  // CoinGecko /search endpoint; `// verify` ones should be confirmed before
  // relying on live price/supply (the cron fails soft to null otherwise).
  morpho: "morpho",
  comp: "compound-governance-token",
  spk: "spark-2", // Spark Protocol SPK (CoinGecko id is spark-2; "spark" is unrelated)
  fluid: "instadapp", // Fluid governance (ex-INST; fluid id has no CG market feed)
  xvs: "venus",
  jst: "just",
  kmno: "kamino",
  syrup: "syrup",
  "syrup-oft": "syrup",
  cfg: "centrifuge",
  gfi: "goldfinch",
  cpool: "clearpool",
  stsyrup: null, // not on CoinGecko — Llama ethereum price fallback
  vai: null,
  // Stablecoin Sector Expansion (PDF §3). Confident ids set; `// verify` ones
  // should be confirmed before relying on live price/supply (cron fails soft).
  eurc: "euro-coin",
  usdp: "paxos-standard",
  pyusd: "paypal-usd",
  usdg: "global-dollar",
  usdl: "lift-dollar", // wound down 2025 but still listed
  fdusd: "first-digital-usd",
  m0: "wrappedm-by-m0", // WrappedM proxy; plain M unlisted on CoinGecko
  ausd: "agora-dollar",
  bgusd: null, // exchange-native, not on CoinGecko
  zusd: "zusd",
  gyen: "gyen",
  lusd: "liquity-usd",
  bold: "liquity-bold",
  crvusd: "crvusd",
  scrvusd: "savings-crvusd",
  lisusd: "helio-protocol-hay", // Lista USD (formerly Helio HAY)
  rsv: "reserve",
  eusd: "electronic-usd",
  rgusd: "revenue-generating-usd",
  frax: "frax",
  frxusd: "frax-usd",
  sfrax: "staked-frax",
  usr: "resolv-usr",
  stusr: null, // only wstUSR listed (off-peg/illiquid feed) — left unmapped
  rlp: "resolv-rlp",
  usdf: null, // falcon-finance-usd listed but returns no price — left unmapped
  susdf: null, // sUSDf not listed on CoinGecko
  cusd: "cap-usd", // Cap USD (distinct id from Celo Dollar)
  deusd: "elixir-deusd",
  sdeusd: "elixir-staked-deusd",
  usdz: "anzen-usdz",
  susdz: "anzen-staked-usdz",
  usdm: "mountain-protocol-usdm",
  // Credit sector member coins (Leveraged Yield + Fixed Income gov tokens; verified 2026-06-25).
  rdnt: "radiant-capital",
  gear: "gearbox",
  pendle: "pendle",
  note: "notional-finance",
  // Staking sector member coins — LST/LRT tokens (verified 2026-06-25).
  steth: "staked-ether",
  reth: "rocket-pool-eth",
  wbeth: "wrapped-beacon-eth",
  cbeth: "coinbase-wrapped-staked-eth",
  meth: "mantle-staked-ether",
  sfrxeth: "staked-frax-ether", // distinct from the `sfrax` stablecoin (staked-frax)
  sweth: "sweth",
  ethx: "stader-ethx",
  oseth: "stakewise-v3-oseth",
  ankreth: "ankreth",
  eigen: "eigenlayer", // EigenCloud (prev. EigenLayer); CoinGecko id remains "eigenlayer"
  weeth: "wrapped-eeth",
  ezeth: "renzo-restaked-eth",
  rseth: "kelp-dao-restaked-eth",
  pufeth: "pufeth",
  unieth: "universal-eth", // Bedrock uniETH (CoinGecko id is universal-eth)
  yneth: "yieldnest-restaked-eth",
};

/**
 * Network (umbrella entity) slug → governance / protocol token on CoinGecko.
 * Separate from `COINGECKO_IDS` (member products). `null` = no suitable token;
 * universal pass then relies on Llama `gecko_id` only.
 */
export const NETWORK_COINGECKO_IDS: Record<string, string | null> = {
  aave: "aave",
  aerodrome: "aerodrome-finance",
  balancer: "balancer",
  centrifuge: "centrifuge",
  clearpool: "clearpool",
  compound: "compound-governance-token",
  "curve-finance": "curve-dao-token",
  "drift-protocol": "drift-protocol",
  dydx: "dydx-chain",
  ethena: "ethena",
  fluid: "instadapp",
  "gains-network": "gains-network",
  gmx: "gmx",
  goldfinch: "goldfinch",
  hyperliquid: "hyperliquid",
  justlend: "just",
  jupiter: "jupiter-exchange-solana",
  kamino: "kamino",
  maple: "syrup",
  morpho: "morpho",
  "ondo-finance": "ondo-finance",
  pancakeswap: "pancakeswap-token",
  raydium: "raydium",
  sky: "sky",
  spark: "spark-2",
  sushiswap: "sushi",
  thorchain: "thorchain",
  "trader-joe": "joe",
  uniswap: "uniswap",
  venus: "venus",
  frax: "frax",
  liquity: "liquity",
  "lista-dao": "lista",
  realt: "realtoken-ecosystem-governance",
  // Credit sector expansion — Leveraged Yield + Fixed Income gov tokens (verified 2026-06-25).
  gearbox: "gearbox",
  stella: "alpha-finance", // ex-Alpha Homora (ALPHA token)
  "extra-finance": null, // EXTRA not listed on CoinGecko
  pendle: "pendle",
  notional: "notional-finance",
  spectra: null, // no standalone tradable token
  sense: null,
  radiant: "radiant-capital",
  // Staking sector — LST/LRT or governance token for the universal pass (verified 2026-06-25).
  lido: "staked-ether",
  "rocket-pool": "rocket-pool-eth",
  "binance-wbeth": "wrapped-beacon-eth",
  "coinbase-cbeth": "coinbase-wrapped-staked-eth",
  "mantle-meth": "mantle-staked-ether",
  swell: "sweth",
  stader: "stader-ethx",
  stakewise: "stakewise-v3-oseth",
  ankr: "ankreth",
  eigenlayer: "eigenlayer",
  symbiotic: null, // TVL-only (no liquid token)
  karak: null,
  "ether-fi": "wrapped-eeth",
  renzo: "renzo-restaked-eth",
  "kelp-dao": "kelp-dao-restaked-eth",
  puffer: "pufeth",
  bedrock: "universal-eth",
  yieldnest: "yieldnest-restaked-eth",
  // Liquidity sector — governance token for the universal pass (verified 2026-06-25).
  // The five extend-existing DEX venues (curve-finance/uniswap/balancer/aerodrome/
  // pancakeswap) are already mapped above.
  gamma: "gamma-strategies",
  "yearn-finance": "yearn-finance",
  "convex-finance": "convex-finance",
  beefy: "beefy-finance",
  aura: "aura-finance",
  arrakis: null, // tokenless — TVL sourced from DeFi Llama only
  maverick: "maverick-protocol",
  // Stablecoin issuers / TradFi — no meaningful governance token for universals.
  tether: null,
  circle: null,
  monerium: null,
  paxos: null,
  "first-digital": null,
  bitget: null,
  stably: null,
  "gmo-trust": null,
  agora: null,
  cap: null,
  anzen: null,
  falcon: null,
  elixir: null,
  "mountain-protocol": null,
  resolv: null,
  reserve: null,
  "m-zero": null,
  "usd-ai": null,
  usdt0: null,
  "trueusd": null,
  "inverse-finance": null,
  "curve-stablecoin": null,
  // RWAs / early-stage — defer to Llama gecko_id when present.
  arcton: null,
  aryze: null,
  atmosphera: null,
  "chateau-capital": null,
  dinari: null,
  dualmint: null,
  "estate-protocol": null,
  "florence-finance": null,
  "franklin-templeton": null,
  "lofty-ai": null,
  "pleasing-market": null,
  securitize: null,
  "toucan-protocol": null,
};

/** Governance-token join key for a network slug (not member-product slugs). */
export function coinIdForNetworkSlug(slug: string): string | null {
  if (slug in NETWORK_COINGECKO_IDS) {
    return NETWORK_COINGECKO_IDS[slug] ?? null;
  }
  return null;
}

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
