import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, BookOpen, ChevronRight } from "lucide-react";

import {
  ComponentsSection,
  DifferentiatorSection,
  FaqSection,
  InvestmentRoundsSection,
  OrgStructureSection,
  PartnershipsSection,
  RisksSection,
  TradFiComparisonSection,
} from "@/components/entities/EntitySections";
import { MemberCoins } from "@/components/entities/MemberCoins";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { getApprovedEntities, getApprovedEntityBySlug, getEntityMemberCoins } from "@/lib/data";
import { getCoinLiveData } from "@/lib/server/coin";
import type { EntityProfile } from "@/lib/types";
import { formatUsdCompact } from "@/lib/utils";

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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-40 animate-pulse rounded-2xl bg-ink-800/50" />
      ))}
    </div>
  );
}

/** Server component: resolves each member coin's live data, feeds the modal. */
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

export default async function EntityProfilePage({ params }: PageProps) {
  const profile = await getApprovedEntityBySlug(params.slug);
  if (!profile) notFound();

  const scale = profile.currentScale;

  return (
    <div className="container space-y-12 py-12">
      <nav className="flex items-center gap-1.5 text-sm text-ink-300">
        <Link href="/" className="transition-colors hover:text-ink-50">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <Link href="/entities" className="transition-colors hover:text-ink-50">
          Entities
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <span className="text-ink-100">{profile.name}</span>
      </nav>

      {/* Header + description */}
      <header className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink-50">
            {profile.name}
          </h1>
          <Badge tone="neon">Entity</Badge>
        </div>
        <p className="max-w-3xl text-lg leading-relaxed text-ink-100">{profile.description}</p>
        {profile.tagline && (
          <p className="max-w-3xl text-sm leading-relaxed text-ink-300">{profile.tagline}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {profile.officialDocs && (
            <a
              href={profile.officialDocs}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-2 text-sm font-medium text-electric-300 transition-colors hover:bg-electric-500/20"
            >
              <BookOpen className="h-4 w-4" />
              Official Docs
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm font-medium text-ink-200 transition-colors hover:text-ink-50"
            >
              Website
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
          {profile.twitter && (
            <a
              href={profile.twitter}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm font-medium text-ink-200 transition-colors hover:text-ink-50"
            >
              Twitter / X
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </header>

      {/* Current scale */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total deposits / TVL" value={formatUsdCompact(scale.tvlUsd)} hint="Latest data" />
        <StatCard
          label="Users"
          value={scale.users != null ? `${(scale.users / 1000).toFixed(0)}K+` : "—"}
          hint="Depositors"
        />
        <StatCard
          label="sUSDai APR"
          value={scale.aprPct != null ? `${scale.aprPct.toFixed(2)}%` : "—"}
          hint={scale.targetAprPct != null ? `Target ${scale.targetAprPct.toFixed(2)}%` : undefined}
        />
        <StatCard
          label="Loan pipeline"
          value={formatUsdCompact(scale.loanPipelineUsd)}
          hint="Active"
        />
        <StatCard
          label="Partnerships"
          value={scale.partnerships != null ? `${scale.partnerships}+` : "—"}
          hint="Approved facilities"
        />
        <StatCard label="Coins" value={`${profile.memberCoins.length}`} hint="Under USD.AI" />
      </section>

      {/* Components */}
      <ComponentsSection components={profile.components} />

      {/* Differentiator */}
      <DifferentiatorSection differentiator={profile.differentiator} />

      {/* Member coins (clickable -> modal with live data) */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink-50">
            Coins under {profile.name}
          </h2>
          <p className="text-sm text-ink-300">
            Click any coin to view its live CoinGecko + Alchemy data.
          </p>
        </div>
        <Suspense fallback={<MemberCoinsSkeleton />}>
          <MemberCoinsSection entity={profile} />
        </Suspense>
      </section>

      {/* FAQ */}
      <FaqSection faq={profile.faq} />

      {/* Organizational structure */}
      <OrgStructureSection org={profile.orgStructure} />

      {/* Risks */}
      <RisksSection risks={profile.risks} />

      {/* Investment rounds */}
      <InvestmentRoundsSection rounds={profile.investmentRounds} />

      {/* Partnerships */}
      <PartnershipsSection partnerships={profile.partnerships} />

      {/* Similarity to TradFi (bottom) */}
      <TradFiComparisonSection rows={profile.tradFiComparison} />
    </div>
  );
}
