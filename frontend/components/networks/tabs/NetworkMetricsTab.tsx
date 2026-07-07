import type { ReactNode } from "react";

import {
  CreditTagMetricsSection,
  DerivativesTagMetricsSection,
  EntityOffchainSection,
  LendingMetricTiles,
  LiquidityTagMetricsSection,
  OtherTagMetricsSection,
  StakingTagMetricsSection,
  StablecoinMetricsSection,
} from "@/components/networks/NetworkSections";
import { NetworkMarketCard } from "@/components/networks/NetworkMarketCard";
import { MetricCard } from "@/components/networks/tabs/MetricCard";
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
import { affiliatedTagMetricSectors, primaryMetricTagsForSector } from "@/lib/networkTaxonomy";
import {
  DERIVATIVES_TAG_TO_KEY,
  LIQUIDITY_TAG_TO_KEY,
  OTHER_TAG_TO_KEY,
  STAKING_TAG_TO_KEY,
} from "@/lib/server/tagMetricsOverlay";
import type { CreditTag, NetworkProfile, RwaSecondaryTag } from "@/lib/types";

function SectionShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="border-b border-ink-800/60 pb-2">
        <h2 className="font-display text-lg font-semibold tracking-tight text-ink-50">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-ink-300">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

const CREDIT_TAG_TO_KEY: Record<string, "lending" | "leveragedYield" | "fixedIncome"> = {
  Lending: "lending",
  "Leveraged Yield": "leveragedYield",
  "Fixed Income": "fixedIncome",
};

/** Whether a given sector/tag actually has a populated metrics block. */
function tagHasBlock(profile: NetworkProfile, sector: string, tag: string): boolean {
  switch (sector) {
    case "Credit": {
      const key = CREDIT_TAG_TO_KEY[tag];
      return Boolean(key && profile.creditTagMetrics?.[key]);
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
function renderSectorTag(profile: NetworkProfile, sector: string, tag: string): ReactNode {
  switch (sector) {
    case "Credit":
      return <CreditTagMetricsSection tags={[tag as CreditTag]} metrics={profile.creditTagMetrics} />;
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

/** Credit sector-rollup KPIs (the "Credit" sub-tab header block). */
function CreditRollupPanel({ profile }: { profile: NetworkProfile }) {
  const c = profile.creditMetrics;
  if (!c) return null;
  return (
    <DataPanel title="Credit rollup">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard label="Total supplied" sourced={c.totalSuppliedUsd} kind="usd" />
        <MetricCard label="Total borrows" sourced={c.totalBorrowsUsd} kind="usd" />
        <MetricCard label="Utilization" sourced={c.utilizationPct} kind="pct" />
        <MetricCard label="Available liquidity" sourced={c.availableLiquidityUsd} kind="usd" />
        <MetricCard label="Supply APY" sourced={c.supplyApyPct} kind="pct" />
        <MetricCard label="Borrow APY" sourced={c.borrowApyPct} kind="pct" />
        <MetricCard label="Net interest margin" sourced={c.netInterestMarginPct} kind="pct" />
        <MetricCard label="Active tags" value={c.activeTagCount ?? null} kind="count" source="Derived" />
      </div>
    </DataPanel>
  );
}

/**
 * Staking sector rollup (spec §8.1) — the entity's headline KPIs plus the
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

function buildMetricsTabs(profile: NetworkProfile): MetricsSubTab[] {
  const sectors = affiliatedTagMetricSectors(profile);
  const primary =
    profile.sector && sectors.includes(profile.sector) ? profile.sector : (sectors[0] ?? profile.sector ?? null);
  const rwaAffiliated = sectors.includes("RWA");
  const primaryIsRwa = primary === "RWA";

  const tabs: MetricsSubTab[] = [];

  // Generic market + off-chain identity panels — attach to the first non-RWA
  // rollup tab, else fold into the "General RWA" tab below.
  const marketNode = profile.market ? (
    <NetworkMarketCard market={profile.market} symbol={profile.symbol} />
  ) : null;
  const offchainNode = <EntityOffchainSection universal={profile.universalMetrics} />;

  // 1. Sector rollup / "Overview" tab (skipped for RWA-primary and Other-only).
  const overviewNodes: ReactNode[] = [];
  if (profile.lending) {
    overviewNodes.push(
      <SectionShell
        key="lending"
        title="Lending metrics"
        subtitle="Live supply/borrow data (DeFi Llama)."
      >
        <LendingMetricTiles lending={profile.lending} syncedAt={profile.universalMetrics?.syncedAt} />
      </SectionShell>,
    );
  }
  if (profile.creditMetrics) overviewNodes.push(<CreditRollupPanel key="credit-rollup" profile={profile} />);
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

  // 2. Per-tag tabs for each affiliated (non-RWA) sector.
  for (const sector of sectors) {
    if (sector === "RWA") continue;
    const tags = primaryMetricTagsForSector(profile, sector);
    for (const tag of tags) {
      // Skip Credit "Lending" when the lending rollup already shows it.
      if (sector === "Credit" && tag === "Lending" && profile.lending) continue;
      if (!tagHasBlock(profile, sector, tag)) continue;
      tabs.push({
        id: `${sector}:${tag}`,
        label: tag,
        content: renderSectorTag(profile, sector, tag),
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
  // exists — surface it in a single "Overview" tab so the tab still renders.
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

export function NetworkMetricsTab({ profile }: { profile: NetworkProfile }) {
  const tabs = buildMetricsTabs(profile);

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

  return <MetricsTabView tabs={tabs} />;
}
