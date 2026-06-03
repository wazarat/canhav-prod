import Link from "next/link";
import { ArrowRight, ArrowUpRight, Network } from "lucide-react";

import { CategoryGrid } from "@/components/CategoryGrid";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import {
  CATEGORIES,
  getAllEntities,
  getAllRwas,
  getAllStablecoins,
  getAllTokens,
  getApprovedEntities,
  getApprovedStablecoins,
  pegDeviationBps,
} from "@/lib/data";
import { formatUsdCompact } from "@/lib/utils";

export const revalidate = 300;

export default async function DashboardPage() {
  const [approved, allStablecoins, allRwas, allEntities, allTokens, approvedEntities] =
    await Promise.all([
      getApprovedStablecoins(),
      getAllStablecoins(),
      getAllRwas(),
      getAllEntities(),
      getAllTokens(),
      getApprovedEntities(),
    ]);
  const activeCategories = CATEGORIES.filter((c) => c.status === "active").length;
  const featuredEntity = approvedEntities[0] ?? null;

  const trackedBySlug: Record<string, number> = {
    entities: allEntities.length,
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
    <div className="container space-y-16 py-14 md:py-20">
      {/* Hero */}
      <section className="max-w-3xl space-y-6 animate-fade-in-up">
        <span className="inline-flex items-center gap-2 rounded-full border border-ink-800 bg-ink-900/60 px-3 py-1 text-xs font-medium text-ink-300">
          <span className="h-1.5 w-1.5 rounded-full bg-electric-500" />
          Arbitrum Ecosystem Intelligence
        </span>
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-ink-50 md:text-5xl">
          A capital-markets terminal for the{" "}
          <span className="text-gradient-brand">Arbitrum ecosystem</span>.
        </h1>
        <p className="text-lg text-ink-300">
          Research-grade taxonomy and datasets across stablecoins, RWAs, entities, tokens, lending,
          perpetuals and more — published as soon as data is ingested and synced.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/entities">
              Explore entities
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
      </section>

      {/* Featured entity */}
      {featuredEntity && (
        <section>
          <Link href={`/entities/${featuredEntity.slug}`} className="block">
            <div className="group glass relative overflow-hidden rounded-2xl border border-neon-500/30 p-6 transition-all duration-200 hover:border-neon-500/60 hover:glow-ring md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-xl border border-neon-500/30 bg-neon-500/10 text-neon-400">
                      <Network className="h-5 w-5" />
                    </span>
                    <Badge tone="neon">Featured entity</Badge>
                  </div>
                  <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-50">
                    {featuredEntity.name}
                    <ArrowUpRight className="ml-1 inline h-5 w-5 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-neon-400" />
                  </h2>
                  <p className="text-sm leading-relaxed text-ink-300">
                    {featuredEntity.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {featuredEntity.memberCoins.map((c) => (
                      <Badge key={c.slug} tone={c.category === "Token" ? "neon" : "electric"}>
                        {c.symbol}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-6">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-ink-300">TVL</p>
                    <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink-50">
                      {formatUsdCompact(featuredEntity.currentScale.tvlUsd)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-ink-300">
                      sUSDai APR
                    </p>
                    <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink-50">
                      {featuredEntity.currentScale.aprPct != null
                        ? `${featuredEntity.currentScale.aprPct.toFixed(2)}%`
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

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
  );
}
