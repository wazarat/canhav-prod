import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight, BookOpen } from "lucide-react";

import {
  CompetitorsSection,
  InvestmentRoundsSection,
  LendingMetricsSection,
  LendingTagMetricsSection,
  StablecoinMetricsSection,
  OrgStructureSection,
  PartnershipsSection,
  RisksSection,
  TradFiComparisonSection,
  buildNetworkSectionNav,
} from "@/components/networks/NetworkSections";
import { NetworkMarketCard } from "@/components/networks/NetworkMarketCard";
import { MemberCoinsLauncher } from "@/components/networks/MemberCoinsLauncher";
import { NetworkPulsePanel } from "@/components/networks/NetworkPulsePanel";
import { NetworkResearchHub } from "@/components/networks/NetworkResearchHub";
import { TvlFlowWidget } from "@/components/networks/dashboard/TvlFlowWidget";
import { FeesWidget } from "@/components/networks/dashboard/FeesWidget";
import { CombinedVerdictCard } from "@/components/agent/CombinedVerdictCard";
import { AgentSkillCard } from "@/components/agent/AgentSkillCard";
import { ResearchChatScope } from "@/components/agent/research-chat-context";
import { SecurityBadge } from "@/components/shared/SecurityBadge";
import { SourcesFooter } from "@/components/shared/SourcesFooter";
import { TypedRiskList } from "@/components/shared/TypedRiskList";
import { Badge } from "@/components/ui/Badge";
import { DataPanel, DataRow, LinkRow } from "@/components/ui/DataPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionNav } from "@/components/ui/SectionNav";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { getApprovedNetworks, getApprovedNetworkBySlug } from "@/lib/data";
import { buildSkillFromEntity } from "@/lib/agent/skills";
import { deriveSecurityStatus } from "@/lib/security";
import { loadNetworkDashboardData } from "@/lib/networks/dashboard-data";
import type { NetworkProfile } from "@/lib/types";
import { formatUsdCompact, formatUsersCompact } from "@/lib/utils";

interface PageProps {
  params: { slug: string };
}

export const revalidate = 300;

export async function generateStaticParams() {
  return (await getApprovedNetworks()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const profile = await getApprovedNetworkBySlug(params.slug);
  if (!profile) return { title: "Not found" };
  return { title: profile.name, description: profile.description };
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-36 animate-pulse rounded-2xl bg-ink-800/50" />
      <div className="h-48 animate-pulse rounded-2xl bg-ink-800/50" />
      <div className="h-64 animate-pulse rounded-2xl bg-ink-800/50" />
    </div>
  );
}

async function NetworkDashboard({ network }: { network: NetworkProfile }) {
  const data = await loadNetworkDashboardData(network);
  const labels = network.scaleLabels ?? {};
  const tvlLabel = labels.tvl ?? "Protocol TVL";

  return (
    <>
      <NetworkPulsePanel
        snapshot={data.snapshot}
        tvlLabel={tvlLabel}
        tvlSeries={data.tvlSeries}
        tvlSeriesSource={data.tvlSeriesSource}
      />
      <MemberCoinsLauncher coins={data.coins} networkName={network.name} />
      <NetworkResearchHub
        components={network.components}
        differentiator={network.differentiator}
        offchainFacts={network.offchainFacts}
        faq={network.faq}
        timeline={network.timeline ?? network.events}
        tokenomics={network.tokenomics}
      />
      <div className="space-y-4 lg:hidden">
        <TvlFlowWidget flow={data.flow} tvlSeries={data.tvlValues} />
        <FeesWidget fees={data.fees} />
      </div>
    </>
  );
}

async function NetworkDashboardRail({ network }: { network: NetworkProfile }) {
  const data = await loadNetworkDashboardData(network);

  return (
    <div className="hidden space-y-4 lg:block">
      <TvlFlowWidget flow={data.flow} tvlSeries={data.tvlValues} />
      <FeesWidget fees={data.fees} />
    </div>
  );
}

function NetworkAvatar({ profile }: { profile: NetworkProfile }) {
  const logoUrl = profile.arbitrumPortalMetadata?.logoUrl;
  const initial = profile.name.charAt(0).toUpperCase();

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        className="h-12 w-12 rounded-xl border border-ink-700/60 object-cover"
      />
    );
  }

  return (
    <span className="grid h-12 w-12 place-items-center rounded-xl border border-neon-500/30 bg-neon-500/10 font-display text-lg font-semibold text-neon-400">
      {initial}
    </span>
  );
}

export default async function NetworkProfilePage({ params }: PageProps) {
  const profile = await getApprovedNetworkBySlug(params.slug);
  if (!profile) notFound();

  const entitySkill = profile.agentSkill ?? buildSkillFromEntity(profile);
  const scale = profile.currentScale;
  const labels = profile.scaleLabels ?? {};
  const tvlLabel = labels.tvl ?? "Total deposits / TVL";
  const usersLabel = labels.users ?? "Users";
  const aprLabel = labels.apr ?? "APR";
  const pipelineLabel = labels.pipeline ?? "Loan pipeline";
  const partnershipsLabel = labels.partnerships ?? "Partnerships";
  const coinsLabel = labels.coins ?? `Coins under ${profile.name}`;

  const aprValue =
    scale.marketCapUsd != null
      ? formatUsdCompact(scale.marketCapUsd)
      : scale.aprPct != null
        ? `${scale.aprPct.toFixed(2)}%`
        : null;
  const statCards: { label: string; value: string; hint?: string }[] = [];
  if (scale.tvlUsd != null) {
    statCards.push({ label: tvlLabel, value: formatUsdCompact(scale.tvlUsd), hint: "Latest data" });
  }
  if (scale.users != null) {
    statCards.push({
      label: usersLabel,
      value: formatUsersCompact(scale.users),
      hint: labels.users ? undefined : "Depositors",
    });
  }
  if (aprValue != null) {
    statCards.push({
      label: aprLabel,
      value: aprValue,
      hint:
        scale.marketCapUsd == null && scale.targetAprPct != null
          ? `Target ${scale.targetAprPct.toFixed(2)}%`
          : undefined,
    });
  }
  statCards.push({
    label: coinsLabel,
    value: `${profile.memberCoins.length}`,
    hint: "Member products",
  });

  const sectionNavItems = buildNetworkSectionNav(profile);

  const ctaClass =
    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors";
  const ctaPrimary = `${ctaClass} border-electric-500/40 bg-electric-500/10 text-electric-300 hover:bg-electric-500/20`;
  const ctaSecondary = `${ctaClass} border-ink-700 bg-ink-900/60 text-ink-200 hover:text-ink-50`;

  return (
    <div className="container space-y-8 pb-24 py-12">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Networks", href: "/networks" },
          { label: profile.name },
        ]}
        title={profile.name}
        badges={
          <>
            <Badge tone="neon">Network</Badge>
            {profile.sector && <Badge tone="electric">{profile.sector}</Badge>}
            {(profile.tags ?? (profile.subSector ? [profile.subSector] : [])).map((tag) => (
              <Badge key={tag} tone="signal">
                {tag}
              </Badge>
            ))}
            <Badge tone="neutral">{profile.memberCoins.length} coins</Badge>
            <SecurityBadge
              info={deriveSecurityStatus({
                isPubliclyAudited: profile.arbitrumPortalMetadata?.isPubliclyAudited,
                audits: profile.audits,
              })}
            />
          </>
        }
        description={
          <>
            <p>{profile.description}</p>
            {profile.tagline && (
              <p className="mt-2 text-xs italic text-ink-400">{profile.tagline}</p>
            )}
          </>
        }
        actions={
          <>
            {profile.officialDocs && (
              <a href={profile.officialDocs} target="_blank" rel="noreferrer" className={ctaPrimary}>
                <BookOpen className="h-4 w-4" />
                Official Docs
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            )}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noreferrer" className={ctaSecondary}>
                Website
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            )}
            {profile.twitter && (
              <a href={profile.twitter} target="_blank" rel="noreferrer" className={ctaSecondary}>
                Twitter / X
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            )}
          </>
        }
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} hint={s.hint} />
        ))}
      </section>

      {(profile.slug === "ethena" || profile.slug === "usd-ai") && (
        <CombinedVerdictCard
          entitySlug={profile.slug}
          asset={profile.slug === "ethena" ? "sUSDe" : "sUSDai"}
        />
      )}

      <SectionNav items={sectionNavItems} className="lg:hidden" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Suspense fallback={<DashboardSkeleton />}>
            <NetworkDashboard network={profile} />
          </Suspense>

          {profile.market && (
            <NetworkMarketCard market={profile.market} symbol={profile.symbol} />
          )}

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

          <div className="space-y-8">
            <LendingMetricsSection lending={profile.lending} />
            <LendingTagMetricsSection tags={profile.tags} metrics={profile.lendingTagMetrics} />
            <StablecoinMetricsSection
              stablecoin={profile.stablecoin}
              memberCoins={profile.memberCoins}
            />
            <CompetitorsSection
              competitors={profile.competitors}
              networkName={profile.name}
            />
            <OrgStructureSection org={profile.orgStructure} />
            {profile.typedRisks ? (
              <TypedRiskList risks={profile.typedRisks} />
            ) : (
              <RisksSection risks={profile.risks} />
            )}
            <InvestmentRoundsSection rounds={profile.investmentRounds} />
            <PartnershipsSection partnerships={profile.partnerships} />
            <TradFiComparisonSection
              rows={profile.tradFiComparison}
              networkName={profile.name}
            />
            <AgentSkillCard skill={entitySkill} />
            {profile.sources && <SourcesFooter sources={profile.sources} />}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto lg:space-y-4 space-y-4">
          <Suspense
            fallback={
              <div className="hidden space-y-4 lg:block">
                <div className="h-52 animate-pulse rounded-2xl bg-ink-800/50" />
                <div className="h-40 animate-pulse rounded-2xl bg-ink-800/50" />
              </div>
            }
          >
            <NetworkDashboardRail network={profile} />
          </Suspense>

          <div className="flex items-center gap-3 px-1">
            <NetworkAvatar profile={profile} />
            <div>
              <p className="text-sm font-medium text-ink-50">{profile.name}</p>
              <p className="text-xs text-ink-400">{profile.symbol}</p>
            </div>
          </div>

          <DataPanel title="At a glance">
            {scale.loanPipelineUsd != null && (
              <DataRow label={pipelineLabel} value={formatUsdCompact(scale.loanPipelineUsd)} />
            )}
            {scale.partnerships != null && (
              <DataRow label={partnershipsLabel} value={`${scale.partnerships}+`} />
            )}
            {profile.memberCoins.length > 0 && (
              <DataRow
                label="Member coins"
                value={
                  <a href="#member-coins" className="text-electric-400 hover:underline">
                    {profile.memberCoins.length} products →
                  </a>
                }
              />
            )}
          </DataPanel>

          <div className="hidden lg:block">
            <SectionNav items={sectionNavItems} nested />
          </div>

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

      <ResearchChatScope entitySlug={profile.slug} entityName={profile.name} />
    </div>
  );
}
