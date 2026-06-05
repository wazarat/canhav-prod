import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarketStats, MarketStatsSkeleton } from "@/components/market/MarketStats";
import { OnchainPanel, OnchainPanelSkeleton } from "@/components/onchain/OnchainPanel";
import { TokenHeadlineStats } from "@/components/tokens/TokenHeadlineStats";
import { TokenProfileCard } from "@/components/tokens/TokenProfileCard";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatGridSkeleton } from "@/components/ui/Skeletons";
import { getApprovedTokenBySlug, getApprovedTokens, getEntityBySlug } from "@/lib/data";

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
  const entity = profile.entitySlug ? await getEntityBySlug(profile.entitySlug) : null;

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
            {entity && (
              <Link href={`/entities/${entity.slug}`}>
                <Badge tone="electric">Part of {entity.name}</Badge>
              </Link>
            )}
          </>
        }
        description={profile.description}
      />

      <Suspense fallback={<StatGridSkeleton />}>
        <TokenHeadlineStats profile={profile} />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Suspense fallback={<OnchainPanelSkeleton />}>
            <OnchainPanel profile={profile} />
          </Suspense>
        </div>

        <div className="space-y-4">
          <TokenProfileCard profile={profile} />
          <Suspense fallback={<MarketStatsSkeleton />}>
            <MarketStats profile={profile} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
