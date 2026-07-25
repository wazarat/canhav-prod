import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BuiltForBuilders } from "@/components/home/BuiltForBuilders";
import { ContactCta } from "@/components/home/ContactCta";
import { HeroVideo } from "@/components/home/HeroVideo";
import { SectorShowcase, type SectorShowcaseItem } from "@/components/home/SectorShowcase";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { getApprovedNetworks, networkHeadlineTvlUsd } from "@/lib/data";
import {
  filterTagsForSector,
  isNonEvmRwa,
  matchesSectorFilter,
  sectorFilterTagOptions,
} from "@/lib/networkTaxonomy";
import { formatUsdCompact } from "@/lib/utils";

export const revalidate = 300;

// The six live network sectors, in showcase order ("Other" renders as
// Governance & Underwriting).
const SHOWCASE_SECTORS = ["Credit", "Staking", "Derivatives", "RWA", "Liquidity", "Other"];

export default async function DashboardPage() {
  const networks = await getApprovedNetworks();
  // The networks table always hides non-EVM RWA entities; keep dashboard
  // counts consistent with what a click-through will show.
  const visible = networks.filter((p) => !isNonEvmRwa(p));

  const aggregateTvl = visible.reduce(
    (sum, p) => sum + (networkHeadlineTvlUsd(p) ?? 0),
    0,
  );

  const sectorMeta: SectorShowcaseItem[] = SHOWCASE_SECTORS.map((sector) => {
    const members = visible.filter((p) => matchesSectorFilter(p, sector));
    const present = new Set(members.flatMap((p) => filterTagsForSector(p, sector)));
    const vocab = sectorFilterTagOptions(sector);
    const tags = vocab ? vocab.filter((t) => present.has(t)) : [...present].sort();
    return { sector, count: members.length, tags };
  });

  const sectorsLive = sectorMeta.filter((m) => m.count > 0).length;
  const subSectorsCovered = sectorMeta.reduce((sum, m) => sum + m.tags.length, 0);

  return (
    <div>
      {/* Hero: full-bleed muted background video */}
      <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[#3c72ab]">
        <HeroVideo src="/hero-video.mp4" />

        {/* scrims: darken top (for nav edge) + left (for hero copy) + fade into page bg */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(180deg, rgba(6,14,26,0.80) 0%, rgba(6,14,26,0.32) 20%, rgba(6,14,26,0) 40%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(90deg, rgba(6,14,26,0.74) 0%, rgba(6,14,26,0.42) 34%, rgba(6,14,26,0) 62%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 right-0 z-[1] h-44"
          style={{
            background: "linear-gradient(180deg, rgba(5,6,10,0) 0%, #05060A 100%)",
          }}
        />

        <div className="container relative z-[2] flex min-h-[calc(100vh-4rem)] items-center py-16">
          <div className="max-w-2xl space-y-7 animate-fade-in-up">
            <h1
              className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink-50 md:text-6xl"
              style={{ textShadow: "0 2px 20px rgba(4,10,20,0.35)" }}
            >
              Where DeFi research gets{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(120deg,#7cb0ff 0%,#b79bff 50%,#4fe3f5 100%)",
                }}
              >
                real context
              </span>
              , beyond on-chain data.
            </h1>
            <p
              className="max-w-xl text-lg leading-relaxed text-ink-50/90 md:text-xl"
              style={{ textShadow: "0 1px 12px rgba(4,10,20,0.4)" }}
            >
              Track what is happening on-chain, understand what is happening off-chain, and
              connect the dots across protocols, narratives, and external terminals from one
              place.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button asChild>
                <Link href="/networks">
                  Explore networks
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <ContactCta variant="secondary" sourcePage="home-hero" />
            </div>
          </div>
        </div>
      </section>

      <div className="container space-y-16 py-14 md:py-20">
        {/* Summary stats */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Networks tracked"
            value={`${visible.length}`}
            hint="In the live store"
          />
          <StatCard
            label="Sectors live"
            value={`${sectorsLive} / ${SHOWCASE_SECTORS.length}`}
            hint="Credit → Governance & Underwriting"
          />
          <StatCard
            label="Aggregate network TVL"
            value={formatUsdCompact(aggregateTvl)}
            hint="Across tracked networks"
          />
          <StatCard
            label="Sub-sectors covered"
            value={`${subSectorsCovered}`}
            hint="Filterable taxonomy tags"
          />
        </section>

        {/* Sector taxonomy showcase */}
        <SectorShowcase items={sectorMeta} />

        <BuiltForBuilders />
      </div>
    </div>
  );
}
