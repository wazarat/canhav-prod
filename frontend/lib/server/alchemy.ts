import "server-only";

import { readSecret } from "@/lib/server/env";
import { fetchJson, nowIso } from "@/lib/server/http";

/**
 * Alchemy overlay — on-chain supply (stablecoins) and TVL (RWAs).
 *
 * TS port of `backend/app/live/alchemy.py`, using the free-tier Alchemy Arbitrum
 * JSON-RPC endpoint via `fetch`:
 *   - fetchTotalSupply(address, decimals?) reads totalSupply() (and decimals()
 *     if unknown) via eth_call and scales it.
 *   - fetchTotalValueLocked(holdings) sums supply_i * priceUsd_i across a
 *     protocol's token/vault contracts (an AUM/market-cap proxy for TVL — the
 *     free tier has no protocol-specific TVL feed).
 *   - Enhanced (live-render) helpers: fetchTokenMetadata, fetchRecentTransfers,
 *     fetchSupplyHistory — richer per-entity data for the detail pages.
 *
 * The `ALCHEMY_API_KEY` (and optional `ALCHEMY_ARBITRUM_BASE_URL`) are read via
 * `readSecret`, so they resolve from the deployment env (Vercel) or the shared
 * `backend/.env` locally. Everything fails soft: a missing key or any RPC error
 * yields value=null / [] so a page render is never blocked.
 */

const SELECTOR_TOTAL_SUPPLY = "0x18160ddd"; // totalSupply()
const SELECTOR_DECIMALS = "0x313ce567"; // decimals()
const DEFAULT_BASE_URL = "https://arb-mainnet.g.alchemy.com/v2";
// Keyless public Arbitrum RPC. Standard JSON-RPC reads (eth_call/eth_blockNumber
// /eth_getBlockByNumber) work here, so basic supply/TVL reads keep functioning
// when the Alchemy app lacks Arbitrum access or no key is set. The proprietary
// `alchemy_*` methods (token metadata / asset transfers) are unavailable on it
// and fail soft to null/[] as before.
const PUBLIC_FALLBACK_RPC = "https://arbitrum-one.publicnode.com";

export interface MetricResult {
  value: number | null;
  source: "alchemy";
  updatedAt: string | null;
}

export interface Holding {
  address: string;
  decimals: number | null;
  priceUsd: number | null;
}

/**
 * Ordered Arbitrum RPC endpoints, best first (see aave.ts for the same policy):
 * a genuine keyed Alchemy Arbitrum URL when configured, then the keyless public
 * Arbitrum RPC. A mis-set non-Arbitrum base is ignored and a base already ending
 * with the key is not double-appended.
 */
function arbitrumRpcUrls(): string[] {
  const urls: string[] = [];
  const key = readSecret("ALCHEMY_API_KEY");
  if (key) {
    let base = readSecret("ALCHEMY_ARBITRUM_BASE_URL") || DEFAULT_BASE_URL;
    if (!/arb/i.test(base)) base = DEFAULT_BASE_URL;
    base = base.replace(/\/+$/, "");
    urls.push(base.endsWith(key) ? base : `${base}/${key}`);
  }
  urls.push(PUBLIC_FALLBACK_RPC);
  return urls;
}

/** Whether an Alchemy key is configured (cheap guard before rendering panels). */
export function hasAlchemy(): boolean {
  return Boolean(readSecret("ALCHEMY_API_KEY"));
}

/**
 * Low-level JSON-RPC call. Tries each Arbitrum endpoint in order and returns the
 * first successful result, so a keyed endpoint that errors (e.g. Arbitrum not
 * enabled on the Alchemy app) transparently falls back to the public RPC. Pass
 * `revalidate` (seconds) for cached live-render reads; omit it for the cron path.
 */
async function rpcCall(method: string, params: unknown[], revalidate?: number): Promise<any | null> {
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });
  for (const url of arbitrumRpcUrls()) {
    const { data } = await fetchJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body,
      revalidate,
    });
    if (data && typeof data === "object" && !data.error) {
      return data.result ?? null;
    }
  }
  return null;
}

async function ethCall(
  to: string,
  data: string,
  block: string = "latest",
  revalidate?: number,
): Promise<string | null> {
  const result = await rpcCall("eth_call", [{ to, data }, block], revalidate);
  if (typeof result !== "string" || !result.startsWith("0x") || result.length <= 2) {
    return null;
  }
  return result;
}

function hexToBigInt(value: string | null): bigint | null {
  if (!value) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

/**
 * Live circulating supply (token units) for an Arbitrum token contract. Pass
 * `revalidate` (seconds) for cached live-render reads; omit it (the cron default)
 * for an always-fresh value.
 */
export async function fetchTotalSupply(
  tokenAddress: string,
  decimals: number | null = null,
  revalidate?: number,
): Promise<MetricResult> {
  const empty: MetricResult = { value: null, source: "alchemy", updatedAt: null };
  if (!tokenAddress) return empty;

  const raw = hexToBigInt(await ethCall(tokenAddress, SELECTOR_TOTAL_SUPPLY, "latest", revalidate));
  if (raw === null) return empty;

  let dec = decimals;
  if (dec === null || dec === undefined) {
    const decRaw = hexToBigInt(await ethCall(tokenAddress, SELECTOR_DECIMALS, "latest", revalidate));
    dec = decRaw === null ? 18 : Number(decRaw);
  }

  // Matches the Python float scaling (precision approximate at large magnitudes).
  const value = Number(raw) / 10 ** dec;
  return { value, source: "alchemy", updatedAt: nowIso() };
}

/**
 * Best-effort ERC-20 classification: a successful `decimals()` read implies a
 * standard fungible token on Arbitrum (Tier 1 §A tokenStandard).
 */
export async function probeErc20Standard(
  tokenAddress: string,
  revalidate?: number,
): Promise<string | null> {
  if (!tokenAddress) return null;
  const decRaw = hexToBigInt(await ethCall(tokenAddress, SELECTOR_DECIMALS, "latest", revalidate));
  if (decRaw === null) return null;
  return "ERC-20";
}

/**
 * Live total value locked (USD) for an RWA protocol: sum(supply_i * priceUsd_i)
 * over the protocol's token/vault contracts. value=null if nothing could be priced.
 */
export async function fetchTotalValueLocked(
  holdings: Holding[],
  revalidate?: number,
): Promise<MetricResult> {
  const empty: MetricResult = { value: null, source: "alchemy", updatedAt: null };
  if (!holdings.length) return empty;

  let total = 0;
  let pricedAny = false;
  for (const h of holdings) {
    const address = (h.address || "").trim();
    const price = h.priceUsd;
    if (!address || price === null || price === undefined) continue;
    const supply = await fetchTotalSupply(address, h.decimals, revalidate);
    if (supply.value === null) continue;
    total += supply.value * price;
    pricedAny = true;
  }

  if (!pricedAny) return empty;
  return { value: total, source: "alchemy", updatedAt: nowIso() };
}

/* -------------------------------------------------------------------------- */
/* Enhanced live-render helpers (detail pages)                                */
/* -------------------------------------------------------------------------- */

const LIVE_REVALIDATE = 300; // seconds; detail-page reads share a 5-min cache

export interface TokenMetadata {
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  logo: string | null;
}

/** ERC-20 metadata (name/symbol/decimals/logo) via `alchemy_getTokenMetadata`. */
export async function fetchTokenMetadata(address: string): Promise<TokenMetadata | null> {
  if (!address) return null;
  const result = await rpcCall("alchemy_getTokenMetadata", [address], LIVE_REVALIDATE);
  if (!result || typeof result !== "object") return null;
  return {
    name: typeof result.name === "string" ? result.name : null,
    symbol: typeof result.symbol === "string" ? result.symbol : null,
    decimals: typeof result.decimals === "number" ? result.decimals : null,
    logo: typeof result.logo === "string" && result.logo ? result.logo : null,
  };
}

export interface TokenTransfer {
  hash: string;
  from: string;
  to: string;
  /** Transfer amount in token units (already scaled by Alchemy), or null. */
  value: number | null;
  asset: string | null;
  /** ISO timestamp from block metadata, or null. */
  timestamp: string | null;
}

/**
 * Most-recent ERC-20 transfers for a token contract via `alchemy_getAssetTransfers`
 * (newest first). Returns [] on any failure so a panel can render an empty state.
 */
export async function fetchRecentTransfers(
  address: string,
  limit = 8,
): Promise<TokenTransfer[]> {
  if (!address) return [];
  const params = [
    {
      fromBlock: "0x0",
      toBlock: "latest",
      contractAddresses: [address],
      category: ["erc20"],
      order: "desc",
      withMetadata: true,
      excludeZeroValue: true,
      maxCount: `0x${Math.max(1, Math.min(limit, 100)).toString(16)}`,
    },
  ];
  const result = await rpcCall("alchemy_getAssetTransfers", params, LIVE_REVALIDATE);
  const transfers = result && Array.isArray(result.transfers) ? result.transfers : null;
  if (!transfers) return [];

  return transfers.slice(0, limit).map((t: any): TokenTransfer => {
    const ts = t?.metadata?.blockTimestamp;
    return {
      hash: typeof t.hash === "string" ? t.hash : "",
      from: typeof t.from === "string" ? t.from : "",
      to: typeof t.to === "string" ? t.to : "",
      value: typeof t.value === "number" ? t.value : null,
      asset: typeof t.asset === "string" ? t.asset : null,
      timestamp: typeof ts === "string" ? ts : null,
    };
  });
}

async function latestBlockNumber(): Promise<number | null> {
  const result = await rpcCall("eth_blockNumber", [], LIVE_REVALIDATE);
  const n = hexToBigInt(typeof result === "string" ? result : null);
  return n === null ? null : Number(n);
}

async function blockTimestamp(blockNumber: number): Promise<number | null> {
  const result = await rpcCall(
    "eth_getBlockByNumber",
    [`0x${blockNumber.toString(16)}`, false],
    LIVE_REVALIDATE,
  );
  const ts = result && typeof result === "object" ? hexToBigInt(result.timestamp ?? null) : null;
  return ts === null ? null : Number(ts);
}

export interface SupplyPoint {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Total supply in token units at that block. */
  value: number;
}

/**
 * Best-effort circulating-supply history: samples `totalSupply()` at a few
 * historical Arbitrum blocks (requires archive access on the free tier). Returns
 * [] if archive reads are unavailable or rate-limited — callers degrade
 * gracefully and hide the sparkline.
 */
export async function fetchSupplyHistory(
  address: string,
  decimals: number | null,
  { days = 30, points = 6 }: { days?: number; points?: number } = {},
): Promise<SupplyPoint[]> {
  if (!address) return [];

  const latest = await latestBlockNumber();
  if (latest === null) return [];

  // Estimate Arbitrum block cadence from a recent window, then walk back.
  const probeBack = 200_000;
  const probeBlock = Math.max(0, latest - probeBack);
  const [tNow, tProbe] = await Promise.all([blockTimestamp(latest), blockTimestamp(probeBlock)]);
  if (tNow === null || tProbe === null || tNow <= tProbe) return [];

  const secsPerBlock = (tNow - tProbe) / (latest - probeBlock);
  if (!Number.isFinite(secsPerBlock) || secsPerBlock <= 0) return [];

  const totalSecs = days * 86_400;
  const totalBlocks = Math.floor(totalSecs / secsPerBlock);
  const oldest = Math.max(0, latest - totalBlocks);
  const step = Math.max(1, Math.floor((latest - oldest) / Math.max(1, points - 1)));

  let dec = decimals;
  if (dec === null || dec === undefined) {
    const decRaw = hexToBigInt(await ethCall(address, SELECTOR_DECIMALS, "latest", LIVE_REVALIDATE));
    dec = decRaw === null ? 18 : Number(decRaw);
  }

  const out: SupplyPoint[] = [];
  for (let block = oldest; block <= latest; block += step) {
    const supplyRaw = hexToBigInt(
      await ethCall(address, SELECTOR_TOTAL_SUPPLY, `0x${block.toString(16)}`, LIVE_REVALIDATE),
    );
    if (supplyRaw === null) continue;
    const ts = await blockTimestamp(block);
    if (ts === null) continue;
    out.push({
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      value: Number(supplyRaw) / 10 ** dec,
    });
  }
  // De-duplicate by date (sampling can land on the same UTC day).
  const byDate = new Map<string, number>();
  for (const p of out) byDate.set(p.date, p.value);
  return Array.from(byDate, ([date, value]) => ({ date, value })).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}
