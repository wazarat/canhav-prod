import { ResearchChatScope } from "@/components/agent/research-chat-context";
import { NetworkTableWithFilter } from "@/components/networks/NetworkTableWithFilter";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { getApprovedNetworks, networkHeadlineTvlUsd } from "@/lib/data";
import { getSectorAggregates } from "@/lib/server/store";
import { formatUsdCompact } from "@/lib/utils";

export const metadata = {
  title: "Networks",
};

export const revalidate = 300;

export default async function NetworksPage() {
  const [profiles, sectorAggregates] = await Promise.all([
    getApprovedNetworks(),
    getSectorAggregates(),
  ]);
  const aggregateTvl = profiles.reduce(
    (sum, p) => sum + (networkHeadlineTvlUsd(p) ?? 0),
    0,
  );
  const totalCoins = profiles.reduce((sum, p) => sum + p.memberCoins.length, 0);

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

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Aggregate TVL"
          value={formatUsdCompact(aggregateTvl)}
          hint="Across networks"
        />
        <StatCard
          label="Networks tracked"
          value={`${profiles.length}`}
          hint="In the live store"
        />
        <StatCard
          label="Grouped coins"
          value={`${totalCoins}`}
          hint="Stablecoins + tokens + RWAs"
        />
      </section>

      <NetworkTableWithFilter
        profiles={profiles}
        sectorAggregates={sectorAggregates}
        emptyHint="No networks in the store yet."
      />

      <ResearchChatScope />
    </div>
  );
}
