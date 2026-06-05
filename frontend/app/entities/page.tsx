import { EntityTableWithFilter } from "@/components/entities/EntityTableWithFilter";
import { PageHeader } from "@/components/ui/PageHeader";
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
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Entities" },
        ]}
        title="Entities"
        description={
          <>
            Umbrella protocols grouping stablecoins, RWAs, and tokens under one issuer.{" "}
            <span className="font-medium text-ink-100">{profiles.length}</span> entities
            tracked.
          </>
        }
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Aggregate TVL"
          value={formatUsdCompact(aggregateTvl)}
          hint="Across entities"
          source="Store"
        />
        <StatCard
          label="Tracked"
          value={`${profiles.length}`}
          hint="Entities in store"
          source="Store"
        />
        <StatCard
          label="Grouped coins"
          value={`${totalCoins}`}
          hint="Stablecoins + tokens + RWAs"
        />
        <StatCard
          label="Avg coins"
          value={profiles.length ? String(Math.round(totalCoins / profiles.length)) : "—"}
          hint="Per entity"
        />
      </section>

      <EntityTableWithFilter profiles={profiles} emptyHint="No entities in the store yet." />
    </div>
  );
}
