import { Suspense } from "react";

import { MemberCoinsLauncher } from "@/components/networks/MemberCoinsLauncher";
import { NetworkOverviewMetricsBlock } from "@/components/networks/NetworkOverviewMetricsBlock";
import { NetworkPulsePanel } from "@/components/networks/NetworkPulsePanel";
import { TvlFlowWidget } from "@/components/networks/dashboard/TvlFlowWidget";
import { FeesWidget } from "@/components/networks/dashboard/FeesWidget";
import { Card } from "@/components/ui/Card";
import { DataPanel, DataRow, LinkRow } from "@/components/ui/DataPanel";
import { StatCard } from "@/components/ui/StatCard";
import { loadNetworkDashboardData } from "@/lib/networks/dashboard-data";
import type { NetworkProfile } from "@/lib/types";
import { formatUsdCompact } from "@/lib/utils";

export interface NetworkStatCard {
  label: string;
  value: string;
  hint?: string;
}

interface NetworkOverviewTabProps {
  profile: NetworkProfile;
  statCards: NetworkStatCard[];
  foundedDate: string | null;
  deployedChains: string[];
  pipelineLabel: string;
  partnershipsLabel: string;
  resolvedCoinCount: number;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-36 animate-pulse rounded-2xl bg-ink-800/50" />
      <div className="h-48 animate-pulse rounded-2xl bg-ink-800/50" />
    </div>
  );
}

async function OverviewDashboard({ profile, labels }: { profile: NetworkProfile; labels: ReturnType<typeof resolveLabels> }) {
  const data = await loadNetworkDashboardData(profile);

  return (
    <>
      <NetworkPulsePanel
        snapshot={data.snapshot}
        tvlLabel={labels.tvlLabel}
        tvlSeries={data.tvlSeries}
        tvlSeriesSource={data.tvlSeriesSource}
      />
      <MemberCoinsLauncher coins={data.coins} networkName={profile.name} />
    </>
  );
}

function resolveLabels(profile: NetworkProfile) {
  const labels = profile.scaleLabels ?? {};
  return { tvlLabel: labels.tvl ?? "Protocol TVL" };
}

export function NetworkOverviewTab({
  profile,
  statCards,
  foundedDate,
  deployedChains,
  pipelineLabel,
  partnershipsLabel,
  resolvedCoinCount,
}: NetworkOverviewTabProps) {
  const scale = profile.currentScale;
  const labels = resolveLabels(profile);

  return (
    <div className="space-y-8 pt-6">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} hint={s.hint} />
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Suspense fallback={<DashboardSkeleton />}>
            <OverviewDashboard profile={profile} labels={labels} />
          </Suspense>
          <NetworkOverviewMetricsBlock profile={profile} />
          {profile.longDescription && (
            <section className="space-y-2">
              <div className="border-b border-ink-800/60 pb-2">
                <h2 className="font-display text-lg font-semibold tracking-tight text-ink-50">
                  About
                </h2>
              </div>
              <Card className="text-sm leading-relaxed text-ink-300">
                {profile.longDescription}
              </Card>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <Suspense
            fallback={
              <div className="space-y-4">
                <div className="h-52 animate-pulse rounded-2xl bg-ink-800/50" />
                <div className="h-40 animate-pulse rounded-2xl bg-ink-800/50" />
              </div>
            }
          >
            <OverviewRail profile={profile} />
          </Suspense>

          <DataPanel title="At a glance">
            {foundedDate && <DataRow label="Founded" value={foundedDate} />}
            {deployedChains.length > 0 && (
              <DataRow label="Chains" value={deployedChains.join(", ")} />
            )}
            {scale.loanPipelineUsd != null && (
              <DataRow label={pipelineLabel} value={formatUsdCompact(scale.loanPipelineUsd)} />
            )}
            {scale.partnerships != null && (
              <DataRow label={partnershipsLabel} value={`${scale.partnerships}+`} />
            )}
            {resolvedCoinCount > 0 && (
              <DataRow label="Member coins" value={`${resolvedCoinCount} products`} />
            )}
          </DataPanel>

          <DataPanel title="Links">
            <div className="-mx-1">
              <LinkRow label="Official docs" href={profile.officialDocs} />
              <LinkRow label="Website" href={profile.website} />
              <LinkRow label="Twitter / X" href={profile.twitter} />
              <LinkRow label="Discord" href={profile.discord} />
              <LinkRow label="GitHub" href={profile.github} />
              {profile.arbitrumPortalMetadata?.portalUrl && (
                <LinkRow label="Arbitrum Portal" href={profile.arbitrumPortalMetadata.portalUrl} />
              )}
            </div>
          </DataPanel>
        </aside>
      </div>
    </div>
  );
}

async function OverviewRail({ profile }: { profile: NetworkProfile }) {
  const data = await loadNetworkDashboardData(profile);

  return (
    <div className="space-y-4">
      <TvlFlowWidget flow={data.flow} tvlSeries={data.tvlValues} />
      <FeesWidget fees={data.fees} />
    </div>
  );
}
