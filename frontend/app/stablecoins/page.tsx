import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { MockDataBanner } from "@/components/MockDataBanner";
import { FloatingResearchChat } from "@/components/agent/FloatingResearchChat";
import { StablecoinTable } from "@/components/stablecoins/StablecoinTable";
import { StatCard } from "@/components/ui/StatCard";
import { agentConfigStatus } from "@/lib/agent/config";
import { getApprovedStablecoins, LIVE_METRICS_PENDING, pegDeviationBps } from "@/lib/data";
import { formatUsdCompact } from "@/lib/utils";

export const metadata = {
  title: "Stablecoins",
};

export const revalidate = 300;

export default async function StablecoinsPage() {
  const profiles = await getApprovedStablecoins();

  const aggregateSupply = profiles.reduce((sum, p) => sum + (p.totalSupply.value ?? 0), 0);
  const deviations = profiles
    .map((p) => pegDeviationBps(p))
    .filter((d): d is number => d !== null);
  const avgDeviation =
    deviations.length > 0
      ? Math.round(deviations.reduce((a, b) => a + b, 0) / deviations.length)
      : null;
  const usdCount = profiles.filter((p) => p.pegTarget === "USD").length;
  const eurCount = profiles.filter((p) => p.pegTarget === "EUR").length;

  return (
    <div className="container space-y-8 py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-ink-300">
        <Link href="/" className="transition-colors hover:text-ink-50">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <span className="text-ink-100">Stablecoins</span>
      </nav>

      <header className="space-y-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
          Stablecoins
        </h1>
        <p className="max-w-2xl text-sm text-ink-300">
          Pegged dollar and euro assets on Arbitrum — peg health, circulating supply, and protocol
          metadata. <span className="font-medium text-ink-100">{profiles.length}</span> protocols
          tracked.
        </p>
      </header>

      {LIVE_METRICS_PENDING && <MockDataBanner />}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tracked" value={`${profiles.length}`} hint={`${usdCount} USD · ${eurCount} EUR`} />
        <StatCard label="Aggregate supply" value={formatUsdCompact(aggregateSupply)} hint="Live via Alchemy" />
        <StatCard label="Avg peg deviation" value={avgDeviation === null ? "—" : `${avgDeviation} bps`} />
        <StatCard label="Peg targets" value={`${usdCount + eurCount > 0 ? "USD / EUR" : "—"}`} hint="Multi-currency" />
      </section>

      <StablecoinTable profiles={profiles} emptyHint="No stablecoins in the store yet." />

      <FloatingResearchChat llmConfigured={agentConfigStatus().llm} />
    </div>
  );
}
