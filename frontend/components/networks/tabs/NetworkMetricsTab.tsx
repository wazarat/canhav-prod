import type { ReactNode } from "react";

import {
  CreditTagMetricsSection,
  DexMetricsSection,
  LendingMetricTiles,
  OpenInterestSection,
  OptionsVolumeSection,
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
      profile.optionsVolume ||
      profile.openInterest ||
      profile.creditTagMetrics ||
      profile.market,
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
          <LendingMetricTiles lending={profile.lending} />
        </SectionShell>
      )}

      <CreditTagMetricsSection tags={profile.tags} metrics={profile.creditTagMetrics} />
      <StablecoinMetricsSection stablecoin={profile.stablecoin} memberCoins={profile.memberCoins} />
      <DexMetricsSection dex={profile.dex} />
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
