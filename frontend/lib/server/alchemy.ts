import "server-only";

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
 *
 * Both fail soft: a missing ALCHEMY_API_KEY or any RPC error yields value=null.
 */

const SELECTOR_TOTAL_SUPPLY = "0x18160ddd"; // totalSupply()
const SELECTOR_DECIMALS = "0x313ce567"; // decimals()
const DEFAULT_BASE_URL = "https://arb-mainnet.g.alchemy.com/v2";

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

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function rpcUrl(): string | null {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) return null;
  const base = process.env.ALCHEMY_ARBITRUM_BASE_URL || DEFAULT_BASE_URL;
  return `${base.replace(/\/$/, "")}/${key}`;
}

async function ethCall(
  url: string,
  to: string,
  data: string,
  timeoutMs = 20_000,
): Promise<string | null> {
  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_call",
    params: [{ to, data }, "latest"],
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = await res.json();
    if (!body || typeof body !== "object" || body.error) return null;
    const result = body.result;
    if (typeof result !== "string" || !result.startsWith("0x") || result.length <= 2) {
      return null;
    }
    return result;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function hexToBigInt(value: string | null): bigint | null {
  if (!value) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

/** Live circulating supply (token units) for an Arbitrum token contract. */
export async function fetchTotalSupply(
  tokenAddress: string,
  decimals: number | null = null,
): Promise<MetricResult> {
  const empty: MetricResult = { value: null, source: "alchemy", updatedAt: null };
  const url = rpcUrl();
  if (!url || !tokenAddress) return empty;

  const raw = hexToBigInt(await ethCall(url, tokenAddress, SELECTOR_TOTAL_SUPPLY));
  if (raw === null) return empty;

  let dec = decimals;
  if (dec === null || dec === undefined) {
    const decRaw = hexToBigInt(await ethCall(url, tokenAddress, SELECTOR_DECIMALS));
    dec = decRaw === null ? 18 : Number(decRaw);
  }

  // Matches the Python float scaling (precision approximate at large magnitudes).
  const value = Number(raw) / 10 ** dec;
  return { value, source: "alchemy", updatedAt: nowIso() };
}

/**
 * Live total value locked (USD) for an RWA protocol: sum(supply_i * priceUsd_i)
 * over the protocol's token/vault contracts. value=null if nothing could be priced.
 */
export async function fetchTotalValueLocked(holdings: Holding[]): Promise<MetricResult> {
  const empty: MetricResult = { value: null, source: "alchemy", updatedAt: null };
  const url = rpcUrl();
  if (!url || !holdings.length) return empty;

  let total = 0;
  let pricedAny = false;
  for (const h of holdings) {
    const address = (h.address || "").trim();
    const price = h.priceUsd;
    if (!address || price === null || price === undefined) continue;
    const supply = await fetchTotalSupply(address, h.decimals);
    if (supply.value === null) continue;
    total += supply.value * price;
    pricedAny = true;
  }

  if (!pricedAny) return empty;
  return { value: total, source: "alchemy", updatedAt: nowIso() };
}
