import { Suspense, type ReactNode } from "react";

import {
  DerivativesTagMetricsSection,
  EntityOffchainSection,
  LiquidityTagMetricsSection,
  OtherTagMetricsSection,
  StakingTagMetricsSection,
  StablecoinMetricsSection,
} from "@/components/networks/NetworkSections";
import {
  CreditFixedIncomePanel,
  CreditLendingPanel,
  CreditLeveragedYieldPanel,
} from "@/components/networks/tabs/CreditTagPanels";
import { NetworkMarketCard } from "@/components/networks/NetworkMarketCard";
import { MetricCard } from "@/components/ui/MetricCard";
import {
  MetricsTabView,
  type MetricsSubTab,
} from "@/components/networks/tabs/MetricsTabView";
import {
  RWA_CHARACTERISTIC_KEY,
  RwaCharacteristicPanel,
  RwaGeneralPanel,
} from "@/components/networks/tabs/RwaCharacteristicSections";
import { Card } from "@/components/ui/Card";
import { DataPanel } from "@/components/ui/DataPanel";
import { MetricCardGrid } from "@/components/ui/MetricCardGrid";
import { StatGridSkeleton } from "@/components/ui/Skeletons";
import { buildCreditRollup } from "@/lib/networks/creditRollup";
import { DEFAULT_TIME_RANGE, type TimeRange } from "@/lib/networks/timeRange";
import {
  affiliatedTagMetricSectors,
  CREDIT_TAG_METRICS_KEY,
  primaryMetricTagsForSector,
} from "@/lib/networkTaxonomy";
import {
  DERIVATIVES_TAG_TO_KEY,
  LIQUIDITY_TAG_TO_KEY,
  OTHER_TAG_TO_KEY,
  STAKING_TAG_TO_KEY,
} from "@/lib/server/tagMetricsOverlay";
import type { NetworkProfile, RwaSecondaryTag } from "@/lib/types";

/** Whether a given sector/tag actually has a populated metrics block. */
function tagHasBlock(profile: NetworkProfile, sector: string, tag: string): boolean {
  switch (sector) {
    case "Credit": {
      // M4.1 (CAN-70): gate on the tag VOCABULARY, not block presence. Every
      // tagged Credit entity renders its tag sub-tab; the builders emit honest
      // empty cards when data has not landed (CAN-59 precedent).
      const key = (CREDIT_TAG_METRICS_KEY as Record<string, "lending" | "leveragedYield" | "fixedIncome">)[tag];
      return Boolean(key);
    }
    case "Staking": {
      const key = (STAKING_TAG_TO_KEY as Record<string, keyof NonNullable<NetworkProfile["stakingTagMetrics"]>>)[tag];
      return Boolean(key && profile.stakingTagMetrics?.[key]);
    }
    case "Liquidity": {
      const key = (LIQUIDITY_TAG_TO_KEY as Record<string, keyof NonNullable<NetworkProfile["liquidityTagMetrics"]>>)[tag];
      return Boolean(key && profile.liquidityTagMetrics?.[key]);
    }
    case "Derivatives": {
      const key = (DERIVATIVES_TAG_TO_KEY as Record<string, keyof NonNullable<NetworkProfile["derivativesTagMetrics"]>>)[tag];
      return Boolean(key && profile.derivativesTagMetrics?.[key]);
    }
    case "Other": {
      const key = (OTHER_TAG_TO_KEY as Record<string, keyof NonNullable<NetworkProfile["otherTagMetrics"]>>)[tag];
      return Boolean(key && profile.otherTagMetrics?.[key]);
    }
    default:
      return false;
  }
}

/** Render a single sector/tag's metrics panel (reuses the sector sections). */
function renderSectorTag(
  profile: NetworkProfile,
  sector: string,
  tag: string,
  range: TimeRange,
): ReactNode {
  switch (sector) {
    case "Credit": {
      const fallback = (
        <DataPanel title={tag}>
          <StatGridSkeleton count={8} />
        </DataPanel>
      );
      if (tag === "Lending") {
        return (
          <Suspense fallback={fallback}>
            <CreditLendingPanel profile={profile} range={range} />
          </Suspense>
        );
      }
      if (tag === "Leveraged Yield") {
        return (
          <Suspense fallback={fallback}>
            <CreditLeveragedYieldPanel profile={profile} range={range} />
          </Suspense>
        );
      }
      if (tag === "Fixed Income") {
        return (
          <Suspense fallback={fallback}>
            <CreditFixedIncomePanel profile={profile} range={range} />
          </Suspense>
        );
      }
      return null;
    }
    case "Staking":
      return <StakingTagMetricsSection tags={[tag]} metrics={profile.stakingTagMetrics} />;
    case "Liquidity":
      return <LiquidityTagMetricsSection tags={[tag]} metrics={profile.liquidityTagMetrics} />;
    case "Derivatives":
      return <DerivativesTagMetricsSection tags={[tag]} metrics={profile.derivativesTagMetrics} />;
    case "Other":
      return <OtherTagMetricsSection tags={[tag]} metrics={profile.otherTagMetrics} />;
    default:
      return null;
  }
}

/**
 * Credit sector-rollup KPIs: spec rows C0.1-C0.8 plus the universal rollup
 * subset (CAN-59), assembled live in lib/networks/creditRollup.ts. Renders
 * for EVERY Credit-affiliated entity; missing values are honest empties.
 */
async function CreditRollupPanel({ profile, range }: { profile: NetworkProfile; range: TimeRange }) {
  const cards = await buildCreditRollup(profile, range);
  return (
    <DataPanel title="Credit rollup">
      <MetricCardGrid cards={cards} />
    </DataPanel>
  );
}

/**
 * Staking sector rollup (spec §8.1): the entity's headline KPIs plus the
 * network-wide Ethereum-consensus context (beaconcha.in / ultrasound.money)
 * when available. Rendered as the first "Staking" sub-tab for every Staking
 * entity so the sector rollup is always present, per spec §1.1.
 */
function StakingRollupPanel({ profile }: { profile: NetworkProfile }) {
  const s = profile.staking;
  if (!s) return null;
  const nc = s.networkConsensus;
  return (
    <div className="space-y-4">
      <DataPanel title="Staking rollup">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <MetricCard label="Total staked" sourced={s.totalStakedUsd} kind="usd" />
          <MetricCard label="Staking APR" sourced={s.stakingAprPct} kind="pct" />
          <MetricCard label="Market cap" sourced={s.marketCapUsd} kind="usd" />
          <MetricCard
            label="Fees · 24h"
            value={s.feesRevenue?.fees24hUsd ?? null}
            kind="usd"
            source="DeFi Llama"
          />
          <MetricCard
            label="Market share"
            value={s.marketSharePct ?? null}
            kind="pct"
            source="Derived"
          />
        </div>
        {s.underlyingAsset ? (
          <p className="mt-2 text-xs text-ink-400">Underlying asset · {s.underlyingAsset}</p>
        ) : null}
      </DataPanel>
      {nc ? (
        <DataPanel title="Ethereum network consensus" badge="Network-wide">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <MetricCard label="Total ETH staked" sourced={nc.totalEthStaked} kind="count" />
            <MetricCard label="Consensus APR" sourced={nc.stakingAprPct} kind="pct" />
            <MetricCard label="ETH base rate" sourced={nc.ethBaseRatePct} kind="pct" />
            <MetricCard label="Finalized epoch" sourced={nc.finalizedEpoch} kind="count" />
          </div>
          {nc.withdrawalQueue && <p className="mt-2 text-xs text-ink-400">{nc.withdrawalQueue}</p>}
        </DataPanel>
      ) : null}
    </div>
  );
}

const RWA_CHARACTERISTIC_ORDER = Object.keys(RWA_CHARACTERISTIC_KEY) as RwaSecondaryTag[];

/** RWA characteristic tags that have a curated block or are declared on the profile. */
function activeRwaCharacteristics(profile: NetworkProfile): RwaSecondaryTag[] {
  const declared = new Set<RwaSecondaryTag>(profile.rwaSecondaryTags ?? []);
  const chars = profile.rwaCharacteristics;
  return RWA_CHARACTERISTIC_ORDER.filter((tag) => {
    if (declared.has(tag)) return true;
    return Boolean(chars?.[RWA_CHARACTERISTIC_KEY[tag]]);
  });
}

function buildMetricsTabs(profile: NetworkProfile, range: TimeRange): MetricsSubTab[] {
  const sectors = affiliatedTagMetricSectors(profile);
  const primary =
    profile.sector && sectors.includes(profile.sector) ? profile.sector : (sectors[0] ?? profile.sector ?? null);
  const rwaAffiliated = sectors.includes("RWA");
  const primaryIsRwa = primary === "RWA";

  const tabs: MetricsSubTab[] = [];

  // Generic market + off-chain identity panels: attach to the first non-RWA
  // rollup tab, else fold into the "General RWA" tab below.
  const marketNode = profile.market ? (
    <NetworkMarketCard market={profile.market} symbol={profile.symbol} />
  ) : null;
  const offchainNode = <EntityOffchainSection universal={profile.universalMetrics} />;

  // 1. Sector rollup / "Overview" tab (skipped for RWA-primary and Other-only).
  // M4.1 (CAN-70): the legacy LendingMetricTiles block is retired; the Lending
  // tag sub-tab is the single lending metrics representation.
  const overviewNodes: ReactNode[] = [];
  const creditRollupNode = sectors.includes("Credit") ? (
    <Suspense
      key="credit-rollup"
      fallback={
        <DataPanel title="Credit rollup">
          <StatGridSkeleton count={8} />
        </DataPanel>
      }
    >
      <CreditRollupPanel profile={profile} range={range} />
    </Suspense>
  ) : null;
  if (creditRollupNode && !primaryIsRwa) overviewNodes.push(creditRollupNode);
  if (sectors.includes("Staking") && profile.staking) {
    overviewNodes.push(<StakingRollupPanel key="staking-rollup" profile={profile} />);
  }
  if (profile.stablecoin) {
    overviewNodes.push(
      <StablecoinMetricsSection key="stablecoin" stablecoin={profile.stablecoin} memberCoins={profile.memberCoins} />,
    );
  }

  const wantOverview = !primaryIsRwa && overviewNodes.length > 0;
  if (wantOverview) {
    tabs.push({
      id: "rollup",
      label: primary ?? "Overview",
      content: (
        <div className="space-y-8">
          {overviewNodes}
          {marketNode}
          {offchainNode}
        </div>
      ),
    });
  }

  // 1b. RWA-primary Credit affiliates (centrifuge, clearpool, goldfinch) skip
  // the overview tab, so the Credit rollup gets its own sub-tab (CAN-59:
  // every Credit entity renders the rollup).
  if (creditRollupNode && primaryIsRwa) {
    tabs.push({
      id: "credit-rollup",
      label: "Credit",
      content: <div className="space-y-8">{creditRollupNode}</div>,
    });
  }

  // 2. Per-tag tabs for each affiliated (non-RWA) sector.
  for (const sector of sectors) {
    if (sector === "RWA") continue;
    const tags = primaryMetricTagsForSector(profile, sector);
    for (const tag of tags) {
      if (!tagHasBlock(profile, sector, tag)) continue;
      tabs.push({
        id: `${sector}:${tag}`,
        label: tag,
        content: renderSectorTag(profile, sector, tag, range),
      });
    }
  }

  // 3. RWA: characteristic tabs, then "General RWA" last.
  if (rwaAffiliated) {
    for (const tag of activeRwaCharacteristics(profile)) {
      tabs.push({
        id: `RWA:${tag}`,
        label: tag,
        content: <RwaCharacteristicPanel tag={tag} characteristics={profile.rwaCharacteristics} />,
      });
    }
    tabs.push({
      id: "RWA:general",
      label: "General RWA",
      content: (
        <div className="space-y-8">
          <RwaGeneralPanel profile={profile} />
          {primaryIsRwa ? marketNode : null}
          {primaryIsRwa ? offchainNode : null}
        </div>
      ),
    });
  }

  // 4. Fallback: no sector tabs at all but generic market/off-chain content
  // exists: surface it in a single "Overview" tab so the tab still renders.
  if (tabs.length === 0 && (marketNode || profile.universalMetrics)) {
    tabs.push({
      id: "rollup",
      label: "Overview",
      content: (
        <div className="space-y-8">
          {marketNode}
          {offchainNode}
        </div>
      ),
    });
  }

  return tabs;
}

export function NetworkMetricsTab({
  profile,
  range = DEFAULT_TIME_RANGE,
  subTab,
}: {
  profile: NetworkProfile;
  range?: TimeRange;
  /** Raw ?m= search param; validated against built tab ids client-side. */
  subTab?: string;
}) {
  const tabs = buildMetricsTabs(profile, range);

  if (tabs.length === 0) {
    return (
      <div className="pt-6">
        <Card className="text-sm text-ink-300">
          Sector-specific metrics for this network are not yet mapped. Check back after the next
          cron refresh or taxonomy update.
        </Card>
      </div>
    );
  }

  return <MetricsTabView tabs={tabs} initialTabId={subTab} range={range} />;
}
