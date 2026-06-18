import Link from "next/link";

import { ResearchChatScope } from "@/components/agent/research-chat-context";
import { NetworkTableWithFilter } from "@/components/networks/NetworkTableWithFilter";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { getApprovedNetworks } from "@/lib/data";
import { formatUsdCompact } from "@/lib/utils";

export const metadata = {
  title: "Networks",
};

export const revalidate = 300;

export default async function NetworksPage() {
  const profiles = await getApprovedNetworks();
  const aggregateTvl = profiles.reduce((sum, p) => sum + (p.currentScale.tvlUsd ?? 0), 0);
  const totalCoins = profiles.reduce((sum, p) => sum + p.memberCoins.length, 0);
  const totalFees24h = profiles.reduce(
    (sum, p) => sum + (p.protocolFeesRevenue?.fees24hUsd ?? 0),
    0,
  );

  // Top networks by TVL for the overview bar list (real, store-seeded TVL).
  const ranked = [...profiles]
    .filter((p) => (p.currentScale.tvlUsd ?? 0) > 0)
    .sort((a, b) => (b.currentScale.tvlUsd ?? 0) - (a.currentScale.tvlUsd ?? 0))
    .slice(0, 8);

  return (
    <div className="container space-y-8 py-12">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Networks" },
        ]}
        title="Networks"
        description={
          <>
            Umbrella protocols grouping stablecoins, RWAs, and tokens under one issuer.{" "}
            <span className="font-medium text-ink-100">{profiles.length}</span> networks
            tracked.
          </>
        }
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Aggregate TVL"
          value={formatUsdCompact(aggregateTvl)}
          hint="Across networks"
          source="Store"
        />
        <StatCard
          label="Fees paid (24h)"
          value={totalFees24h > 0 ? formatUsdCompact(totalFees24h) : "—"}
          hint="Mapped DeFi Llama protocols"
          source="DeFi Llama"
        />
        <StatCard
          label="Networks tracked"
          value={`${profiles.length}`}
          hint="In the live store"
          source="Store"
        />
        <StatCard
          label="Grouped coins"
          value={`${totalCoins}`}
          hint="Stablecoins + tokens + RWAs"
        />
      </section>

      {ranked.length > 0 && (
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold tracking-tight text-ink-50">
              Top networks by TVL
            </h2>
            <span className="text-xs text-ink-500">Store-seeded / derived</span>
          </div>
          <div className="space-y-2.5">
            {ranked.map((p) => {
              const tvl = p.currentScale.tvlUsd ?? 0;
              return (
                <Link
                  key={p.slug}
                  href={`/networks/${p.slug}`}
                  className="group flex items-center justify-between gap-3 rounded-lg py-1 text-sm"
                >
                  <span className="font-medium text-ink-200 transition-colors group-hover:text-electric-400">
                    {p.name}
                  </span>
                  <span className="font-mono text-ink-100">{formatUsdCompact(tvl)}</span>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      <NetworkTableWithFilter profiles={profiles} emptyHint="No networks in the store yet." />

      <ResearchChatScope />
    </div>
  );
}
