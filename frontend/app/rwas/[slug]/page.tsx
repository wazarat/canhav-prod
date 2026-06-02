import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { MockDataBanner } from "@/components/MockDataBanner";
import { RwaProfileCard } from "@/components/rwas/RwaProfileCard";
import { TvlChart } from "@/components/rwas/TvlChart";
import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import {
  getApprovedRwas,
  getApprovedRwaBySlug,
  LIVE_METRICS_PENDING,
  latestTvl,
  tvlChangePct,
  tvlTrend,
} from "@/lib/data";
import { formatUsdCompact } from "@/lib/utils";

interface PageProps {
  params: { slug: string };
}

// Pre-render only APPROVED profiles; pending items are not public.
export function generateStaticParams() {
  return getApprovedRwas().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const profile = getApprovedRwaBySlug(params.slug);
  if (!profile) return { title: "Not found" };
  return {
    title: `${profile.name}`,
    description: profile.description,
  };
}

const TREND_TONE = {
  growing: "positive",
  stable: "neutral",
  declining: "danger",
} as const;

const TREND_LABEL = {
  growing: "Growing",
  stable: "Stable",
  declining: "Declining",
} as const;

export default function RwaProfilePage({ params }: PageProps) {
  const profile = getApprovedRwaBySlug(params.slug);
  if (!profile) notFound();

  const tvl = latestTvl(profile);
  const pct = tvlChangePct(profile);
  const trend = tvlTrend(profile);
  const sign = pct !== null && pct > 0 ? "+" : "";

  return (
    <div className="container space-y-8 py-12">
      <nav className="flex items-center gap-1.5 text-sm text-ink-300">
        <Link href="/" className="transition-colors hover:text-ink-50">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <Link href="/rwas" className="transition-colors hover:text-ink-50">
          Real World Assets
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <span className="text-ink-100">{profile.name}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
              {profile.name}
            </h1>
            <Badge tone="neutral" className="font-mono">
              {profile.symbol}
            </Badge>
            <Badge tone="neon">{profile.assetClass}</Badge>
          </div>
          <p className="max-w-2xl text-sm text-ink-300">{profile.description}</p>
        </div>
      </header>

      {LIVE_METRICS_PENDING && <MockDataBanner metrics="TVL and AUM" />}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="TVL" value={formatUsdCompact(tvl)} hint="Mock — Alchemy in Step 4" />
        <StatCard label="30d change" value={pct === null ? "—" : `${sign}${pct.toFixed(1)}%`} />
        <StatCard label="Asset class" value={profile.assetClass} />
        <StatCard label="Trend" value={TREND_LABEL[trend]} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <CardTitle>Total value locked</CardTitle>
            <Badge tone={TREND_TONE[trend]}>{TREND_LABEL[trend]}</Badge>
          </div>
          <p className="mt-1 text-xs text-ink-300">
            {profile.historicalTvlData.points.length}-day series · source: Dune (mock)
          </p>
          <div className="mt-4">
            <TvlChart id={profile.slug} points={profile.historicalTvlData.points} trend={trend} />
          </div>
        </Card>

        <RwaProfileCard profile={profile} />
      </div>
    </div>
  );
}
