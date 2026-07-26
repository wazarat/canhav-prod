"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { NetworkTable } from "@/components/networks/NetworkTable";
import type { NetworkProfile, MemberCoinCategory } from "@/lib/types";
import {
  filterTagsForSector,
  isNonEvmRwa,
  matchesSectorFilter,
  sectorFilterTagOptions,
  tagsForSector,
} from "@/lib/networkTaxonomy";
import { cn } from "@/lib/utils";

// Canonical chip order: the six tag-metrics sectors first, then the remaining
// primary sectors. Perpetuals (merged into Derivatives) and Yield are
// deprecated secondary-only sectors and never get their own chip.
const SECTOR_CHIP_ORDER = [
  "Credit",
  "Staking",
  "Liquidity",
  "Derivatives",
  "RWA",
  "Other",
  "DEX",
  "Stablecoin",
];
const DEPRECATED_SECTOR_CHIPS = new Set(["Perpetuals", "Yield"]);

const CATEGORY_FILTERS: { label: string; value: MemberCoinCategory | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Stablecoins", value: "Stablecoin" },
  { label: "Tokens", value: "Token" },
  { label: "Receipts", value: "Receipt" },
  { label: "RWAs", value: "RWA" },
];

/** Server-fetched per-slug series for the Credit rows (CAN-47). */
export interface CreditRowSeries {
  values: number[];
  wowPct: number | null;
}

interface NetworkTableWithFilterProps {
  profiles: NetworkProfile[];
  showStatus?: boolean;
  emptyHint?: string;
  /** Preselect a sector (e.g. from a `/networks?sector=Credit` deep link). */
  initialSector?: string;
  /** slug -> 8d TVL series; enables the Credit column set when that sector is active. */
  creditSparklines?: Record<string, CreditRowSeries>;
}

export function NetworkTableWithFilter({
  profiles,
  showStatus = false,
  emptyHint,
  initialSector,
  creditSparklines,
}: NetworkTableWithFilterProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MemberCoinCategory | "all">("all");
  const [sector, setSector] = useState<string | "all">(initialSector ?? "all");
  const [tagFilter, setTagFilter] = useState<string | "all">("all");

  // Sectors present in the data (e.g. "Credit"), for the taxonomy filter row.
  // Includes secondary (cross-tagged) sectors so multi-sector entities surface
  // under every sector they belong to.
  const sectors = useMemo(() => {
    const set = new Set<string>();
    for (const p of profiles) {
      if (p.sector) set.add(p.sector);
      for (const s of p.secondarySectors ?? []) set.add(s);
    }
    for (const s of DEPRECATED_SECTOR_CHIPS) set.delete(s);
    return [...set].sort((a, b) => {
      const ia = SECTOR_CHIP_ORDER.indexOf(a);
      const ib = SECTOR_CHIP_ORDER.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return a.localeCompare(b);
    });
  }, [profiles]);

  // Sub-sector / tags for the selected sector. Credit, Staking, and RWA use fixed
  // vocabularies; DEX/Stablecoin derive from profile data.
  const sectorTags = useMemo(() => {
    if (sector === "all") return [];
    const fixed = sectorFilterTagOptions(sector);
    if (fixed) return fixed;
    const set = new Set<string>();
    for (const p of profiles) {
      if (!matchesSectorFilter(p, sector)) continue;
      for (const t of tagsForSector(p, sector)) set.add(t);
    }
    return [...set].sort();
  }, [profiles, sector]);

  // Structural EVM-compatibility flag (replaces the dropped "Non-EVM" tag).
  function matchesNonEvmRwa(p: NetworkProfile): boolean {
    return isNonEvmRwa(p);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles.filter((p) => {
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.memberCoins.some(
          (c) =>
            c.symbol.toLowerCase().includes(q) ||
            c.name.toLowerCase().includes(q),
        );
      const matchesCategory =
        category === "all" || p.memberCoins.some((c) => c.category === category);
      const matchesSector = sector === "all" || matchesSectorFilter(p, sector);
      const matchesTag =
        tagFilter === "all" ||
        (sector !== "all" && filterTagsForSector(p, sector).includes(tagFilter));
      // Non-EVM RWA entities (e.g. Lofty on Algorand) are always hidden from
      // the list; their profiles stay reachable by direct URL.
      const matchesEvm = !matchesNonEvmRwa(p);
      return matchesQuery && matchesCategory && matchesSector && matchesTag && matchesEvm;
    });
  }, [profiles, query, category, sector, tagFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            placeholder="Search networks or coins…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="glass w-full rounded-xl border border-ink-700/60 bg-transparent py-2 pl-9 pr-3 text-sm text-ink-100 placeholder:text-ink-500 focus:border-electric-500/50 focus:outline-none focus:ring-1 focus:ring-electric-500/30"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setCategory(f.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                category === f.value
                  ? "border-electric-500/50 bg-electric-500/10 text-electric-300"
                  : "border-ink-700/60 bg-ink-900/40 text-ink-300 hover:border-ink-600 hover:text-ink-100",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {sectors.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-500">
              Sector
            </span>
            <button
              type="button"
              onClick={() => {
                setSector("all");
                setTagFilter("all");
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                sector === "all"
                  ? "border-electric-500/50 bg-electric-500/10 text-electric-300"
                  : "border-ink-700/60 bg-ink-900/40 text-ink-300 hover:border-ink-600 hover:text-ink-100",
              )}
            >
              All
            </button>
            {sectors.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSector(s);
                  setTagFilter("all");
                }}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  sector === s
                    ? "border-electric-500/50 bg-electric-500/10 text-electric-300"
                    : "border-ink-700/60 bg-ink-900/40 text-ink-300 hover:border-ink-600 hover:text-ink-100",
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {sectorTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pl-1">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-500">
                Tag
              </span>
              <button
                type="button"
                onClick={() => setTagFilter("all")}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  tagFilter === "all"
                    ? "border-signal-400/50 bg-signal-400/10 text-signal-400"
                    : "border-ink-700/60 bg-ink-900/40 text-ink-300 hover:border-ink-600 hover:text-ink-100",
                )}
              >
                All
              </button>
              {sectorTags.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTagFilter(s)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    tagFilter === s
                      ? "border-signal-400/50 bg-signal-400/10 text-signal-400"
                      : "border-ink-700/60 bg-ink-900/40 text-ink-300 hover:border-ink-600 hover:text-ink-100",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <NetworkTable
        profiles={filtered}
        showStatus={showStatus}
        coinCategoryFilter={category}
        creditColumns={sector === "Credit"}
        creditSparklines={creditSparklines}
        emptyHint={
          filtered.length === 0 && profiles.length > 0
            ? "No networks match your search."
            : emptyHint
        }
      />
    </div>
  );
}
