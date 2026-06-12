import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarketStats, MarketStatsSkeleton } from "@/components/market/MarketStats";
import { OnchainPanel, OnchainPanelSkeleton } from "@/components/onchain/OnchainPanel";
import { RwaHeadlineStats } from "@/components/rwas/RwaHeadlineStats";
import { RwaProfileCard } from "@/components/rwas/RwaProfileCard";
import { TvlHistorySection } from "@/components/rwas/TvlHistorySection";
import { ChainDistributionCard } from "@/components/shared/ChainDistributionCard";
import { ClassificationChips } from "@/components/shared/ClassificationChips";
import { OffchainFactsPanel } from "@/components/shared/OffchainFactsPanel";
import { SecurityBadge } from "@/components/shared/SecurityBadge";
import { UnlistedMarketNotice } from "@/components/shared/UnlistedMarketNotice";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChartCardSkeleton, StatGridSkeleton } from "@/components/ui/Skeletons";
import { ResearchChatScope } from "@/components/agent/research-chat-context";
import { agentConfigStatus } from "@/lib/agent/config";
import { getApprovedRwas, getApprovedRwaBySlug, getEntityBySlug } from "@/lib/data";
import { deriveSecurityStatus } from "@/lib/security";

interface PageProps {
  params: { slug: string };
}

export const revalidate = 300;

// Pre-render all profiles present in the store.
export async function generateStaticParams() {
  return (await getApprovedRwas()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const profile = await getApprovedRwaBySlug(params.slug);
  if (!profile) return { title: "Not found" };
  return {
    title: `${profile.name}`,
    description: profile.description,
  };
}

export default async function RwaProfilePage({ params }: PageProps) {
  const profile = await getApprovedRwaBySlug(params.slug);
  if (!profile) notFound();
  const entity = profile.entitySlug ? await getEntityBySlug(profile.entitySlug) : null;
  const agentStatus = agentConfigStatus();

  return (
    <div className="container space-y-8 py-12">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Real World Assets", href: "/rwas" },
          { label: profile.name },
        ]}
        title={profile.name}
        badges={
          <>
            <Badge tone="neutral" className="font-mono">
              {profile.symbol}
            </Badge>
            <Badge tone="neon">{profile.assetClass}</Badge>
            <ClassificationChips
              assetSubtype={profile.assetSubtype}
              pegMechanism={profile.pegMechanism}
            />
            <SecurityBadge
              info={deriveSecurityStatus({
                isPubliclyAudited: profile.arbitrumPortalMetadata?.isPubliclyAudited,
                auditUrl: profile.auditUrl,
              })}
            />
            {entity && (
              <Link href={`/entities/${entity.slug}`}>
                <Badge tone="electric">Part of {entity.name}</Badge>
              </Link>
            )}
          </>
        }
        description={profile.description}
      />

      <UnlistedMarketNotice profile={profile} />

      <Suspense fallback={<StatGridSkeleton />}>
        <RwaHeadlineStats profile={profile} />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Suspense fallback={<ChartCardSkeleton title="Total value locked" />}>
            <TvlHistorySection profile={profile} />
          </Suspense>

          <Suspense fallback={<OnchainPanelSkeleton />}>
            <OnchainPanel profile={profile} />
          </Suspense>

          <ChainDistributionCard distribution={profile.chainDistribution} />
        </div>

        <div className="space-y-4">
          <RwaProfileCard profile={profile} />
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
