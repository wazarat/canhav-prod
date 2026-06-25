import "server-only";

import { fetchMarketData } from "@/lib/server/coingecko";
import { fetchLlamaFeesRevenue, fetchLlamaProtocolMeta } from "@/lib/server/defillama";
import { nowIso, sleep } from "@/lib/server/http";
import type { StakingSeed } from "@/data/staking-seed";
import type { ProtocolFeesRevenue, Sourced, StakingMetrics } from "@/lib/types";

/**
 * Staking-sector Tier-1 collector.
 *
 * Reuses the existing DeFiLlama + CoinGecko clients — no new HTTP plumbing.
 * Populates the live Tier-1 fields and leaves Tier-2 (validators, AVS exposure,
 * slashing, governance) curated/null until per-protocol indexers are wired.
 *
 * Per seed:
 *   1. llama  = fetchLlamaProtocolMeta(llamaSlug)  -> totalStakedUsd, tvlChangePct, chains
 *   2. fees   = fetchLlamaFeesRevenue(llamaSlug)   -> feesRevenue
 *   3. cg     = coingeckoId ? fetchMarketData(id)  -> tokenPriceUsd, marketCapUsd
 *   4. ETH market (fetched once) -> baseAssetExchangeRate (price ratio, derived)
 *   5. marketSharePct derived across the same sub-sector after all seeds fetched
 *
 * `pegDeviationPct` is intentionally left null: a true depeg figure needs each
 * protocol's redemption/exchange-rate oracle (non-rebasing LRTs like rETH/weETH
 * legitimately trade above 1 ETH), so reporting deviation from parity would be
 * misleading. It stays a Tier-2 curated field until oracles are wired.
 */
const COINGECKO_DELAY_MS = 1_500; // free/demo-tier etiquette (100 calls/min)

function sourced<T>(
  value: T,
  sourceLabel: string,
  dataSource: "live" | "derived" = "live",
): Sourced<T> {
  return { value, dataSource, sourceLabel, updatedAt: nowIso() };
}

function mapFeesRevenue(
  fees: NonNullable<Awaited<ReturnType<typeof fetchLlamaFeesRevenue>>>,
): ProtocolFeesRevenue {
  return {
    fees24hUsd: fees.fees24hUsd,
    fees7dUsd: fees.fees7dUsd,
    fees30dUsd: fees.fees30dUsd,
    feesAllTimeUsd: fees.feesAllTimeUsd,
    revenue24hUsd: fees.revenue24hUsd,
    revenue7dUsd: fees.revenue7dUsd,
    revenue30dUsd: fees.revenue30dUsd,
    holdersRevenue24hUsd: fees.holdersRevenue24hUsd,
    feesChange1dPct: fees.feesChange1dPct,
    methodology: fees.methodology,
    methodologyUrl: fees.methodologyUrl,
    llamaCategory: fees.category,
    source: "defillama",
    updatedAt: nowIso(),
  };
}

/** Collect live Tier-1 metrics for one seed. `marketSharePct` is filled later. */
export async function collectStakingMetrics(
  seed: StakingSeed,
  ethPriceUsd: number | null,
): Promise<StakingMetrics> {
  const metrics: StakingMetrics = {};

  // 1 + 2. DeFiLlama TVL + change + chains + fees (skip when no slug, e.g. Karak).
  if (seed.llamaSlug) {
    const meta = await fetchLlamaProtocolMeta(seed.llamaSlug);
    if (meta) {
      if (meta.tvlUsdLatest != null) {
        metrics.totalStakedUsd = sourced(meta.tvlUsdLatest, "DeFi Llama");
      }
      metrics.tvlChangePct = { d1: meta.tvlChangePct.d1, d7: meta.tvlChangePct.d7 };
      if (meta.currentChainTvls.length > 0) {
        metrics.deployment = {
          chains: meta.currentChainTvls.map((c) => c.chain),
          evmCompatible: "yes",
        };
      }
    }
    const fees = await fetchLlamaFeesRevenue(seed.llamaSlug);
    if (fees) metrics.feesRevenue = mapFeesRevenue(fees);
  }

  // 3. CoinGecko token market (price + market cap).
  let tokenPriceUsd: number | null = null;
  if (seed.coingeckoId) {
    const cg = await fetchMarketData(seed.coingeckoId);
    await sleep(COINGECKO_DELAY_MS);
    if (cg) {
      tokenPriceUsd = cg.currentPrice;
      if (cg.currentPrice != null) metrics.tokenPriceUsd = sourced(cg.currentPrice, "CoinGecko");
      if (cg.marketCap != null) metrics.marketCapUsd = sourced(cg.marketCap, "CoinGecko");
    }
  }

  // 4. Base-asset exchange rate (price ratio vs ETH) for ETH-denominated tokens.
  if (seed.token && tokenPriceUsd != null && ethPriceUsd != null && ethPriceUsd > 0) {
    metrics.underlyingAsset = "ETH";
    metrics.baseAssetExchangeRate = sourced(
      tokenPriceUsd / ethPriceUsd,
      "Derived (CoinGecko)",
      "derived",
    );
  }

  return metrics;
}

/**
 * Collect Tier-1 metrics for every seed, then derive `marketSharePct` within
 * each sub-sector from the summed `totalStakedUsd`. Fetches the ETH market once
 * (shared base-asset price) to stay within the CoinGecko rate budget.
 */
export async function collectAllStakingMetrics(
  seeds: StakingSeed[],
): Promise<Map<string, StakingMetrics>> {
  const eth = await fetchMarketData("ethereum");
  await sleep(COINGECKO_DELAY_MS);
  const ethPriceUsd = eth?.currentPrice ?? null;

  const out = new Map<string, StakingMetrics>();
  for (const seed of seeds) {
    out.set(seed.slug, await collectStakingMetrics(seed, ethPriceUsd));
  }

  // Derive market share within each sub-sector.
  const totalsBySubSector = new Map<string, number>();
  for (const seed of seeds) {
    const v = out.get(seed.slug)?.totalStakedUsd?.value ?? null;
    if (v != null && v > 0) {
      totalsBySubSector.set(seed.subSector, (totalsBySubSector.get(seed.subSector) ?? 0) + v);
    }
  }
  for (const seed of seeds) {
    const m = out.get(seed.slug);
    if (!m) continue;
    const total = totalsBySubSector.get(seed.subSector) ?? 0;
    const v = m.totalStakedUsd?.value ?? null;
    if (total > 0 && v != null && v > 0) {
      m.marketSharePct = (v / total) * 100;
    }
  }
  return out;
}
