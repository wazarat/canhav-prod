import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OnchainPanel, OnchainPanelSkeleton } from "@/components/onchain/OnchainPanel";
import { MarketStats, MarketStatsSkeleton } from "@/components/market/MarketStats";
import { PegHistorySection } from "@/components/stablecoins/PegHistorySection";
import { ProfileCard } from "@/components/stablecoins/ProfileCard";
import { StablecoinHeadlineStats } from "@/components/stablecoins/StablecoinHeadlineStats";
import { ClassificationChips } from "@/components/shared/ClassificationChips";
import { LendingMarketCard } from "@/components/shared/LendingMarketCard";
import { OffchainFactsPanel } from "@/components/shared/OffchainFactsPanel";
import { SecurityBadge } from "@/components/shared/SecurityBadge";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChartCardSkeleton, StatGridSkeleton } from "@/components/ui/Skeletons";
import { ResearchChatScope } from "@/components/agent/research-chat-context";
import { agentConfigStatus } from "@/lib/agent/config";
import { getApprovedStablecoinBySlug, getApprovedStablecoins, getEntityBySlug } from "@/lib/data";
import { deriveSecurityStatus } from "@/lib/security";

interface PageProps {
  params: { slug: string };
}

export const revalidate = 300;

// Pre-render all profiles present in the store.
export async function generateStaticParams() {
  return (await getApprovedStablecoins()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const profile = await getApprovedStablecoinBySlug(params.slug);
  if (!profile) return { title: "Not found" };
  return {
    title: `${profile.name}`,
    description: profile.description,
  };
}

export default async function StablecoinProfilePage({ params }: PageProps) {
  const profile = await getApprovedStablecoinBySlug(params.slug);
  if (!profile) notFound();
  const entity = profile.entitySlug ? await getEntityBySlug(profile.entitySlug) : null;
  const agentStatus = agentConfigStatus();

  return (
    <div className="container space-y-8 py-12">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Stablecoins", href: "/stablecoins" },
          { label: profile.name },
        ]}
        title={profile.name}
        badges={
          <>
            <Badge tone="neutral" className="font-mono">
              {profile.symbol}
            </Badge>
            <Badge tone={profile.pegTarget === "EUR" ? "neon" : "electric"}>
              {profile.pegTarget} peg
            </Badge>
            {profile.subCategory && <Badge tone="neutral">{profile.subCategory}</Badge>}
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
                <Badge tone="neon">Part of {entity.name}</Badge>
              </Link>
            )}
          </>
        }
        description={profile.description}
      />

      <Suspense fallback={<StatGridSkeleton />}>
        <StablecoinHeadlineStats profile={profile} />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Suspense fallback={<ChartCardSkeleton title="Historical peg variance" />}>
            <PegHistorySection profile={profile} />
          </Suspense>

          <Suspense fallback={<OnchainPanelSkeleton />}>
            <OnchainPanel profile={profile} />
          </Suspense>
        </div>

        <div className="space-y-4">
          <ProfileCard profile={profile} />
          {profile.lendingMarket && <LendingMarketCard market={profile.lendingMarket} />}
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
