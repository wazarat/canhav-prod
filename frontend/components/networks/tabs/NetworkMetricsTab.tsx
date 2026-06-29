import type { ReactNode } from "react";

import {
  CreditTagMetricsSection,
  DerivativesTagMetricsSection,
  EntityOffchainSection,
  LendingMetricTiles,
  LiquidityTagMetricsSection,
  OtherTagMetricsSection,
  RwaTagMetricsSection,
  StakingTagMetricsSection,
  StablecoinMetricsSection,
} from "@/components/networks/NetworkSections";
import { NetworkMarketCard } from "@/components/networks/NetworkMarketCard";
import { Card } from "@/components/ui/Card";
import {
  affiliatedTagMetricSectors,
  primaryMetricTagsForSector,
} from "@/lib/networkTaxonomy";
import type { CreditTag, NetworkProfile } from "@/lib/types";

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

function hasTagMetricsForSector(profile: NetworkProfile, sector: string): boolean {
  switch (sector) {
    case "Credit":
      return Boolean(profile.creditTagMetrics);
    case "Staking":
      return Boolean(profile.stakingTagMetrics);
    case "Liquidity":
      return Boolean(profile.liquidityTagMetrics);
    case "Derivatives":
      return Boolean(profile.derivativesTagMetrics);
    case "Other":
      return Boolean(profile.otherTagMetrics);
    case "RWA":
      return Boolean(profile.rwaTagMetrics);
    default:
      return false;
  }
}

function SectorTagMetricsBlock({
  profile,
  sector,
}: {
  profile: NetworkProfile;
  sector: string;
}) {
  const tags = primaryMetricTagsForSector(profile, sector);

  switch (sector) {
    case "Credit": {
      const creditTags = (
        profile.lending ? tags.filter((tag) => tag !== "Lending") : tags
      ) as CreditTag[];
      return (
        <CreditTagMetricsSection tags={creditTags} metrics={profile.creditTagMetrics} />
      );
    }
    case "Staking":
      return <StakingTagMetricsSection tags={tags} metrics={profile.stakingTagMetrics} />;
    case "Liquidity":
      return <LiquidityTagMetricsSection tags={tags} metrics={profile.liquidityTagMetrics} />;
    case "Derivatives":
      return (
        <DerivativesTagMetricsSection tags={tags} metrics={profile.derivativesTagMetrics} />
      );
    case "Other":
      return <OtherTagMetricsSection tags={tags} metrics={profile.otherTagMetrics} />;
    case "RWA":
      return <RwaTagMetricsSection tags={tags} metrics={profile.rwaTagMetrics} />;
    default:
      return null;
  }
}

export function NetworkMetricsTab({ profile }: { profile: NetworkProfile }) {
  const sectors = affiliatedTagMetricSectors(profile);

  const hasAnySectorBlock = Boolean(
    profile.lending ||
      profile.stablecoin ||
      profile.dex ||
      profile.rwa ||
      profile.staking ||
      profile.liquidity ||
      profile.derivatives ||
      profile.other ||
      profile.optionsVolume ||
      profile.openInterest ||
      profile.creditTagMetrics ||
      profile.stakingTagMetrics ||
      profile.liquidityTagMetrics ||
      profile.derivativesTagMetrics ||
      profile.otherTagMetrics ||
      profile.rwaTagMetrics ||
      profile.market ||
      profile.universalMetrics?.identity.raises?.value.length ||
      profile.universalMetrics?.identity.governanceIds?.value.length ||
      profile.universalMetrics?.treasuryUsd?.value != null,
  );

  return (
    <div className="space-y-8 pt-6">
      {!hasAnySectorBlock && (
        <Card className="text-sm text-ink-300">
          Sector-specific metrics for this network are not yet mapped. Check back after the next
          cron refresh or taxonomy update.
        </Card>
      )}

      {profile.lending && (
        <SectionShell
          title="Lending metrics"
          subtitle="Live supply/borrow data (DeFi Llama)."
        >
          <LendingMetricTiles
            lending={profile.lending}
            syncedAt={profile.universalMetrics?.syncedAt}
          />
        </SectionShell>
      )}

      {sectors.map((sector) =>
        hasTagMetricsForSector(profile, sector) ? (
          <SectorTagMetricsBlock key={sector} profile={profile} sector={sector} />
        ) : null,
      )}

      <StablecoinMetricsSection stablecoin={profile.stablecoin} memberCoins={profile.memberCoins} />

      <EntityOffchainSection universal={profile.universalMetrics} />

      {profile.market && (
        <NetworkMarketCard market={profile.market} symbol={profile.symbol} />
      )}
    </div>
  );
}
