import "server-only";

import { resolveCoinsBatch } from "@/lib/server/coingecko";
import { fetchLlamaProtocolMeta, resolveLlamaYieldPool } from "@/lib/server/defillama";
import type { LlamaPool } from "@/lib/server/defillama";

export interface CoinMarketSnapshot {
  price_usd: number;
  market_cap_usd: number;
  fdv_usd: number | null;
  circ_supply: number | null;
  total_supply: number | null;
  volume_24h_usd: number;
}

/** Batch market snapshot — thin wrapper over resolveCoinsBatch. */
export async function fetchCoinMarkets(
  geckoIds: string[],
): Promise<Record<string, CoinMarketSnapshot>> {
  const batch = await resolveCoinsBatch([...new Set(geckoIds.filter(Boolean))]);
  const out: Record<string, CoinMarketSnapshot> = {};
  for (const [id, row] of batch) {
    if (row.priceUsd == null) continue;
    out[id] = {
      price_usd: row.priceUsd,
      market_cap_usd: row.marketCapUsd ?? 0,
      fdv_usd: row.fdvUsd,
      circ_supply: row.circulatingSupply,
      total_supply: row.totalSupplyUnits,
      volume_24h_usd: row.volume24hUsd ?? 0,
    };
  }
  return out;
}

/** Apply CoinType peg deviation and staking APR hints onto a store item. */
export async function enrichCoinTaxonomyOnItem(
  item: Record<string, unknown>,
  slug: string,
  priceUsd: number | null,
  llamaPools: LlamaPool[],
): Promise<boolean> {
  const coinType = String(item.CoinType ?? "");
  let mutated = false;

  if (
    (coinType === "NativeStablecoin" || coinType === "SyntheticDollar") &&
    priceUsd != null
  ) {
    item.PegDeviation = priceUsd - 1;
    mutated = true;
  }

  if (coinType === "GovernanceUtility" || coinType === "LockedEscrow") {
    const pool = resolveLlamaYieldPool(slug, llamaPools);
    if (pool?.apyPct != null) {
      item.StakingApr = pool.apyPct;
      mutated = true;
    }
  }

  return mutated;
}

/** Enrich a Receipt store item with type-appropriate Tier 1 metrics. */
export async function enrichReceiptOnItem(
  item: Record<string, unknown>,
  slug: string,
  resolution: { priceUsd: number | null } | null,
  llamaPools: LlamaPool[],
): Promise<boolean> {
  const receiptType = String(item.ReceiptType ?? "");
  let mutated = false;
  const priceUsd = resolution?.priceUsd ?? null;

  if (priceUsd != null) {
    item.PriceUsd = priceUsd;
    mutated = true;
  }

  const entitySlug = String(item.EntitySlug ?? slug);
  try {
    const meta = await fetchLlamaProtocolMeta(entitySlug);
    const tvl = meta?.tvlUsdLatest ?? null;
    if (tvl != null && tvl > 0) {
      if (receiptType === "TokenizedRWA") {
        item.AumUsd = tvl;
      } else {
        item.UnderlyingTvlUsd = tvl;
      }
      mutated = true;
    }
  } catch {
    // Tier 2 / fail soft
  }

  const pool = resolveLlamaYieldPool(slug, llamaPools);
  if (pool?.apyPct != null) {
    item.Apr = pool.apyPct;
    mutated = true;
  }

  if (
    (receiptType === "StakedStablecoin" ||
      receiptType === "LiquidStaking" ||
      receiptType === "LiquidRestaking") &&
    priceUsd != null
  ) {
    // peg vs ETH/USD base approximated when price available
    item.PegDeviation = priceUsd - 1;
    mutated = true;
  }

  if (receiptType === "LendingReceipt") {
    item.PriceUsd = null;
    mutated = true;
  }

  return mutated;
}
