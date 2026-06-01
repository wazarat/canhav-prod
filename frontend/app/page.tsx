import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CategoryGrid } from "@/components/CategoryGrid";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import {
  CATEGORIES,
  getApprovedStablecoins,
  pegDeviationBps,
} from "@/lib/data";
import { formatUsdCompact } from "@/lib/utils";

export default function DashboardPage() {
  const approved = getApprovedStablecoins();
  const activeCategories = CATEGORIES.filter((c) => c.status === "active").length;

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
          Research-grade taxonomy and datasets across stablecoins, RWAs, lending, perpetuals and
          more — every profile gated by an explicit approval workflow before it goes live.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/stablecoins">
              Explore stablecoins
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Summary stats */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active categories" value={`${activeCategories} / ${CATEGORIES.length}`} hint="Stablecoins live; more in progress" />
        <StatCard label="Approved stablecoins" value={`${approved.length}`} hint="Visible on the public dashboard" />
        <StatCard label="Aggregate supply" value={formatUsdCompact(aggregateSupply)} hint="Mock — live via Alchemy (Step 4)" />
        <StatCard
          label="Avg peg deviation"
          value={avgDeviation === null ? "—" : `${avgDeviation} bps`}
          hint="Across approved profiles"
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
        <CategoryGrid categories={CATEGORIES} />
      </section>
    </div>
  );
}
