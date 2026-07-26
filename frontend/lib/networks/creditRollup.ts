import "server-only";

import { cache } from "react";

import type { MetricCardModel } from "@/components/ui/MetricCardGrid";
import {
  aggregateLendingBorrow,
  aggregateSupplySideYield,
  fetchLlamaBorrowPools,
  fetchLlamaPools,
  llamaLendingProjectForSlug,
} from "@/lib/server/defillama";
import type { NetworkProfile } from "@/lib/types";
import type { TimeRange } from "@/lib/networks/timeRange";
import { NO_HISTORY_NOTE } from "@/lib/networks/metricCardHelpers";
import {
  chainCountCard,
  fdvCard,
  feesCard,
  fetchSharedInputs,
  marketCapCard,
  pTvlCard,
  revenueCard,
  tvlCard,
  tvlDelta30dCard,
  type SharedCardInputs,
} from "@/lib/networks/creditShared";

export type { TimeRange } from "@/lib/networks/timeRange";

const POOLS_BORROW_URL = "https://yields.llama.fi/poolsBorrow";

interface CardInputs extends SharedCardInputs {
  borrow: {
    totalSupplyUsd: number | null;
    totalBorrowUsd: number | null;
    supplyApyPct: number | null;
    borrowApyPct: number | null;
  } | null;
  supplyYield: { weightedSupplyApyPct: number | null } | null;
}

/**
 * Assemble the Credit rollup card models for one entity: spec rows C0.1-C0.8
 * plus the universal rollup subset (docs/credit/metrics-spec.md, section 3.1).
 * Every upstream fetch fails soft to an honest empty; values are never
 * fabricated or zero-substituted (missing renders a dash plus a chip).
 * Shared-band builders live in creditShared.ts (reused by the M4 tag tabs).
 */
export const buildCreditRollup = cache(
  async (profile: NetworkProfile, range: TimeRange): Promise<MetricCardModel[]> => {
    const slug = profile.slug;
    const lendingProject = llamaLendingProjectForSlug(slug);

    const [shared, borrowResult, supplyYieldResult] = await Promise.all([
      fetchSharedInputs(profile, range),
      // /poolsBorrow moved behind the Llama paid plan (402, 2026-07-26); this
      // fails soft today and lights the borrow-side cards up if Pro lands.
      lendingProject
        ? fetchLlamaBorrowPools(300)
            .then((pools) => aggregateLendingBorrow(slug, pools))
            .catch(() => null)
        : Promise.resolve(null),
      lendingProject
        ? fetchLlamaPools(300)
            .then((pools) => aggregateSupplySideYield(slug, pools))
            .catch(() => null)
        : Promise.resolve(null),
    ]);

    const inputs: CardInputs = {
      ...shared,
      borrow: borrowResult
        ? {
            totalSupplyUsd: borrowResult.totalSupplyUsd,
            totalBorrowUsd: borrowResult.totalBorrowUsd,
            supplyApyPct: borrowResult.supplyApyPct,
            borrowApyPct: borrowResult.borrowApyPct,
          }
        : null,
      supplyYield: supplyYieldResult,
    };

    return [
      suppliedCard(inputs),
      borrowedCard(inputs),
      tvlCard(inputs),
      feesCard(inputs),
      revenueCard(inputs),
      borrowApyCard(inputs),
      supplyApyCard(inputs),
      collateralCard(inputs),
      badDebtCard(inputs),
      marketCapCard(inputs),
      fdvCard(inputs),
      pTvlCard(inputs),
      tvlDelta30dCard(inputs),
      chainCountCard(inputs),
    ];
  },
);

/* ----------------------------- C0.1 - C0.8 ------------------------------- */

function suppliedCard(i: CardInputs): MetricCardModel {
  const value = i.borrow?.totalSupplyUsd ?? null;
  return {
    id: "supplied",
    label: "Total supplied",
    kind: "usd",
    unit: "usd",
    value,
    dataSource: value != null ? "live" : null,
    sourceLabel: value != null ? "DeFi Llama poolsBorrow" : null,
    sourceUrl: POOLS_BORROW_URL,
    asOf: value != null ? i.nowIso : null,
    series: null,
    fullSeries: null,
    seriesNote: NO_HISTORY_NOTE,
    change: null,
    calculation:
      "Sum of totalSupplyUsd across this protocol's lending pools on the DeFi Llama poolsBorrow endpoint (spec row C0.1).",
    caveats: [
      "Tier 2 in the metrics spec; the poolsBorrow endpoint moved behind the DeFi Llama paid plan (HTTP 402, verified 2026-07-26).",
      "Lending-market metric; structurally absent for non-lending Credit protocols.",
    ],
    emptyChip: value == null ? "Tier 2" : null,
    hint: null,
  };
}

function borrowedCard(i: CardInputs): MetricCardModel {
  const value = i.borrow?.totalBorrowUsd ?? null;
  return {
    id: "borrowed",
    label: "Total borrowed",
    kind: "usd",
    unit: "usd",
    value,
    dataSource: value != null ? "live" : null,
    sourceLabel: value != null ? "DeFi Llama poolsBorrow" : null,
    sourceUrl: POOLS_BORROW_URL,
    asOf: value != null ? i.nowIso : null,
    series: null,
    fullSeries: null,
    seriesNote: NO_HISTORY_NOTE,
    change: null,
    calculation:
      "Sum of totalBorrowUsd across this protocol's lending pools on the DeFi Llama poolsBorrow endpoint (spec row C0.2).",
    caveats: [
      "Tier 2 in the metrics spec; the poolsBorrow endpoint moved behind the DeFi Llama paid plan (HTTP 402, verified 2026-07-26).",
      "Lending-market metric; structurally absent for non-lending Credit protocols.",
    ],
    emptyChip: value == null ? "Tier 2" : null,
    hint: null,
  };
}

function borrowApyCard(i: CardInputs): MetricCardModel {
  const value = i.borrow?.borrowApyPct ?? null;
  return {
    id: "borrow-apy",
    label: "Wtd avg borrow APY",
    kind: "pct",
    unit: "pct",
    value,
    dataSource: value != null ? "derived" : null,
    sourceLabel: value != null ? "DeFi Llama poolsBorrow (derived)" : null,
    sourceUrl: POOLS_BORROW_URL,
    asOf: value != null ? i.nowIso : null,
    series: null,
    fullSeries: null,
    seriesNote: NO_HISTORY_NOTE,
    change: null,
    calculation:
      "Borrow-side base APY weighted by each pool's outstanding borrows, across this protocol's pools on the poolsBorrow endpoint (spec row C0.5).",
    caveats: [
      "Tier 2 in the metrics spec; the poolsBorrow endpoint moved behind the DeFi Llama paid plan (HTTP 402, verified 2026-07-26).",
      "Excludes reward APY; base rates only.",
    ],
    emptyChip: value == null ? "Tier 2" : null,
    hint: null,
  };
}

function supplyApyCard(i: CardInputs): MetricCardModel {
  const value = i.borrow?.supplyApyPct ?? i.supplyYield?.weightedSupplyApyPct ?? null;
  return {
    id: "supply-apy",
    label: "Wtd avg supply APY",
    kind: "pct",
    unit: "pct",
    value,
    dataSource: value != null ? "derived" : null,
    sourceLabel: value != null ? "DeFi Llama pools (derived)" : null,
    sourceUrl: "https://yields.llama.fi/pools",
    asOf: value != null ? i.nowIso : null,
    series: null,
    fullSeries: null,
    seriesNote: NO_HISTORY_NOTE,
    change: null,
    calculation:
      "Supply-side base APY weighted by each pool's TVL, across this protocol's pools on the free DeFi Llama pools endpoint (spec row C0.6).",
    caveats: ["Excludes reward APY; base rates only."],
    emptyChip: value == null ? "Pending" : null,
    hint: null,
  };
}

function collateralCard(i: CardInputs): MetricCardModel {
  const assets = i.profile.creditTagMetrics?.lending?.collateralAssets ?? null;
  const shown = assets && assets.length > 0 ? assets.slice(0, 4) : null;
  const value = shown
    ? shown.join(", ") + (assets!.length > shown.length ? ` +${assets!.length - shown.length}` : "")
    : null;
  return {
    id: "collateral",
    label: "Top collateral assets",
    kind: "text",
    unit: "count",
    value,
    dataSource: null,
    sourceLabel: value != null ? "Curated" : null,
    sourceUrl: null,
    asOf: null,
    series: null,
    fullSeries: null,
    seriesNote: "List metric; no series",
    change: null,
    calculation:
      "Curated list of the assets accepted as collateral, from protocol docs and on-chain configuration (spec row C0.7).",
    caveats: ["Curated field; refreshed editorially, not by the cron."],
    emptyChip: value == null ? "Pending" : null,
    hint: null,
  };
}

function badDebtCard(i: CardInputs): MetricCardModel {
  const cell = i.profile.creditTagMetrics?.lending?.badDebtUsd ?? null;
  const value = cell?.value ?? null;
  return {
    id: "bad-debt",
    label: "Bad debt",
    kind: "usd",
    unit: "usd",
    value,
    dataSource: value != null ? (cell?.dataSource ?? null) : null,
    sourceLabel: value != null ? (cell?.sourceLabel ?? "Curated") : null,
    sourceUrl: null,
    asOf: value != null ? (cell?.updatedAt ?? null) : null,
    series: null,
    fullSeries: null,
    seriesNote: NO_HISTORY_NOTE,
    change: null,
    calculation:
      "Outstanding unbacked debt after liquidations, per Chaos Labs risk analytics or on-chain simulation (spec row C0.8).",
    caveats: [
      "Tier 2: needs Chaos Labs or a curated on-chain simulation; deliberately null until that source lands (deferred register item 5).",
    ],
    emptyChip: value == null ? "Tier 2" : null,
    hint: null,
  };
}
