import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { EntityTable } from "@/components/entities/EntityTable";
import { StatCard } from "@/components/ui/StatCard";
import { getApprovedEntities } from "@/lib/data";
import { formatUsdCompact } from "@/lib/utils";

export const metadata = {
  title: "Entities",
};

export const revalidate = 300;

export default async function EntitiesPage() {
  const profiles = await getApprovedEntities();

  const aggregateTvl = profiles.reduce((sum, p) => sum + (p.currentScale.tvlUsd ?? 0), 0);
  const totalCoins = profiles.reduce((sum, p) => sum + p.memberCoins.length, 0);

  return (
    <div className="container space-y-8 py-12">
      <nav className="flex items-center gap-1.5 text-sm text-ink-300">
        <Link href="/" className="transition-colors hover:text-ink-50">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <span className="text-ink-100">Entities</span>
      </nav>

      <header className="space-y-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
          Entities
        </h1>
        <p className="max-w-2xl text-sm text-ink-300">
          Top-tier umbrella protocols that group several coins under one issuer — spanning
          stablecoins, RWAs, and tokens.{" "}
          <span className="font-medium text-ink-100">{profiles.length}</span> entities tracked.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tracked" value={`${profiles.length}`} hint="Entities in store" />
        <StatCard label="Aggregate TVL" value={formatUsdCompact(aggregateTvl)} hint="Across entities" />
        <StatCard label="Grouped coins" value={`${totalCoins}`} hint="Stablecoins + tokens" />
        <StatCard
          label="Avg coins"
          value={profiles.length ? String(Math.round(totalCoins / profiles.length)) : "—"}
          hint="Per entity"
        />
      </section>

      <EntityTable profiles={profiles} emptyHint="No entities in the store yet." />
    </div>
  );
}
