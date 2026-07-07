import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NetworkEntityHeader } from "@/components/networks/NetworkEntityHeader";
import { NetworkTabBar } from "@/components/networks/NetworkTabBar";
import { NetworkAgentSkillsTab } from "@/components/networks/tabs/NetworkAgentSkillsTab";
import { NetworkAssetCoverageTab } from "@/components/networks/tabs/NetworkAssetCoverageTab";
import { NetworkCompetitorsTab } from "@/components/networks/tabs/NetworkCompetitorsTab";
import { NetworkMetricsTab } from "@/components/networks/tabs/NetworkMetricsTab";
import { NetworkOverviewTab } from "@/components/networks/tabs/NetworkOverviewTab";
import { NetworkPartnershipsTab } from "@/components/networks/tabs/NetworkPartnershipsTab";
import { NetworkResearchTab } from "@/components/networks/tabs/NetworkResearchTab";
import { NetworkRisksTab } from "@/components/networks/tabs/NetworkRisksTab";
import { ResearchChatScope } from "@/components/agent/research-chat-context";
import { buildSkillFromEntity } from "@/lib/agent/skills";
import { getApprovedNetworkBySlug } from "@/lib/data";
import { loadNetworkDashboardData } from "@/lib/networks/dashboard-data";
import {
  networkHeadlineMarketCapUsd,
  networkHeadlineTvlUsd,
} from "@/lib/networks/marketHeadlines";
import { buildNetworkTabs, resolveNetworkTab } from "@/lib/networks/tabs";
import type { NetworkStatCard } from "@/components/networks/tabs/NetworkOverviewTab";
import { formatUsdCompact, formatUsersCompact } from "@/lib/utils";

interface PageProps {
  params: { slug: string };
  searchParams: { tab?: string };
}

export const revalidate = 300;

export async function generateStaticParams() {
  // Generated on demand (dynamicParams default) and cached via ISR, like
  // /receipts/[slug]. Pre-rendering ~120 networks fanned out to CoinGecko /
  // Alchemy / DefiLlama at build time and dominated deploy duration.
  return [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const profile = await getApprovedNetworkBySlug(params.slug);
  if (!profile) return { title: "Not found" };
  return { title: profile.name, description: profile.description };
}

export default async function NetworkProfilePage({ params, searchParams }: PageProps) {
  const profile = await getApprovedNetworkBySlug(params.slug);
  if (!profile) notFound();

  const dashboardPreview = await loadNetworkDashboardData(profile);
  const resolvedCoinCount = dashboardPreview.coins.length;
  const tabs = buildNetworkTabs(profile);
  const activeTab = resolveNetworkTab(searchParams.tab, profile);
  const entitySkill = profile.agentSkill ?? buildSkillFromEntity(profile);

  const universal = profile.universalMetrics ?? null;
  const scale = profile.currentScale;
  const headlineTvl = networkHeadlineTvlUsd(profile);
  const headlineMcap = networkHeadlineMarketCapUsd(profile);
  const foundedDate =
    universal?.identity.foundedDate.value ?? profile.arbitrumPortalMetadata?.foundedDate ?? null;
  const deployedChains: string[] = universal?.identity.chains.value?.length
    ? universal.identity.chains.value
    : (profile.arbitrumPortalMetadata?.chains ?? []);
  const labels = profile.scaleLabels ?? {};
  const pipelineLabel = labels.pipeline ?? "Loan pipeline";
  const partnershipsLabel = labels.partnerships ?? "Partnerships";
  const tvlLabel = labels.tvl ?? "Total deposits / TVL";
  const usersLabel = labels.users ?? "Users";
  const aprLabel = labels.apr ?? "APR";
  const mcapLabel = labels.apr === "Market Cap" ? "Market Cap" : "Market cap";
  const coinsLabel = labels.coins ?? `Coins under ${profile.name}`;

  const statCards: NetworkStatCard[] = [];
  if (headlineTvl != null) {
    statCards.push({ label: tvlLabel, value: formatUsdCompact(headlineTvl), hint: "Latest data" });
  }
  if (scale.users != null) {
    statCards.push({
      label: usersLabel,
      value: formatUsersCompact(scale.users),
      hint: labels.users ? undefined : "Depositors",
    });
  }
  if (scale.aprPct != null) {
    statCards.push({
      label: aprLabel,
      value: `${scale.aprPct.toFixed(2)}%`,
      hint: scale.targetAprPct != null ? `Target ${scale.targetAprPct.toFixed(2)}%` : undefined,
    });
  }
  if (headlineMcap != null && scale.aprPct == null) {
    statCards.push({
      label: mcapLabel,
      value: formatUsdCompact(headlineMcap),
      hint: "Latest data",
    });
  } else if (headlineMcap != null && labels.apr === "Market Cap") {
    statCards.push({
      label: mcapLabel,
      value: formatUsdCompact(headlineMcap),
      hint: "Latest data",
    });
  }
  statCards.push({
    label: coinsLabel,
    value: `${resolvedCoinCount}`,
    hint:
      resolvedCoinCount !== profile.memberCoins.length
        ? `${profile.memberCoins.length} staged`
        : "Member products",
  });

  return (
    <div className="container space-y-6 pb-24 py-12">
      <NetworkEntityHeader
        profile={profile}
        snapshot={dashboardPreview.snapshot}
        coinCount={resolvedCoinCount}
      />

      <NetworkTabBar slug={profile.slug} activeTab={activeTab} tabs={tabs} />

      {activeTab === "overview" && (
        <NetworkOverviewTab
          profile={profile}
          statCards={statCards}
          foundedDate={foundedDate}
          deployedChains={deployedChains}
          pipelineLabel={pipelineLabel}
          partnershipsLabel={partnershipsLabel}
          resolvedCoinCount={resolvedCoinCount}
        />
      )}
      {activeTab === "metrics" && <NetworkMetricsTab profile={profile} />}
      {activeTab === "research" && <NetworkResearchTab profile={profile} />}
      {activeTab === "asset-coverage" && <NetworkAssetCoverageTab profile={profile} />}
      {activeTab === "risks" && <NetworkRisksTab profile={profile} />}
      {activeTab === "competitors" && <NetworkCompetitorsTab profile={profile} />}
      {activeTab === "partnerships" && <NetworkPartnershipsTab profile={profile} />}
      {activeTab === "agent-skills" && (
        <NetworkAgentSkillsTab profile={profile} skill={entitySkill} />
      )}

      <ResearchChatScope entitySlug={profile.slug} entityName={profile.name} />
    </div>
  );
}
