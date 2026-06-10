import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight, BookOpen } from "lucide-react";

import {
  ComponentsSection,
  DifferentiatorSection,
  EventsSection,
  FaqSection,
  InvestmentRoundsSection,
  OrgStructureSection,
  PartnershipsSection,
  RisksSection,
  TradFiComparisonSection,
  buildEntitySectionNav,
} from "@/components/entities/EntitySections";
import { EntityMarketCard } from "@/components/entities/EntityMarketCard";
import { MemberCoins } from "@/components/entities/MemberCoins";
import { AgentSkillCard } from "@/components/agent/AgentSkillCard";
import { EntityAgentPanel } from "@/components/agent/EntityAgentPanel";
import { EntityAgentDock } from "@/components/agent/EntityAgentDock";
import { agentConfigStatus } from "@/lib/agent/config";
import { OffchainFactsPanel } from "@/components/shared/OffchainFactsPanel";
import { SecurityBadge } from "@/components/shared/SecurityBadge";
import { SourcesFooter } from "@/components/shared/SourcesFooter";
import { TokenomicsCard } from "@/components/shared/TokenomicsCard";
import { TypedRiskList } from "@/components/shared/TypedRiskList";
import { Badge } from "@/components/ui/Badge";
import { DataPanel, DataRow, LinkRow } from "@/components/ui/DataPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionNav } from "@/components/ui/SectionNav";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { getApprovedEntities, getApprovedEntityBySlug, getEntityMemberCoins } from "@/lib/data";
import { buildSkillFromEntity } from "@/lib/agent/skills";
import { deriveSecurityStatus } from "@/lib/security";
import { getCoinLiveData } from "@/lib/server/coin";
import type { EntityProfile } from "@/lib/types";
import { formatUsdCompact, formatUsersCompact } from "@/lib/utils";

interface PageProps {
  params: { slug: string };
}

export const revalidate = 300;

export async function generateStaticParams() {
  return (await getApprovedEntities()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const profile = await getApprovedEntityBySlug(params.slug);
  if (!profile) return { title: "Not found" };
  return { title: profile.name, description: profile.description };
}

function MemberCoinsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="h-44 animate-pulse rounded-2xl bg-ink-800/50" />
      ))}
    </div>
  );
}

async function MemberCoinsSection({ entity }: { entity: EntityProfile }) {
  const members = await getEntityMemberCoins(entity);
  const coins = await Promise.all(
    members
      .filter((m) => m.profile !== null)
      .map((m) => getCoinLiveData(m.profile!, m.ref.role)),
  );

  if (coins.length === 0) {
    return (
      <Card className="text-sm text-ink-300">
        Member coins are staged but not yet approved. They&apos;ll appear here (with live
        CoinGecko + Alchemy data) once approved.
      </Card>
    );
  }

  return <MemberCoins coins={coins} />;
}

function EntityAvatar({ profile }: { profile: EntityProfile }) {
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

export default async function EntityProfilePage({ params }: PageProps) {
  const profile = await getApprovedEntityBySlug(params.slug);
  if (!profile) notFound();

  const agentStatus = agentConfigStatus();
  const entitySkill = profile.agentSkill ?? buildSkillFromEntity(profile);
  const scale = profile.currentScale;
  const labels = profile.scaleLabels ?? {};
  const tvlLabel = labels.tvl ?? "Total deposits / TVL";
  const usersLabel = labels.users ?? "Users";
  const aprLabel = labels.apr ?? "APR";
  const pipelineLabel = labels.pipeline ?? "Loan pipeline";
  const partnershipsLabel = labels.partnerships ?? "Partnerships";
  const coinsLabel = labels.coins ?? `Coins under ${profile.name}`;

  const sectionNavItems = buildEntitySectionNav(profile);

  const ctaClass =
    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors";
  const ctaPrimary = `${ctaClass} border-electric-500/40 bg-electric-500/10 text-electric-300 hover:bg-electric-500/20`;
  const ctaSecondary = `${ctaClass} border-ink-700 bg-ink-900/60 text-ink-200 hover:text-ink-50`;

  return (
    <div className="container space-y-8 py-12">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Entities", href: "/entities" },
          { label: profile.name },
        ]}
        title={profile.name}
        badges={
          <>
            <Badge tone="neon">Entity</Badge>
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
        <StatCard label={tvlLabel} value={formatUsdCompact(scale.tvlUsd)} hint="Latest data" />
        <StatCard
          label={usersLabel}
          value={scale.users != null ? formatUsersCompact(scale.users) : "—"}
          hint={labels.users ? undefined : "Depositors"}
        />
        <StatCard
          label={aprLabel}
          value={
            scale.marketCapUsd != null
              ? formatUsdCompact(scale.marketCapUsd)
              : scale.aprPct != null
                ? `${scale.aprPct.toFixed(2)}%`
                : "—"
          }
          hint={
            scale.marketCapUsd == null && scale.targetAprPct != null
              ? `Target ${scale.targetAprPct.toFixed(2)}%`
              : undefined
          }
        />
        <StatCard label={coinsLabel} value={`${profile.memberCoins.length}`} hint="Member products" />
      </section>

      {/* Mobile section nav */}
      <SectionNav items={sectionNavItems} className="lg:hidden" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section id="member-coins" className="scroll-mt-24 space-y-4">
            <div className="border-b border-ink-800/60 pb-2">
              <h2 className="font-display text-lg font-semibold tracking-tight text-ink-50">
                Coins under {profile.name}
              </h2>
              <p className="mt-1 text-sm text-ink-300">
                Open a full profile or use Quick view for live CoinGecko + Alchemy data.
              </p>
            </div>
            <Suspense fallback={<MemberCoinsSkeleton />}>
              <MemberCoinsSection entity={profile} />
            </Suspense>
          </section>

          <EntityAgentPanel
            entitySlug={profile.slug}
            entityName={profile.name}
            skill={{ id: entitySkill.id, title: entitySkill.title }}
            zerodevConfigured={agentStatus.zerodev}
            llmConfigured={agentStatus.llm}
          />

          {profile.market && (
            <EntityMarketCard market={profile.market} symbol={profile.symbol} />
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
            <ComponentsSection components={profile.components} />
            <DifferentiatorSection differentiator={profile.differentiator} />
            {profile.offchainFacts && (
              <section id="facts" className="scroll-mt-24 space-y-4">
                <div className="border-b border-ink-800/60 pb-2">
                  <h2 className="font-display text-lg font-semibold tracking-tight text-ink-50">
                    Key facts
                  </h2>
                  <p className="mt-1 text-sm text-ink-300">
                    Curated off-chain facts with source + freshness.
                  </p>
                </div>
                <OffchainFactsPanel facts={profile.offchainFacts} title="Off-chain facts" />
              </section>
            )}
            <FaqSection faq={profile.faq} />
            <EventsSection events={profile.timeline ?? profile.events} />
            <OrgStructureSection org={profile.orgStructure} />
            {profile.tokenomics && <TokenomicsCard tokenomics={profile.tokenomics} />}
            {profile.typedRisks ? (
              <TypedRiskList risks={profile.typedRisks} />
            ) : (
              <RisksSection risks={profile.risks} />
            )}
            <InvestmentRoundsSection rounds={profile.investmentRounds} />
            <PartnershipsSection partnerships={profile.partnerships} />
            <TradFiComparisonSection
              rows={profile.tradFiComparison}
              entityName={profile.name}
            />
            <AgentSkillCard skill={entitySkill} />
            {profile.sources && <SourcesFooter sources={profile.sources} />}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <EntityAgentDock
            entitySlug={profile.slug}
            entityName={profile.name}
            llmConfigured={agentStatus.llm}
          />

          <div className="hidden lg:block">
            <SectionNav items={sectionNavItems} />
          </div>

          <div className="flex items-center gap-3 px-1">
            <EntityAvatar profile={profile} />
            <div>
              <p className="text-sm font-medium text-ink-50">{profile.name}</p>
              <p className="text-xs text-ink-400">{profile.symbol}</p>
            </div>
          </div>

          <DataPanel title="At a glance">
            <DataRow label={pipelineLabel} value={formatUsdCompact(scale.loanPipelineUsd)} />
            <DataRow
              label={partnershipsLabel}
              value={scale.partnerships != null ? `${scale.partnerships}+` : "—"}
            />
            <DataRow
              label="Member coins"
              value={
                profile.memberCoins.length
                  ? profile.memberCoins.map((c) => c.symbol).join(", ")
                  : "—"
              }
            />
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
