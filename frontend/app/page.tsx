import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CategoryGrid } from "@/components/CategoryGrid";
import { HeroVideo } from "@/components/home/HeroVideo";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import {
  CATEGORIES,
  getAllNetworks,
  getAllRwas,
  getAllStablecoins,
  getAllTokens,
  getApprovedStablecoins,
  pegDeviationBps,
} from "@/lib/data";
import { formatUsdCompact } from "@/lib/utils";

export const revalidate = 300;

export default async function DashboardPage() {
  const [approved, allStablecoins, allRwas, allNetworks, allTokens] = await Promise.all([
    getApprovedStablecoins(),
    getAllStablecoins(),
    getAllRwas(),
    getAllNetworks(),
    getAllTokens(),
  ]);
  const activeCategories = CATEGORIES.filter((c) => c.status === "active").length;

  const trackedBySlug: Record<string, number> = {
    networks: allNetworks.length,
    stablecoins: allStablecoins.length,
    rwas: allRwas.length,
    tokens: allTokens.length,
  };
  const categories = CATEGORIES.map((c) =>
    c.slug in trackedBySlug ? { ...c, trackedCount: trackedBySlug[c.slug] } : c,
  );

  const aggregateSupply = approved.reduce((sum, p) => sum + (p.totalSupply.value ?? 0), 0);
  const deviations = approved
    .map((p) => pegDeviationBps(p))
    .filter((d): d is number => d !== null);
  const avgDeviation =
    deviations.length > 0
      ? Math.round(deviations.reduce((a, b) => a + b, 0) / deviations.length)
      : null;

  return (
    <div>
      {/* Hero: full-bleed muted background video */}
      <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[#3c72ab]">
        <HeroVideo src="/hero-video.mp4" />

        {/* scrims: darken top (for nav edge) + left (for hero copy) + fade into page bg */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(180deg, rgba(6,14,26,0.80) 0%, rgba(6,14,26,0.32) 20%, rgba(6,14,26,0) 40%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(90deg, rgba(6,14,26,0.74) 0%, rgba(6,14,26,0.42) 34%, rgba(6,14,26,0) 62%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 right-0 z-[1] h-44"
          style={{
            background: "linear-gradient(180deg, rgba(5,6,10,0) 0%, #05060A 100%)",
          }}
        />

        <div className="container relative z-[2] flex min-h-[calc(100vh-4rem)] items-center py-16">
          <div className="max-w-2xl space-y-7 animate-fade-in-up">
            <h1
              className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink-50 md:text-6xl"
              style={{ textShadow: "0 2px 20px rgba(4,10,20,0.35)" }}
            >
              Where DeFi research gets{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(120deg,#7cb0ff 0%,#b79bff 50%,#4fe3f5 100%)",
                }}
              >
                real context
              </span>
              , beyond on-chain data.
            </h1>
            <p
              className="max-w-xl text-lg leading-relaxed text-ink-50/90 md:text-xl"
              style={{ textShadow: "0 1px 12px rgba(4,10,20,0.4)" }}
            >
              Track what is happening on-chain, understand what is happening off-chain, and
              connect the dots across protocols, narratives, and external terminals from one
              place.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button asChild>
                <Link href="/networks">
                  Explore networks
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/stablecoins">
                  Explore stablecoins
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container space-y-16 py-14 md:py-20">
      {/* Summary stats */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active categories" value={`${activeCategories} / ${CATEGORIES.length}`} hint="Stablecoins live; more in progress" />
        <StatCard label="Stablecoins tracked" value={`${approved.length}`} hint="In the live store" />
        <StatCard label="Aggregate supply" value={formatUsdCompact(aggregateSupply)} hint="Live via Alchemy" />
        <StatCard
          label="Avg peg deviation"
          value={avgDeviation === null ? "—" : `${avgDeviation} bps`}
          hint="Across tracked stablecoins"
        />
      </section>

      {/* Category taxonomy */}
      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-50">
              Ecosystem taxonomy
            </h2>
            <p className="mt-1 text-sm text-ink-300">
              The schema expands category-by-category. Stablecoins is the active module.
            </p>
          </div>
        </div>
        <CategoryGrid categories={categories} />
      </section>
      </div>
    </div>
  );
}
