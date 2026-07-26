import "server-only";

import { cache } from "react";

import type { MetricBandModel } from "@/components/networks/credit/CreditMetricBands";
import { fetchAaveMarketOverview } from "@/lib/server/aaveMainnet";
import {
  aggregateLendingBorrow,
  aggregateSupplySideYield,
  fetchLlamaBorrowPools,
  fetchLlamaPools,
  llamaLendingProjectForSlug,
  type LlamaPool,
} from "@/lib/server/defillama";
import type { LendingRateModel, NetworkProfile } from "@/lib/types";
import type { TimeRange } from "@/lib/networks/timeRange";
import { card, sourcedNumber } from "@/lib/networks/metricCardHelpers";
import { buildSharedCreditBand } from "@/lib/networks/creditShared";

const POOLS_BORROW_402_CAVEAT =
  "Tier 2 in the metrics spec; the poolsBorrow endpoint moved behind the DeFi Llama paid plan (HTTP 402, verified 2026-07-26).";

/** Everything the Lending tag panel renders (JSON-safe). */
export interface LendingPanelData {
  bands: MetricBandModel[];
  /** Rate-model curve inputs; null when no curated model exists. */
  rateCurve: { model: LendingRateModel; currentUtilizationPct: number | null } | null;
  /** Collateral composition segments from per-pool TVL; null when unavailable. */
  donut: { label: string; value: number }[] | null;
  /**
   * The two history charts (utilization over time, liquidations histogram)
   * are DEFERRED this window: no free source provides the history (user
   * decision 2026-07-26). The panel renders honest empty slots.
   */
  historyDeferred: true;
}

function poolDonut(slug: string, pools: LlamaPool[]): { label: string; value: number }[] | null {
  const project = llamaLendingProjectForSlug(slug);
  if (!project) return null;
  const proj = project.toLowerCase();
  const bySymbol = new Map<string, number>();
  for (const p of pools) {
    if (p.project.toLowerCase() !== proj) continue;
    const tvl = p.tvlUsd ?? 0;
    if (tvl <= 0) continue;
    const symbol = p.symbol || "other";
    bySymbol.set(symbol, (bySymbol.get(symbol) ?? 0) + tvl);
  }
  const rows = [...bySymbol.entries()].sort((a, b) => b[1] - a[1]);
  if (rows.length === 0) return null;
  const top = rows.slice(0, 5).map(([label, value]) => ({ label, value }));
  const rest = rows.slice(5).reduce((s, [, v]) => s + v, 0);
  if (rest > 0) top.push({ label: "Other", value: rest });
  return top;
}

function rewardApyAggregate(slug: string, pools: LlamaPool[]): number | null {
  const project = llamaLendingProjectForSlug(slug);
  if (!project) return null;
  const proj = project.toLowerCase();
  let weighted = 0;
  let weight = 0;
  for (const p of pools) {
    if (p.project.toLowerCase() !== proj) continue;
    const tvl = p.tvlUsd ?? 0;
    if (p.apyReward != null && tvl > 0) {
      weighted += p.apyReward * tvl;
      weight += tvl;
    }
  }
  return weight > 0 ? weighted / weight : null;
}

/**
 * Lending L1-L25 (docs/credit/metrics-spec.md section 3.2) as the four
 * mandated sub-groups (Supply / Borrow / Risk / Valuation) behind the shared
 * Credit band. Source ladder per entity: Aave Ethereum core on-chain overview
 * (aave), cron-written adapter values in the KV tag block (morpho/kamino),
 * the free DeFi Llama /pools endpoint, curated KV fields, then honest
 * Tier 2 / Pending chips. Nothing is fabricated.
 */
export const buildLendingBands = cache(
  async (profile: NetworkProfile, range: TimeRange): Promise<LendingPanelData> => {
    const slug = profile.slug;
    const lending = profile.creditTagMetrics?.lending ?? null;
    const nowIso = new Date().toISOString();

    const [shared, aaveOverview, pools, borrowPools] = await Promise.all([
      buildSharedCreditBand(profile, range),
      // On-chain representative market for the flagship entity only.
      slug === "aave" ? fetchAaveMarketOverview().catch(() => null) : Promise.resolve(null),
      fetchLlamaPools(300).catch(() => [] as LlamaPool[]),
      // 402 today; lights up automatically if a Llama Pro key lands.
      fetchLlamaBorrowPools(300).catch(() => null),
    ]);

    const borrow = borrowPools ? aggregateLendingBorrow(slug, borrowPools) : null;
    const supplySide = aggregateSupplySideYield(slug, pools);
    const rewardApy = rewardApyAggregate(slug, pools);

    const onchain = aaveOverview;
    const onchainSource = {
      dataSource: "live" as const,
      sourceLabel: "Aave V3 Ethereum core (on-chain)",
      sourceUrl: "https://app.aave.com/markets/",
      asOf: onchain?.updatedAt ?? nowIso,
    };
    const kvCell = (cell: { value: number | null; dataSource?: string; sourceLabel?: string | null; updatedAt?: string | null } | null | undefined) =>
      cell?.value != null
        ? {
            dataSource: (cell.dataSource ?? "live") as "live" | "derived",
            sourceLabel: cell.sourceLabel ?? null,
            asOf: cell.updatedAt ?? null,
          }
        : {};

    /* ------------------------------- Supply -------------------------------- */

    const totalSupplied =
      onchain?.totalSuppliedUsd ?? borrow?.totalSupplyUsd ?? sourcedNumber(lending?.totalSuppliedUsd);
    const supplyApyBase =
      onchain?.weightedSupplyApyPct ?? borrow?.supplyApyPct ?? supplySide?.weightedSupplyApyPct ?? null;
    const collateralAssets =
      (onchain?.collateralAssets?.length ? onchain.collateralAssets : null) ??
      (lending?.collateralAssets?.length ? lending.collateralAssets : null);
    const maxLtv = onchain?.maxLtvPct ?? sourcedNumber(lending?.maxLtvPct);

    const supplyCards = [
      card({
        id: "l-supplied",
        label: "Total supplied",
        kind: "usd",
        unit: "usd",
        value: totalSupplied,
        ...(onchain?.totalSuppliedUsd != null
          ? onchainSource
          : borrow?.totalSupplyUsd != null
            ? { dataSource: "live" as const, sourceLabel: "DeFi Llama poolsBorrow", asOf: nowIso }
            : kvCell(lending?.totalSuppliedUsd)),
        calculation:
          "Total value supplied to the protocol's lending markets (spec row L1): sum of aToken supply across the Aave V3 Ethereum core reserves for aave; protocol TVL overlay otherwise.",
        caveats: onchain ? [] : [POOLS_BORROW_402_CAVEAT],
        emptyChip: totalSupplied == null ? "Tier 2" : null,
      }),
      card({
        id: "l-supply-apy-base",
        label: "Supply APY (base)",
        kind: "pct",
        unit: "pct",
        value: supplyApyBase,
        ...(onchain?.weightedSupplyApyPct != null
          ? { ...onchainSource, dataSource: "derived" as const }
          : supplyApyBase != null
            ? {
                dataSource: "derived" as const,
                sourceLabel: "DeFi Llama pools (derived)",
                sourceUrl: "https://yields.llama.fi/pools",
                asOf: nowIso,
              }
            : {}),
        calculation:
          "Size-weighted base supply APY across the protocol's markets (spec row L5). For aave this is the on-chain liquidityRate across Ethereum core reserves.",
      }),
      card({
        id: "l-supply-apy-reward",
        label: "Supply APY (reward)",
        kind: "pct",
        unit: "pct",
        value: rewardApy,
        ...(rewardApy != null
          ? {
              dataSource: "derived" as const,
              sourceLabel: "DeFi Llama pools (derived)",
              sourceUrl: "https://yields.llama.fi/pools",
              asOf: nowIso,
            }
          : {}),
        calculation:
          "TVL-weighted incentive/reward APY on the supply side, from the free DeFi Llama pools endpoint (spec row L6). Zero-reward protocols show an honest empty.",
      }),
      card({
        id: "l-supply-cap",
        label: "Supply caps",
        kind: "usd",
        unit: "usd",
        value: onchain?.supplyCapUsd ?? sourcedNumber(lending?.supplyCapUsd),
        ...(onchain?.supplyCapUsd != null ? { ...onchainSource, dataSource: "derived" as const } : kvCell(lending?.supplyCapUsd)),
        calculation:
          "Sum of governance-configured supply caps across capped reserves, in USD at current oracle prices (spec row L19). Uncapped reserves are excluded.",
      }),
      card({
        id: "l-collateral",
        label: "Collateral assets",
        kind: "text",
        unit: "count",
        value:
          collateralAssets && collateralAssets.length > 0
            ? collateralAssets.slice(0, 4).join(", ") +
              (collateralAssets.length > 4 ? ` +${collateralAssets.length - 4}` : "")
            : null,
        ...(onchain?.collateralAssets?.length ? onchainSource : {}),
        sourceLabel: onchain?.collateralAssets?.length
          ? onchainSource.sourceLabel
          : collateralAssets
            ? "Curated"
            : null,
        seriesNote: "List metric; no series",
        calculation:
          "Assets accepted as collateral, largest first (spec row L10): collateral-enabled reserves with nonzero LTV on-chain for aave, curated otherwise.",
      }),
      card({
        id: "l-max-ltv",
        label: "Max LTV (wtd)",
        kind: "pct",
        unit: "pct",
        value: maxLtv,
        ...(onchain?.maxLtvPct != null ? { ...onchainSource, dataSource: "derived" as const } : kvCell(lending?.maxLtvPct)),
        calculation:
          "Supply-weighted maximum loan-to-value across collateral-enabled reserves (spec row L10).",
      }),
    ];

    /* ------------------------------- Borrow --------------------------------- */

    const totalBorrowed =
      onchain?.totalBorrowedUsd ?? borrow?.totalBorrowUsd ?? sourcedNumber(lending?.totalBorrowsUsd);
    const utilization =
      onchain?.utilizationPct ?? borrow?.utilizationPct ?? sourcedNumber(lending?.utilizationPct);
    const borrowApyVar =
      onchain?.weightedVariableBorrowApyPct ?? borrow?.borrowApyPct ?? sourcedNumber(lending?.borrowApyVariablePct) ?? sourcedNumber(lending?.borrowApyPct);
    const loanAssets =
      (onchain?.loanAssets?.length ? onchain.loanAssets : null) ??
      (lending?.loanAssets?.length ? lending.loanAssets : null);

    const borrowCards = [
      card({
        id: "l-borrowed",
        label: "Total borrowed",
        kind: "usd",
        unit: "usd",
        value: totalBorrowed,
        ...(onchain?.totalBorrowedUsd != null
          ? onchainSource
          : borrow?.totalBorrowUsd != null
            ? { dataSource: "live" as const, sourceLabel: "DeFi Llama poolsBorrow", asOf: nowIso }
            : kvCell(lending?.totalBorrowsUsd)),
        calculation:
          "Outstanding borrows across the protocol's markets (spec row L2): stable plus variable debt across Ethereum core reserves for aave.",
        caveats: onchain ? [] : [POOLS_BORROW_402_CAVEAT],
        emptyChip: totalBorrowed == null ? "Tier 2" : null,
      }),
      card({
        id: "l-utilization",
        label: "Utilization",
        kind: "pct",
        unit: "pct",
        value: utilization,
        ...(onchain?.utilizationPct != null
          ? { ...onchainSource, dataSource: "derived" as const }
          : utilization != null
            ? kvCell(lending?.utilizationPct)
            : {}),
        calculation: "Borrowed divided by supplied (spec row L4).",
        caveats: onchain || utilization != null ? [] : [POOLS_BORROW_402_CAVEAT],
        emptyChip: utilization == null ? "Tier 2" : null,
      }),
      card({
        id: "l-borrow-apy-var",
        label: "Borrow APY (variable)",
        kind: "pct",
        unit: "pct",
        value: borrowApyVar,
        ...(onchain?.weightedVariableBorrowApyPct != null
          ? { ...onchainSource, dataSource: "derived" as const }
          : borrowApyVar != null
            ? kvCell(lending?.borrowApyVariablePct ?? lending?.borrowApyPct)
            : {}),
        calculation:
          "Debt-weighted variable borrow APY across markets (spec row L7): the on-chain variableBorrowRate across Ethereum core reserves for aave.",
        caveats: onchain || borrowApyVar != null ? [] : [POOLS_BORROW_402_CAVEAT],
        emptyChip: borrowApyVar == null ? "Tier 2" : null,
      }),
      card({
        id: "l-borrow-apy-stable",
        label: "Borrow APY (stable)",
        kind: "pct",
        unit: "pct",
        value: onchain?.weightedStableBorrowApyPct ?? sourcedNumber(lending?.borrowApyStablePct),
        ...(onchain?.weightedStableBorrowApyPct != null
          ? { ...onchainSource, dataSource: "derived" as const }
          : kvCell(lending?.borrowApyStablePct)),
        calculation:
          "Stable-debt-weighted stable borrow APY (spec row L8). Aave deprecated stable borrowing, so an empty here is the honest state of the market.",
        caveats: ["Stable-rate borrowing is legacy on Aave V3; most reserves carry no stable debt."],
      }),
      card({
        id: "l-borrow-cap",
        label: "Borrow caps",
        kind: "usd",
        unit: "usd",
        value: onchain?.borrowCapUsd ?? sourcedNumber(lending?.borrowCapUsd),
        ...(onchain?.borrowCapUsd != null ? { ...onchainSource, dataSource: "derived" as const } : kvCell(lending?.borrowCapUsd)),
        calculation:
          "Sum of governance-configured borrow caps across capped reserves, in USD at current oracle prices (spec row L19).",
      }),
      card({
        id: "l-loan-assets",
        label: "Loan assets",
        kind: "text",
        unit: "count",
        value:
          loanAssets && loanAssets.length > 0
            ? loanAssets.slice(0, 4).join(", ") + (loanAssets.length > 4 ? ` +${loanAssets.length - 4}` : "")
            : null,
        ...(onchain?.loanAssets?.length ? onchainSource : {}),
        sourceLabel: onchain?.loanAssets?.length ? onchainSource.sourceLabel : loanAssets ? "Curated" : null,
        seriesNote: "List metric; no series",
        calculation: "Assets that can be borrowed, largest outstanding debt first (spec row L11).",
      }),
    ];

    /* -------------------------------- Risk ---------------------------------- */

    const riskCards = [
      card({
        id: "l-liq-threshold",
        label: "Liquidation threshold (wtd)",
        kind: "pct",
        unit: "pct",
        value: onchain?.weightedLiquidationThresholdPct ?? sourcedNumber(lending?.liquidationThresholdPct),
        ...(onchain?.weightedLiquidationThresholdPct != null
          ? { ...onchainSource, dataSource: "derived" as const }
          : kvCell(lending?.liquidationThresholdPct)),
        calculation:
          "Supply-weighted liquidation threshold across collateral reserves (spec row L16): the LTV at which a position becomes liquidatable.",
      }),
      card({
        id: "l-liq-bonus",
        label: "Liquidation bonus (wtd)",
        kind: "pct",
        unit: "pct",
        value: onchain?.weightedLiquidationBonusPct ?? sourcedNumber(lending?.liquidationBonusPct),
        ...(onchain?.weightedLiquidationBonusPct != null
          ? { ...onchainSource, dataSource: "derived" as const }
          : kvCell(lending?.liquidationBonusPct)),
        calculation:
          "Supply-weighted liquidator bonus above par (spec row L17): the discount liquidators earn on seized collateral.",
      }),
      card({
        id: "l-reserve-factor",
        label: "Reserve factor (wtd)",
        kind: "pct",
        unit: "pct",
        value: onchain?.weightedReserveFactorPct ?? sourcedNumber(lending?.reserveFactorPct),
        ...(onchain?.weightedReserveFactorPct != null
          ? { ...onchainSource, dataSource: "derived" as const }
          : kvCell(lending?.reserveFactorPct)),
        calculation:
          "Debt-weighted share of interest diverted to the protocol treasury (spec row L18).",
      }),
      card({
        id: "l-bad-debt",
        label: "Bad debt",
        kind: "usd",
        unit: "usd",
        value: sourcedNumber(lending?.badDebtUsd),
        ...kvCell(lending?.badDebtUsd),
        emptyChip: sourcedNumber(lending?.badDebtUsd) == null ? "Tier 2" : null,
        calculation:
          "Outstanding unbacked debt after liquidations, per Chaos Labs risk analytics or curated on-chain simulation (spec row L14).",
        caveats: [
          "Tier 2: needs Chaos Labs or a curated on-chain simulation; deliberately null until that source lands.",
        ],
      }),
      card({
        id: "l-liquidations",
        label: "Liquidations (30d)",
        kind: "usd",
        unit: "usd",
        value: lending?.liquidations30d?.volumeUsd ?? null,
        sourceLabel: lending?.liquidations30d?.volumeUsd != null ? "Curated" : null,
        hint:
          lending?.liquidations30d?.count != null ? `${lending.liquidations30d.count} events` : null,
        emptyChip: lending?.liquidations30d?.volumeUsd == null ? "Tier 2" : null,
        calculation:
          "30-day liquidation volume (spec row L15). A free per-protocol event source is not wired yet; on-chain LiquidationCall scans are on the deferred register.",
        caveats: [
          "Tier 2 until an event-scan or Dune source lands (deferred register: cron-side series persistence).",
        ],
      }),
      card({
        id: "l-health-factor",
        label: "Health factor distribution",
        kind: "text",
        unit: "count",
        value: lending?.healthFactorNote ?? null,
        sourceLabel: lending?.healthFactorNote ? "Curated" : null,
        seriesNote: "Curated summary; no series",
        emptyChip: lending?.healthFactorNote == null ? "Tier 2" : null,
        calculation:
          "Curated summary of how borrower health factors are distributed (spec row L21); the underlying distribution needs Dune or Chaos Labs.",
        caveats: ["Tier 2: needs Dune or Chaos Labs; curated summary only."],
      }),
      card({
        id: "l-oracles",
        label: "Oracles",
        kind: "text",
        unit: "count",
        value: lending?.oracles?.length ? lending.oracles.join(", ") : null,
        sourceLabel: lending?.oracles?.length ? "Curated" : null,
        seriesNote: "List metric; no series",
        calculation: "Price-oracle providers the protocol depends on (spec row L13).",
        caveats: ["Curated field; refreshed editorially, not by the cron."],
      }),
      card({
        id: "l-isolated",
        label: "Isolated markets",
        kind: "count",
        unit: "count",
        value: onchain?.isolatedMarketsCount ?? lending?.isolatedMarketCount ?? null,
        ...(onchain != null ? onchainSource : {}),
        sourceLabel: onchain ? onchainSource.sourceLabel : lending?.isolatedMarketCount != null ? "Curated" : null,
        seriesNote: "Count metric; no series",
        calculation:
          "Markets in isolation mode (spec row L12): reserves with a governance-set debt ceiling for aave; curated per-protocol otherwise.",
      }),
      card({
        id: "l-emode",
        label: "E-Mode categories",
        kind: "text",
        unit: "count",
        value: lending?.eModeCategories?.length ? lending.eModeCategories.join(", ") : null,
        sourceLabel: lending?.eModeCategories?.length ? "Curated" : null,
        seriesNote: "List metric; no series",
        calculation:
          "Efficiency-mode categories for correlated assets (spec row L20), allowing higher LTV within a category.",
        caveats: ["Curated field; refreshed editorially, not by the cron."],
      }),
    ];

    /* ------------------------------ Valuation ------------------------------- */

    const nim =
      supplyApyBase != null && borrowApyVar != null
        ? borrowApyVar - supplyApyBase
        : sourcedNumber(lending?.netInterestMarginPct);

    const valuationCards = [
      card({
        id: "l-nim",
        label: "Net interest margin",
        kind: "pct",
        unit: "pct",
        value: nim,
        ...(nim != null ? { dataSource: "derived" as const, sourceLabel: "Derived", asOf: nowIso } : {}),
        calculation:
          "Borrow APY minus supply APY (spec row L9, derived): the spread the protocol and its reserve capture.",
      }),
      card({
        id: "l-ps-ratio",
        label: "P/S ratio",
        kind: "ratio",
        unit: "ratio",
        value: sourcedNumber(lending?.priceToSalesRatio),
        ...kvCell(lending?.priceToSalesRatio),
        emptyChip: sourcedNumber(lending?.priceToSalesRatio) == null ? "Tier 2" : null,
        calculation:
          "Market cap over annualized revenue (spec row L24), Token Terminal methodology.",
        caveats: ["Tier 2: needs Token Terminal beyond the free tier; wired nullable."],
      }),
      card({
        id: "l-active-users",
        label: "Active users (30d)",
        kind: "count",
        unit: "count",
        value: sourcedNumber(lending?.activeUsers),
        ...kvCell(lending?.activeUsers),
        emptyChip: sourcedNumber(lending?.activeUsers) == null ? "Tier 2" : null,
        calculation: "Monthly active users (spec row L25), Token Terminal or Dune.",
        caveats: ["Tier 2: needs Token Terminal or Dune; wired nullable."],
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
        id: "supply",
        title: "Specific to Lending: Supply",
        cards: supplyCards,
        primaryCount: 3,
      },
      {
        id: "borrow",
        title: "Specific to Lending: Borrow",
        cards: borrowCards,
        primaryCount: 3,
      },
      {
        id: "risk",
        title: "Specific to Lending: Risk",
        cards: riskCards,
        primaryCount: 4,
      },
      {
        id: "valuation",
        title: "Specific to Lending: Valuation",
        cards: valuationCards,
        primaryCount: 1,
      },
    ];

    return {
      bands,
      rateCurve: lending?.rateModel
        ? { model: lending.rateModel, currentUtilizationPct: utilization ?? null }
        : null,
      donut: poolDonut(slug, pools),
      historyDeferred: true,
    };
  },
);
