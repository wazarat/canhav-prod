import type { ReactNode } from "react";

import {
  CreditTagMetricsSection,
  DerivativesMetricsSection,
  DexMetricsSection,
  LendingMetricTiles,
  LiquidityMetricsSection,
  OpenInterestSection,
  OptionsVolumeSection,
  OtherMetricsSection,
  RwaMetricsSection,
  StablecoinMetricsSection,
  StakingMetricsSection,
} from "@/components/networks/NetworkSections";
import { NetworkMarketCard } from "@/components/networks/NetworkMarketCard";
import { Card } from "@/components/ui/Card";
import type { NetworkProfile } from "@/lib/types";

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

export function NetworkMetricsTab({ profile }: { profile: NetworkProfile }) {
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
      profile.market,
  );

  // When the full Lending block is present, live tiles render there — skip duplicate
  // Lending tag panel (curated collateral/oracles remain on Asset coverage tab).
  const creditTags = profile.lending
    ? (profile.tags ?? []).filter((tag) => tag !== "Lending")
    : profile.tags;

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

      <CreditTagMetricsSection tags={creditTags} metrics={profile.creditTagMetrics} />
      <StablecoinMetricsSection stablecoin={profile.stablecoin} memberCoins={profile.memberCoins} />
      <DexMetricsSection dex={profile.dex} />
      <LiquidityMetricsSection liquidity={profile.liquidity} />
      <DerivativesMetricsSection derivatives={profile.derivatives} />
      <OtherMetricsSection other={profile.other} />
      <OptionsVolumeSection optionsVolume={profile.optionsVolume} />
      <OpenInterestSection openInterest={profile.openInterest} />
      <RwaMetricsSection rwa={profile.rwa} />
      <StakingMetricsSection staking={profile.staking} />

      {profile.market && (
        <NetworkMarketCard market={profile.market} symbol={profile.symbol} />
      )}
    </div>
  );
}
