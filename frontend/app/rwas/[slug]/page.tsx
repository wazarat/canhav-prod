import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { MarketStats, MarketStatsSkeleton } from "@/components/market/MarketStats";
import { OnchainPanel, OnchainPanelSkeleton } from "@/components/onchain/OnchainPanel";
import { RwaHeadlineStats } from "@/components/rwas/RwaHeadlineStats";
import { RwaProfileCard } from "@/components/rwas/RwaProfileCard";
import { TvlHistorySection } from "@/components/rwas/TvlHistorySection";
import { Badge } from "@/components/ui/Badge";
import { ChartCardSkeleton, StatGridSkeleton } from "@/components/ui/Skeletons";
import { getApprovedRwas, getApprovedRwaBySlug } from "@/lib/data";

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
        </div>

        <div className="space-y-4">
          <RwaProfileCard profile={profile} />
          <Suspense fallback={<MarketStatsSkeleton />}>
            <MarketStats profile={profile} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
