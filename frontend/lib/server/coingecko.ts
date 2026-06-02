import "server-only";

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
  "inverse-finance": "dola-usd",
  monerium: "monerium-eur-money",
  sky: "usds",
  stably: null,
  tether: "tether",
  trueusd: "true-usd",
  "usd-ai": null,
  usdc: "usd-coin",
  usdt0: "usdt0",
  // RWAs (most have no CoinGecko-listed Arbitrum token yet)
  arcton: null,
  aryze: null,
  atmosphera: null,
  centrifuge: "centrifuge",
  "chateau-capital": null,
  dinari: null,
  dualmint: null,
  "estate-protocol": null,
  "florence-finance": null,
  "franklin-templeton": null,
};

export interface TokenResolution {
  coinId: string;
  address: string | null;
  decimals: number | null;
  priceUsd: number | null;
  source: "coingecko";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJson(url: string, timeoutMs = 20_000): Promise<any | null> {
  const headers: Record<string, string> = {
    "User-Agent": "canhav-research/1.0",
    Accept: "application/json",
  };
  const apiKey = process.env.COINGECKO_API_KEY;
  if (apiKey) headers["x-cg-demo-api-key"] = apiKey;

  const attempt = async (): Promise<any | null> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers, signal: controller.signal, cache: "no-store" });
      if (res.status === 429) return { __rateLimited: true };
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  let data = await attempt();
  if (data && data.__rateLimited) {
    await sleep(8_000); // back off once and retry
    data = await attempt();
    if (data && data.__rateLimited) return null;
  }
  return data;
}

/** Resolve a CoinGecko coin id to its Arbitrum address + USD price. */
export async function resolveCoin(coinId: string): Promise<TokenResolution | null> {
  const params = new URLSearchParams({
    localization: "false",
    tickers: "false",
    market_data: "true",
    community_data: "false",
    developer_data: "false",
    sparkline: "false",
  });
  const data = await getJson(`${COINGECKO_BASE}/coins/${encodeURIComponent(coinId)}?${params}`);
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
export async function resolveForSlug(slug: string): Promise<TokenResolution | null> {
  const coinId = COINGECKO_IDS[slug];
  if (!coinId) return null;
  return resolveCoin(coinId);
}
