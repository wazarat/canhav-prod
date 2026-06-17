import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarketStats, MarketStatsSkeleton } from "@/components/market/MarketStats";
import { OnchainPanel, OnchainPanelSkeleton } from "@/components/onchain/OnchainPanel";
import { SourcesFooter } from "@/components/shared/SourcesFooter";
import { TypedRiskList } from "@/components/shared/TypedRiskList";
import { AumGauge } from "@/components/tokens/AumGauge";
import { JlpPoolComposition } from "@/components/tokens/JlpPoolComposition";
import { JlpYieldCard } from "@/components/tokens/JlpYieldCard";
import { TokenHeadlineStats } from "@/components/tokens/TokenHeadlineStats";
import { TokenPriceHistorySection } from "@/components/tokens/TokenPriceHistorySection";
import { TokenProfileCard } from "@/components/tokens/TokenProfileCard";
import { ClassificationChips } from "@/components/shared/ClassificationChips";
import { LendingMarketCard } from "@/components/shared/LendingMarketCard";
import { OffchainFactsPanel } from "@/components/shared/OffchainFactsPanel";
import { SecurityBadge } from "@/components/shared/SecurityBadge";
import { TokenomicsCard } from "@/components/shared/TokenomicsCard";
import { UnlistedMarketNotice } from "@/components/shared/UnlistedMarketNotice";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatGridSkeleton } from "@/components/ui/Skeletons";
import { ResearchChatScope } from "@/components/agent/research-chat-context";
import { agentConfigStatus } from "@/lib/agent/config";
import { getApprovedTokenBySlug, getApprovedTokens, getNetworkBySlug } from "@/lib/data";
import { deriveSecurityStatus } from "@/lib/security";

interface PageProps {
  params: { slug: string };
}

export const revalidate = 300;

export async function generateStaticParams() {
  return (await getApprovedTokens()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const profile = await getApprovedTokenBySlug(params.slug);
  if (!profile) return { title: "Not found" };
  return { title: profile.name, description: profile.description };
}

export default async function TokenProfilePage({ params }: PageProps) {
  const profile = await getApprovedTokenBySlug(params.slug);
  if (!profile) notFound();

  const entity = profile.entitySlug ? await getNetworkBySlug(profile.entitySlug) : null;
  const agentStatus = agentConfigStatus();

  return (
    <div className="container space-y-8 py-12">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Tokens", href: "/tokens" },
          { label: profile.name },
        ]}
        title={profile.name}
        badges={
          <>
            <Badge tone="neutral" className="font-mono">
              {profile.symbol}
            </Badge>
            <Badge tone="neon">{profile.tokenType}</Badge>
            {profile.subCategory && <Badge tone="neutral">{profile.subCategory}</Badge>}
            <ClassificationChips
              assetSubtype={profile.assetSubtype}
              pegMechanism={profile.pegMechanism}
            />
            <SecurityBadge
              info={deriveSecurityStatus({
                isPubliclyAudited: profile.arbitrumPortalMetadata?.isPubliclyAudited,
                auditUrl: profile.auditUrl,
                audits: profile.audits,
              })}
            />
            {entity && (
              <Link href={`/networks/${entity.slug}`}>
                <Badge tone="electric">Part of {entity.name}</Badge>
              </Link>
            )}
          </>
        }
        description={profile.longDescription ?? profile.description}
      />

      <UnlistedMarketNotice profile={profile} />

      <Suspense fallback={<StatGridSkeleton />}>
        <TokenHeadlineStats profile={profile} />
      </Suspense>

      <Suspense
        fallback={
          <Card>
            <div className="h-40 animate-pulse rounded bg-ink-800/40" />
          </Card>
        }
      >
        <TokenPriceHistorySection profile={profile} />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {profile.poolComposition && (
            <JlpPoolComposition composition={profile.poolComposition} />
          )}
          {profile.poolComposition && <AumGauge composition={profile.poolComposition} />}
          {profile.tokenomics && <TokenomicsCard tokenomics={profile.tokenomics} />}
          {profile.typedRisks && <TypedRiskList risks={profile.typedRisks} />}
          <Suspense fallback={<OnchainPanelSkeleton />}>
            <OnchainPanel profile={profile} />
          </Suspense>
          {profile.sources && <SourcesFooter sources={profile.sources} />}
        </div>

        <div className="space-y-4">
          {profile.yieldMechanics && (
            <JlpYieldCard yieldMechanics={profile.yieldMechanics} />
          )}
          {profile.lendingMarket && <LendingMarketCard market={profile.lendingMarket} />}
          <TokenProfileCard profile={profile} />
          <OffchainFactsPanel facts={profile.offchainFacts} />
          <Suspense fallback={<MarketStatsSkeleton />}>
            <MarketStats profile={profile} />
          </Suspense>
        </div>
      </div>

      <ResearchChatScope entitySlug={profile.entitySlug} entityName={entity?.name} />
    </div>
  );
}
