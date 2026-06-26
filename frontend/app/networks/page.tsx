import { ResearchChatScope } from "@/components/agent/research-chat-context";
import { NetworkTableWithFilter } from "@/components/networks/NetworkTableWithFilter";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { getApprovedNetworks, networkHeadlineTvlUsd } from "@/lib/data";
import { formatUsdCompact } from "@/lib/utils";

export const metadata = {
  title: "Networks",
};

export const revalidate = 300;

export default async function NetworksPage() {
  const profiles = await getApprovedNetworks();
  const aggregateTvl = profiles.reduce(
    (sum, p) => sum + (networkHeadlineTvlUsd(p) ?? 0),
    0,
  );
  const totalCoins = profiles.reduce((sum, p) => sum + p.memberCoins.length, 0);
  const totalFees24h = profiles.reduce(
    (sum, p) => sum + (p.protocolFeesRevenue?.fees24hUsd ?? 0),
    0,
  );

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

      <NetworkTableWithFilter profiles={profiles} emptyHint="No networks in the store yet." />

      <ResearchChatScope />
    </div>
  );
}
