import "server-only";

import { fetchMarketData } from "@/lib/server/coingecko";
import { fetchLlamaFeesRevenue, fetchLlamaProtocolMeta } from "@/lib/server/defillama";
import { nowIso, sleep } from "@/lib/server/http";
import type { DerivativesSeed } from "@/data/derivatives-seed";
import type { DerivativesMetrics, ProtocolFeesRevenue, Sourced } from "@/lib/types";

/**
 * Derivatives-sector Tier-1 collector.
 *
 * Reuses the existing DeFiLlama + CoinGecko clients — no new HTTP plumbing.
 * Populates the live Tier-1 fields (tvlUsd, tvlChangePct, chains, fees, token
 * price/mcap) and leaves Tier-2 (maxLeverageX, supportedMarkets, vaultStrategies,
 * hedgeVenue, fundingRatePct, governance) curated/null until per-protocol
 * indexers are wired. `openInterestUsd` / `volume24hUsd` are schema-reserved —
 * DeFi Llama's derivatives summary endpoints aren't wired into the shared client
 * yet, so they stay null rather than reporting a fabricated value.
 *
 * Per seed:
 *   1. llama = fetchLlamaProtocolMeta(llamaSlug) -> tvlUsd, tvlChangePct, chains
 *   2. fees  = fetchLlamaFeesRevenue(llamaSlug)  -> feesRevenue
 *   3. cg    = coingeckoId ? fetchMarketData(id) -> tokenPriceUsd, marketCapUsd
 *   4. marketSharePct derived across the same sub-sector after all seeds fetched
 *
 * Tokenless protocols (e.g. Rage Trade, Neutra, Dopex) carry the Llama TVL only —
 * their network headline number comes from `derivatives.tvlUsd` (see lib/data.ts),
 * since there is no governance token market cap to aggregate.
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
export async function collectDerivativesMetrics(seed: DerivativesSeed): Promise<DerivativesMetrics> {
  const metrics: DerivativesMetrics = {};

  // 1 + 2. DeFiLlama TVL + change + chains + fees (skip when no slug). Resolution
  // goes through LLAMA_PROTOCOL_SLUGS, which is keyed by the canhav entity slug
  // (see defillama.ts) — so we resolve by `seed.slug`, not the raw llama slug.
  // The `seed.llamaSlug` guard just gates whether a Llama adapter is expected.
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
 * each sub-sector (Perp DEX / Option Vaults / Delta-Neutral) from the summed
 * `tvlUsd`.
 */
export async function collectAllDerivativesMetrics(
  seeds: DerivativesSeed[],
): Promise<Map<string, DerivativesMetrics>> {
  const out = new Map<string, DerivativesMetrics>();
  for (const seed of seeds) {
    out.set(seed.slug, await collectDerivativesMetrics(seed));
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
