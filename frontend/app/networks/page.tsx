import { ResearchChatScope } from "@/components/agent/research-chat-context";
import {
  NetworkTableWithFilter,
  type CreditRowSeries,
} from "@/components/networks/NetworkTableWithFilter";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { getApprovedNetworks, networkHeadlineTvlUsd } from "@/lib/data";
import { matchesSectorFilter } from "@/lib/networkTaxonomy";
import { resolveNetworkTvlSeries } from "@/lib/server/series";
import { formatUsdCompact } from "@/lib/utils";

export const metadata = {
  title: "Networks",
};

export const revalidate = 300;

// Sectors the homepage showcase (and anyone else) may deep-link to.
const LINKABLE_SECTORS = [
  "Credit",
  "Staking",
  "Derivatives",
  "RWA",
  "Liquidity",
  "Other",
  "DEX",
  "Stablecoin",
];

export default async function NetworksPage({
  searchParams,
}: {
  searchParams?: { sector?: string };
}) {
  const sectorParam = searchParams?.sector;
  const initialSector =
    sectorParam && LINKABLE_SECTORS.includes(sectorParam) ? sectorParam : undefined;
  const profiles = await getApprovedNetworks();

  // CAN-47 (M1.4, landed with M4.1): 8-day TVL series for the Credit rows'
  // Token Terminal style sparkline + week-over-week direction. Fetched here
  // (server) so the client table stays data-free; each series is Next-cached.
  const creditProfiles = profiles.filter((p) => matchesSectorFilter(p, "Credit"));
  const sparkEntries = await Promise.all(
    creditProfiles.map(async (p) => {
      const series = await resolveNetworkTvlSeries(p.slug, 8).catch(() => null);
      const points = series?.points ?? [];
      if (points.length < 2) return null;
      const values = points.map((pt) => pt.value);
      const first = values[0];
      const wowPct = first !== 0 ? ((values[values.length - 1] - first) / first) * 100 : null;
      return [p.slug, { values, wowPct }] as const;
    }),
  );
  const creditSparklines: Record<string, CreditRowSeries> = Object.fromEntries(
    sparkEntries.filter((e): e is NonNullable<typeof e> => e != null),
  );

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
        key={initialSector ?? "all"}
        profiles={profiles}
        initialSector={initialSector}
        creditSparklines={creditSparklines}
        emptyHint="No networks in the store yet."
      />

      <ResearchChatScope />
    </div>
  );
}
