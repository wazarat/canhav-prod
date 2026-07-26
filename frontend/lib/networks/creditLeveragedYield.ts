import "server-only";

import { cache } from "react";

import type { MetricBandModel } from "@/components/networks/credit/CreditMetricBands";
import type { LeverageCurveInputs } from "@/components/networks/credit/LeverageCurve";
import { fetchLlamaPools, type LlamaPool } from "@/lib/server/defillama";
import type { NetworkProfile } from "@/lib/types";
import type { TimeRange } from "@/lib/networks/timeRange";
import { card, sourcedNumber } from "@/lib/networks/metricCardHelpers";
import { buildSharedCreditBand } from "@/lib/networks/creditShared";

const POOLS_BORROW_402_CAVEAT =
  "Tier 2 in the metrics spec; the poolsBorrow endpoint moved behind the DeFi Llama paid plan (HTTP 402, verified 2026-07-26).";

/** slug -> DeFi Llama yields project(s) whose pools carry the base strategy APY. */
const LY_YIELD_PROJECTS: Record<string, string[]> = {
  gearbox: ["gearbox"],
  "extra-finance": ["extra-finance-leverage-farming", "extra-finance-xlend"],
  fluid: ["fluid-lending"],
  stella: [],
};

/** Tracked-network slugs for the dependency chip chain (lowercased names). */
const TRACKED_PROTOCOL_SLUGS: Record<string, string> = {
  aave: "aave",
  "aave v3": "aave",
  compound: "compound",
  morpho: "morpho",
  spark: "spark",
  pendle: "pendle",
  curve: "curve-finance",
  convex: "convex-finance",
  lido: "lido",
  uniswap: "uniswap",
  balancer: "balancer",
  velodrome: "velodrome",
  aerodrome: "aerodrome",
  gearbox: "gearbox",
  fluid: "fluid",
};

/** Everything the Leveraged Yield tag panel renders (JSON-safe). */
export interface LeveragedYieldPanelData {
  bands: MetricBandModel[];
  /** Interactive leverage-curve inputs; null when base or borrow APY is missing. */
  leverageCurve: LeverageCurveInputs | null;
  /** Dependency chip chain: protocol names + tracked-slug links. */
  chipChain: { protocols: string[]; trackedSlugsByName: Record<string, string> } | null;
  /** Position distribution by leverage band is Tier 2 (Dune); honest empty slot. */
  positionDistributionDeferred: true;
}

function baseStrategyApy(slug: string, pools: LlamaPool[]): { apyPct: number; label: string } | null {
  const projects = LY_YIELD_PROJECTS[slug] ?? [];
  if (projects.length === 0) return null;
  const set = new Set(projects.map((p) => p.toLowerCase()));
  let weighted = 0;
  let weight = 0;
  let best: LlamaPool | null = null;
  for (const p of pools) {
    if (!set.has(p.project.toLowerCase())) continue;
    const tvl = p.tvlUsd ?? 0;
    const apy = p.apy ?? p.apyBase;
    if (apy != null && tvl > 0) {
      weighted += apy * tvl;
      weight += tvl;
      if (!best || tvl > (best.tvlUsd ?? 0)) best = p;
    }
  }
  if (weight === 0) return null;
  return {
    apyPct: weighted / weight,
    label: best ? `TVL-weighted across ${best.project} pools` : "TVL-weighted",
  };
}

/**
 * Leveraged Yield LY1-LY11 (docs/credit/metrics-spec.md section 3.3) as
 * labelled bands plus the interactive leverage curve (CAN-68). Live values:
 * TVL from the cron tag pass, base strategy APY from the free DeFi Llama
 * /pools endpoint. Curated: max leverage, strategies, integrated protocols,
 * borrow model, liquidation threshold, borrow-APY fallback. Tier 2 (honest
 * chips): borrow APY when uncurated, active positions, outstanding debt,
 * liquidations.
 */
export const buildLeveragedYieldBands = cache(
  async (profile: NetworkProfile, range: TimeRange): Promise<LeveragedYieldPanelData> => {
    const slug = profile.slug;
    const ly = profile.creditTagMetrics?.leveragedYield ?? null;
    const nowIso = new Date().toISOString();

    const [shared, pools] = await Promise.all([
      buildSharedCreditBand(profile, range),
      fetchLlamaPools(300).catch(() => [] as LlamaPool[]),
    ]);

    const base = baseStrategyApy(slug, pools);
    const borrowApy = sourcedNumber(ly?.borrowApyPct);
    const maxLeverage = ly?.maxLeverageX ?? null;
    const netLoopingStored = sourcedNumber(ly?.loopingApyNetPct);
    const netLoopingDerived =
      base != null && borrowApy != null && maxLeverage != null
        ? base.apyPct * maxLeverage - borrowApy * (maxLeverage - 1)
        : null;
    const netLooping = netLoopingDerived ?? netLoopingStored;

    const lyCards = [
      card({
        id: "ly-tvl",
        label: "TVL",
        kind: "usd",
        unit: "usd",
        value: sourcedNumber(ly?.tvlUsd),
        ...(ly?.tvlUsd?.value != null
          ? {
              dataSource: ly.tvlUsd.dataSource,
              sourceLabel: ly.tvlUsd.sourceLabel ?? "DeFi Llama",
              asOf: ly.tvlUsd.updatedAt ?? null,
            }
          : {}),
        calculation: "Protocol TVL from the DeFi Llama protocol endpoint (spec row LY1).",
      }),
      card({
        id: "ly-max-leverage",
        label: "Max leverage",
        kind: "text",
        unit: "ratio",
        value: maxLeverage != null ? `${maxLeverage}x` : null,
        sourceLabel: maxLeverage != null ? "Curated" : null,
        seriesNote: "Curated field; no series",
        calculation:
          "Maximum leverage multiple the protocol permits (spec row LY2), from protocol docs.",
        caveats: ["Curated field; refreshed editorially, not by the cron."],
      }),
      card({
        id: "ly-base-apy",
        label: "Base strategy APY",
        kind: "pct",
        unit: "pct",
        value: base?.apyPct ?? null,
        ...(base != null
          ? {
              dataSource: "derived" as const,
              sourceLabel: "DeFi Llama pools (derived)",
              sourceUrl: "https://yields.llama.fi/pools",
              asOf: nowIso,
            }
          : {}),
        hint: base?.label ?? null,
        calculation:
          "TVL-weighted APY of the protocol's unleveraged strategy pools on the free DeFi Llama pools endpoint: the 1x input to the looping model.",
      }),
      card({
        id: "ly-borrow-apy",
        label: "Borrow APY (underlying)",
        kind: "pct",
        unit: "pct",
        value: borrowApy,
        ...(ly?.borrowApyPct?.value != null
          ? {
              dataSource: ly.borrowApyPct.dataSource,
              sourceLabel: ly.borrowApyPct.sourceLabel ?? "Curated",
              asOf: ly.borrowApyPct.updatedAt ?? null,
            }
          : {}),
        emptyChip: borrowApy == null ? "Tier 2" : null,
        calculation:
          "Cost of the debt leg used for looping (spec row LY3). Live values need the paid poolsBorrow endpoint; curated per entity until then.",
        caveats: [POOLS_BORROW_402_CAVEAT],
      }),
      card({
        id: "ly-net-looping",
        label: `Net looping APY${maxLeverage != null ? ` (${maxLeverage}x)` : ""}`,
        kind: "pct",
        unit: "pct",
        value: netLooping,
        ...(netLooping != null
          ? { dataSource: "derived" as const, sourceLabel: "Derived", asOf: nowIso }
          : {}),
        calculation:
          "Base APY × L minus borrow APY × (L − 1) at the protocol's max leverage (spec row LY4, derived). The leverage curve below recomputes this live at any multiple.",
      }),
      card({
        id: "ly-strategies",
        label: "Underlying strategies",
        kind: "text",
        unit: "count",
        value: ly?.supportedStrategies?.length ? ly.supportedStrategies.join(", ") : null,
        sourceLabel: ly?.supportedStrategies?.length ? "Curated" : null,
        seriesNote: "List metric; no series",
        calculation: "Yield strategies the protocol loops on (spec row LY5), from docs.",
        caveats: ["Curated field; refreshed editorially, not by the cron."],
      }),
      card({
        id: "ly-integrated",
        label: "Integrated protocols",
        kind: "text",
        unit: "count",
        value: ly?.integratedProtocols?.length ? ly.integratedProtocols.join(", ") : null,
        sourceLabel: ly?.integratedProtocols?.length ? "Curated" : null,
        seriesNote: "List metric; no series",
        calculation:
          "Protocols this venue depends on for yield and debt (spec row LY6); the dependency chain below links the tracked ones.",
        caveats: ["Curated field; refreshed editorially, not by the cron."],
      }),
      card({
        id: "ly-borrow-model",
        label: "Borrow model",
        kind: "text",
        unit: "count",
        value: ly?.borrowModel ?? null,
        sourceLabel: ly?.borrowModel ? "Curated" : null,
        seriesNote: "Curated field; no series",
        calculation:
          "How debt is provisioned: credit accounts (Gearbox), pool-based looping, pay-as-you-earn (spec row LY7).",
        caveats: ["Curated field; refreshed editorially, not by the cron."],
      }),
      card({
        id: "ly-liq-threshold",
        label: "Liquidation threshold",
        kind: "pct",
        unit: "pct",
        value: sourcedNumber(ly?.liquidationThresholdPct),
        ...(ly?.liquidationThresholdPct?.value != null
          ? {
              dataSource: ly.liquidationThresholdPct.dataSource,
              sourceLabel: ly.liquidationThresholdPct.sourceLabel ?? "Curated",
              asOf: ly.liquidationThresholdPct.updatedAt ?? null,
            }
          : {}),
        calculation:
          "Health threshold below which positions are liquidatable (spec row LY8); on-chain-readable for Gearbox, curated meanwhile.",
      }),
      card({
        id: "ly-active-positions",
        label: "Active positions",
        kind: "count",
        unit: "count",
        value: sourcedNumber(ly?.activePositions),
        emptyChip: sourcedNumber(ly?.activePositions) == null ? "Tier 2" : null,
        calculation: "Open leveraged positions (spec row LY9), subgraph or Dune.",
        caveats: ["Tier 2: needs a subgraph or Dune query; wired nullable."],
      }),
      card({
        id: "ly-outstanding-debt",
        label: "Outstanding debt",
        kind: "usd",
        unit: "usd",
        value: sourcedNumber(ly?.outstandingDebtUsd),
        emptyChip: sourcedNumber(ly?.outstandingDebtUsd) == null ? "Tier 2" : null,
        calculation: "Total debt drawn by leveraged positions (spec row LY10).",
        caveats: [POOLS_BORROW_402_CAVEAT],
      }),
      card({
        id: "ly-liquidations",
        label: "Liquidations (30d)",
        kind: "usd",
        unit: "usd",
        value: ly?.liquidations30d?.volumeUsd ?? null,
        sourceLabel: ly?.liquidations30d?.volumeUsd != null ? "Curated" : null,
        hint: ly?.liquidations30d?.count != null ? `${ly.liquidations30d.count} events` : null,
        emptyChip: ly?.liquidations30d?.volumeUsd == null ? "Tier 2" : null,
        calculation: "30-day liquidation volume (spec row LY11), events or Dune.",
        caveats: ["Tier 2 until an event-scan or Dune source lands."],
      }),
    ];

    const bands: MetricBandModel[] = [
      {
        id: "shared",
        title: "Shared across Credit",
        subtitle: "Cross-tag rows every Credit entity reports.",
        cards: shared,
        primaryCount: 4,
      },
      {
        id: "leveraged-yield",
        title: "Specific to Leveraged Yield",
        cards: lyCards,
        primaryCount: 5,
      },
    ];

    const leverageCurve: LeverageCurveInputs | null =
      base != null && borrowApy != null && maxLeverage != null && maxLeverage > 1
        ? {
            baseApyPct: base.apyPct,
            borrowApyPct: borrowApy,
            maxLeverageX: maxLeverage,
            borrowSourceLabel: ly?.borrowApyPct?.sourceLabel ?? "curated",
          }
        : null;

    const chipChain =
      ly?.integratedProtocols && ly.integratedProtocols.length > 0
        ? { protocols: ly.integratedProtocols, trackedSlugsByName: TRACKED_PROTOCOL_SLUGS }
        : null;

    return { bands, leverageCurve, chipChain, positionDistributionDeferred: true };
  },
);
