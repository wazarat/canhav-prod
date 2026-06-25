import "server-only";

import { fetchMarketData } from "@/lib/server/coingecko";
import { nowIso } from "@/lib/server/http";
import type { StakingSeed } from "@/data/staking-seed";
import type { Sourced, StakingMetrics } from "@/lib/types";

/**
 * Minimal Staking-sector collector (stub).
 *
 * Reuses the existing DeFiLlama + CoinGecko clients — no new HTTP plumbing.
 * Today it populates the CoinGecko-backed Tier-1 fields (token price + market
 * cap) for seeds that expose a `coingeckoId`. The DeFiLlama TVL/fees overlay and
 * all Tier-2 fields (validators, AVS exposure, slashing, governance) are left as
 * documented TODOs — wiring them is part of the deferred full collector + entity
 * authoring (see the deferred-tasks ledger).
 *
 * Contract (full version):
 *   1. llama  = fetchLlamaProtocolMeta(slug)        -> totalStakedUsd, chains, tvlChangePct
 *   2. fees   = fetchLlamaFeesRevenue(slug)         -> feesRevenue
 *   3. cg     = coingeckoId ? fetchMarketData(id)   -> tokenPriceUsd, marketCapUsd
 *   4. ethCg  = fetchMarketData("ethereum")         -> baseAssetExchangeRate / pegDeviationPct
 *   5. marketSharePct derived across the same sub-sector after all seeds fetched
 */
function sourced<T>(value: T, sourceLabel: string): Sourced<T> {
  return { value, dataSource: "live", sourceLabel, updatedAt: nowIso() };
}

export async function collectStakingMetrics(seed: StakingSeed): Promise<StakingMetrics> {
  const metrics: StakingMetrics = {};

  if (seed.coingeckoId) {
    const cg = await fetchMarketData(seed.coingeckoId);
    if (cg) {
      metrics.tokenPriceUsd = sourced(cg.currentPrice, "CoinGecko");
      metrics.marketCapUsd = sourced(cg.marketCap, "CoinGecko");
    }
  }

  // TODO (deferred full collector): totalStakedUsd + tvlChangePct via
  // fetchLlamaProtocolMeta(seed.slug); feesRevenue via fetchLlamaFeesRevenue;
  // baseAssetExchangeRate / pegDeviationPct vs ETH; marketSharePct derived per
  // sub-sector. Karak's llamaSlug must be resolved manually before relying.
  // Tier-2 fields (validatorCount, avsData, slashingEvents, governanceDetail)
  // stay curated/null until indexers are wired.

  return metrics;
}
