import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { MockDataBanner } from "@/components/MockDataBanner";
import { PegVarianceChart } from "@/components/stablecoins/PegVarianceChart";
import { ProfileCard } from "@/components/stablecoins/ProfileCard";
import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import {
  getApprovedStablecoins,
  getApprovedStablecoinBySlug,
  LIVE_METRICS_PENDING,
  latestPegPrice,
  pegDeviationBps,
  pegHealth,
} from "@/lib/data";
import { formatPeg, formatUsdCompact } from "@/lib/utils";

interface PageProps {
  params: { slug: string };
}

// Pre-render only APPROVED profiles; pending items are not public.
export function generateStaticParams() {
  return getApprovedStablecoins().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const profile = getApprovedStablecoinBySlug(params.slug);
  if (!profile) return { title: "Not found" };
  return {
    title: `${profile.name}`,
    description: profile.description,
  };
}

const HEALTH_TONE = {
  tight: "positive",
  watch: "warning",
  loose: "danger",
} as const;

const HEALTH_LABEL = {
  tight: "Tight peg",
  watch: "Watch",
  loose: "Loose peg",
} as const;

export default function StablecoinProfilePage({ params }: PageProps) {
  const profile = getApprovedStablecoinBySlug(params.slug);
  if (!profile) notFound();

  const latest = latestPegPrice(profile);
  const bps = pegDeviationBps(profile);
  const health = pegHealth(profile);
  const symbol = profile.pegTarget === "EUR" ? "€" : "$";
  const supplyLabel =
    profile.pegTarget === "EUR" && profile.totalSupply.value !== null
      ? `€${formatUsdCompact(profile.totalSupply.value).slice(1)}`
      : formatUsdCompact(profile.totalSupply.value);

  return (
    <div className="container space-y-8 py-12">
      <nav className="flex items-center gap-1.5 text-sm text-ink-300">
        <Link href="/" className="transition-colors hover:text-ink-50">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <Link href="/stablecoins" className="transition-colors hover:text-ink-50">
          Stablecoins
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
            <Badge tone={profile.pegTarget === "EUR" ? "neon" : "electric"}>
              {profile.pegTarget} peg
            </Badge>
          </div>
          <p className="max-w-2xl text-sm text-ink-300">{profile.description}</p>
        </div>
      </header>

      {LIVE_METRICS_PENDING && <MockDataBanner />}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Latest peg" value={`${symbol}${formatPeg(latest)}`} />
        <StatCard label="Deviation" value={bps === null ? "—" : `${bps} bps`} />
        <StatCard label="Circulating supply" value={supplyLabel} hint="Mock — Alchemy in Step 4" />
        <StatCard label="Peg health" value={HEALTH_LABEL[health]} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <CardTitle>Historical peg variance</CardTitle>
            <Badge tone={HEALTH_TONE[health]}>{HEALTH_LABEL[health]}</Badge>
          </div>
          <p className="mt-1 text-xs text-ink-300">
            {profile.historicalPegData.points.length}-day series · source: Dune (mock)
          </p>
          <div className="mt-4">
            <PegVarianceChart
              id={profile.slug}
              points={profile.historicalPegData.points}
              pegTarget={profile.pegTarget}
            />
          </div>
        </Card>

        <ProfileCard profile={profile} />
      </div>
    </div>
  );
}
