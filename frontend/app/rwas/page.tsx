import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { MockDataBanner } from "@/components/MockDataBanner";
import { RwaTable } from "@/components/rwas/RwaTable";
import { StatCard } from "@/components/ui/StatCard";
import { getApprovedRwas, LIVE_METRICS_PENDING } from "@/lib/data";
import { formatUsdCompact } from "@/lib/utils";

export const metadata = {
  title: "Real World Assets",
};

export const revalidate = 300;

export default async function RwasPage() {
  const profiles = await getApprovedRwas();

  const aggregateTvl = profiles.reduce((sum, p) => sum + (p.totalValueLocked.value ?? 0), 0);
  const assetClasses = new Set(profiles.map((p) => p.assetClass));

  return (
    <div className="container space-y-8 py-12">
      <nav className="flex items-center gap-1.5 text-sm text-ink-300">
        <Link href="/" className="transition-colors hover:text-ink-50">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <span className="text-ink-100">Real World Assets</span>
      </nav>

      <header className="space-y-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
          Real World Assets
        </h1>
        <p className="max-w-2xl text-sm text-ink-300">
          Tokenized off-chain assets on Arbitrum — private credit, tokenized equities, real estate,
          treasuries, and more.{" "}
          <span className="font-medium text-ink-100">{profiles.length}</span> protocols tracked.
        </p>
      </header>

      {LIVE_METRICS_PENDING && <MockDataBanner metrics="TVL and AUM" />}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tracked" value={`${profiles.length}`} hint="RWA protocols" />
        <StatCard label="Aggregate TVL" value={formatUsdCompact(aggregateTvl)} hint="Live on-chain proxy" />
        <StatCard label="Asset classes" value={`${assetClasses.size}`} hint="Distinct classes" />
        <StatCard label="In store" value={`${profiles.length}`} hint="Synced from ingest" />
      </section>

      <RwaTable profiles={profiles} emptyHint="No RWA protocols in the store yet." />
    </div>
  );
}
