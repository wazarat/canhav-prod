import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AgentSkillCard } from "@/components/agent/AgentSkillCard";
import { EntityMarketCard } from "@/components/entities/EntityMarketCard";
import { MarketStats, MarketStatsSkeleton } from "@/components/market/MarketStats";
import { OnchainPanel, OnchainPanelSkeleton } from "@/components/onchain/OnchainPanel";
import { SourcesFooter } from "@/components/shared/SourcesFooter";
import { TypedRiskList } from "@/components/shared/TypedRiskList";
import { AumGauge } from "@/components/tokens/AumGauge";
import { JlpPoolComposition } from "@/components/tokens/JlpPoolComposition";
import { JlpYieldCard } from "@/components/tokens/JlpYieldCard";
import { PriceHistoryChart } from "@/components/tokens/PriceHistoryChart";
import { TokenHeadlineStats } from "@/components/tokens/TokenHeadlineStats";
import { TokenHeroStats } from "@/components/tokens/TokenHeroStats";
import { TokenProfileCard } from "@/components/tokens/TokenProfileCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
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

function JlpDashboard({
  profile,
}: {
  profile: NonNullable<Awaited<ReturnType<typeof getApprovedTokenBySlug>>>;
}) {
  return (
    <>
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
            {profile.entitySlug && (
              <Link href={`/entities/${profile.entitySlug}`}>
                <Badge tone="electric">Part of Jupiter</Badge>
              </Link>
            )}
          </>
        }
        description={profile.longDescription ?? profile.description}
        actions={
          profile.slug === "jlp" ? (
            <Link href="/tokens/jlp/trade">
              <Button>Trade JLP →</Button>
            </Link>
          ) : undefined
        }
      />

      <TokenHeroStats profile={profile} />

      {profile.priceHistory && (
        <PriceHistoryChart history={profile.priceHistory} id={profile.slug} />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {profile.poolComposition && (
            <JlpPoolComposition composition={profile.poolComposition} />
          )}
          {profile.poolComposition && <AumGauge composition={profile.poolComposition} />}
          {profile.typedRisks && <TypedRiskList risks={profile.typedRisks} />}
          <Suspense fallback={<OnchainPanelSkeleton />}>
            <OnchainPanel profile={profile} />
          </Suspense>
          {profile.slug === "jlp" && (
            <Card id="trade-replicate" className="scroll-mt-24 space-y-3">
              <CardTitle>Trade JLP exposure</CardTitle>
              <CardDescription>
                Open the GMX-style trading terminal to buy, hold, and track JLP with live PnL
                (demo — Arbitrum Sepolia).
              </CardDescription>
              <Link href="/tokens/jlp/trade">
                <Button variant="outline">Open trading terminal →</Button>
              </Link>
            </Card>
          )}
          {profile.agentSkill && <AgentSkillCard skill={profile.agentSkill} />}
          {profile.sources && <SourcesFooter sources={profile.sources} />}
        </div>

        <div className="space-y-4">
          {profile.yieldMechanics && (
            <JlpYieldCard yieldMechanics={profile.yieldMechanics} />
          )}
          <TokenProfileCard profile={profile} />
          <Suspense fallback={<MarketStatsSkeleton />}>
            <MarketStats profile={profile} />
          </Suspense>
        </div>
      </div>
    </>
  );
}

export default async function TokenProfilePage({ params }: PageProps) {
  const profile = await getApprovedTokenBySlug(params.slug);
  if (!profile) notFound();

  if (profile.poolComposition) {
    return (
      <div className="container space-y-8 py-12">
        <JlpDashboard profile={profile} />
      </div>
    );
  }

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
