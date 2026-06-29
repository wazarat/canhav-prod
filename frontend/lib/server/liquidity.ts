import "server-only";

import { fetchMarketData } from "@/lib/server/coingecko";
import { fetchLlamaDexVolume, fetchLlamaFeesRevenue, fetchLlamaProtocolMeta } from "@/lib/server/defillama";
import { nowIso, sleep } from "@/lib/server/http";
import type { LiquiditySeed } from "@/data/liquidity-seed";
import type { LiquidityMetrics, ProtocolFeesRevenue, Sourced } from "@/lib/types";

/**
 * Liquidity-sector Tier-1 collector.
 *
 * Reuses the existing DeFiLlama + CoinGecko clients — no new HTTP plumbing.
 * Populates the live Tier-1 fields (tvlUsd, tvlChangePct, chains, fees, token
 * price/mcap) and leaves Tier-2 (poolCount, vaultCount, avgVaultApyPct,
 * underlyingProtocols, governance) curated/null until per-protocol indexers are
 * wired.
 *
 * Per seed:
 *   1. llama = fetchLlamaProtocolMeta(slug) -> tvlUsd, tvlChangePct, chains
 *   2. fees  = fetchLlamaFeesRevenue(slug)  -> feesRevenue
 *   3. cg    = coingeckoId ? fetchMarketData(id) -> tokenPriceUsd, marketCapUsd
 *   4. marketSharePct derived across the same sub-sector after all seeds fetched
 *
 * Tokenless protocols (e.g. Arrakis) carry the Llama TVL only — their network
 * headline number comes from `liquidity.tvlUsd` (see lib/data.ts), since there
 * is no governance token market cap to aggregate.
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
export async function collectLiquidityMetrics(seed: LiquiditySeed): Promise<LiquidityMetrics> {
  const metrics: LiquidityMetrics = {};

  // 1 + 2. DeFiLlama TVL + change + chains + fees (skip when no slug).
  // Resolution goes through LLAMA_PROTOCOL_SLUGS keyed by canhav slug — not raw llama slug.
  if (seed.llamaSlug) {
    const meta = await fetchLlamaProtocolMeta(seed.slug);
    if (meta) {
      if (meta.tvlUsdLatest != null) {
        metrics.tvlUsd = sourced(meta.tvlUsdLatest, "DeFi Llama");
      }
      metrics.tvlChangePct = { d1: meta.tvlChangePct.d1, d7: meta.tvlChangePct.d7 };
      if (meta.currentChainTvls.length > 0) {
        metrics.deployment = {
          chains: meta.currentChainTvls.map((c) => c.chain),
          evmCompatible: "yes",
        };
      }
    }
    const fees = await fetchLlamaFeesRevenue(seed.slug);
    if (fees) metrics.feesRevenue = mapFeesRevenue(fees);

    if (seed.subSector === "Pools") {
      const dexVol = await fetchLlamaDexVolume(seed.slug);
      if (dexVol?.volume24hUsd != null) {
        metrics.volume24hUsd = sourced(dexVol.volume24hUsd, "DeFi Llama");
      }
      const tvl = metrics.tvlUsd?.value;
      const fees24h = fees?.fees24hUsd;
      if (tvl != null && tvl > 0 && fees24h != null && fees24h > 0) {
        metrics.feeAprPct = sourced((fees24h / tvl) * 365 * 100, "Derived", "derived");
      }
    }
  }

  // 3. CoinGecko token market (price + market cap). Tokenless seeds skip this.
  if (seed.coingeckoId) {
    const cg = await fetchMarketData(seed.coingeckoId);
    await sleep(COINGECKO_DELAY_MS);
    if (cg) {
      if (cg.currentPrice != null) metrics.tokenPriceUsd = sourced(cg.currentPrice, "CoinGecko");
      if (cg.marketCap != null) metrics.marketCapUsd = sourced(cg.marketCap, "CoinGecko");
    }
  }

  return metrics;
}

/**
 * Collect Tier-1 metrics for every seed, then derive `marketSharePct` within
 * each sub-sector (Pools / Vaults) from the summed `tvlUsd`.
 */
export async function collectAllLiquidityMetrics(
  seeds: LiquiditySeed[],
): Promise<Map<string, LiquidityMetrics>> {
  const out = new Map<string, LiquidityMetrics>();
  for (const seed of seeds) {
    out.set(seed.slug, await collectLiquidityMetrics(seed));
  }

  // Derive market share within each sub-sector.
  const totalsBySubSector = new Map<string, number>();
  for (const seed of seeds) {
    const v = out.get(seed.slug)?.tvlUsd?.value ?? null;
    if (v != null && v > 0) {
      totalsBySubSector.set(seed.subSector, (totalsBySubSector.get(seed.subSector) ?? 0) + v);
    }
  }
  for (const seed of seeds) {
    const m = out.get(seed.slug);
    if (!m) continue;
    const total = totalsBySubSector.get(seed.subSector) ?? 0;
    const v = m.tvlUsd?.value ?? null;
    if (total > 0 && v != null && v > 0) {
      m.marketSharePct = (v / total) * 100;
    }
  }
  return out;
}
