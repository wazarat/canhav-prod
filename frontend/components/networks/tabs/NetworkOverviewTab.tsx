import Link from "next/link";
import { Suspense } from "react";

import { InlineLinkText } from "@/components/shared/InlineLinkText";
import { MemberCoinsLauncher } from "@/components/networks/MemberCoinsLauncher";
import { NetworkOverviewMetricsBlock } from "@/components/networks/NetworkOverviewMetricsBlock";
import { NetworkPulsePanel } from "@/components/networks/NetworkPulsePanel";
import { TvlFlowWidget } from "@/components/networks/dashboard/TvlFlowWidget";
import { FeesWidget } from "@/components/networks/dashboard/FeesWidget";
import { Card } from "@/components/ui/Card";
import { DataPanel, DataRow, LinkRow } from "@/components/ui/DataPanel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StatCard } from "@/components/ui/StatCard";
import { loadNetworkDashboardData } from "@/lib/networks/dashboard-data";
import type { NetworkProfile } from "@/lib/types";
import { cn, formatUsdCompact } from "@/lib/utils";

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
      <div className="flex justify-end">
        <Link
          href={`/agents?tab=agents&skill=${encodeURIComponent(profile.slug)}#create`}
          className="inline-flex items-center gap-1 rounded-lg border border-ink-700/60 bg-ink-900/40 px-2 py-1 text-xs text-ink-300 transition-colors hover:border-ink-600 hover:text-ink-100"
        >
          Create agent
        </Link>
      </div>
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
      <section
        className={cn(
          "grid grid-cols-2 gap-4",
          statCards.length >= 5 ? "sm:grid-cols-3 lg:grid-cols-5" : "lg:grid-cols-4",
        )}
      >
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
              <SectionHeading title="About" />
              <Card className="text-sm leading-relaxed text-ink-300">
                <AboutCollapse text={profile.longDescription} />
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

/**
 * M5: theses are now single dense paragraphs of 1.1-1.7k chars with inline
 * source links, so About collapses to a 3-line preview with a native
 * <details> expand (no client JS). Short legacy descriptions render plain.
 */
function AboutCollapse({ text }: { text: string }) {
  if (text.length < 400) {
    return (
      <p className="max-w-prose">
        <InlineLinkText text={text} />
      </p>
    );
  }
  return (
    <details className="group/about max-w-prose">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="line-clamp-3 group-open/about:hidden">
          <InlineLinkText text={text} />
        </span>
        <span className="mt-1 inline-block text-xs text-electric-400 hover:underline">
          <span className="group-open/about:hidden">Read full thesis</span>
          <span className="hidden group-open/about:inline">Collapse</span>
        </span>
      </summary>
      <div className="space-y-3">
        {text.split(/\n\s*\n/).map((p, i) => (
          <p key={i}>
            <InlineLinkText text={p} />
          </p>
        ))}
      </div>
    </details>
  );
}
