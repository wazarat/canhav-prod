"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { NetworkTable } from "@/components/networks/NetworkTable";
import type { NetworkProfile, MemberCoinCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATEGORY_FILTERS: { label: string; value: MemberCoinCategory | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Stablecoins", value: "Stablecoin" },
  { label: "Tokens", value: "Token" },
  { label: "RWAs", value: "RWA" },
];

interface NetworkTableWithFilterProps {
  profiles: NetworkProfile[];
  showStatus?: boolean;
  emptyHint?: string;
}

export function NetworkTableWithFilter({
  profiles,
  showStatus = false,
  emptyHint,
}: NetworkTableWithFilterProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MemberCoinCategory | "all">("all");
  const [sector, setSector] = useState<string | "all">("all");
  const [subSector, setSubSector] = useState<string | "all">("all");

  // Sectors present in the data (e.g. "Lending"), for the taxonomy filter row.
  const sectors = useMemo(() => {
    const set = new Set<string>();
    for (const p of profiles) if (p.sector) set.add(p.sector);
    return [...set].sort();
  }, [profiles]);

  // Sub-sectors available for the selected sector (e.g. lending sub-sectors).
  const subSectors = useMemo(() => {
    if (sector === "all") return [];
    const set = new Set<string>();
    for (const p of profiles) {
      if (p.sector === sector && p.subSector) set.add(p.subSector);
    }
    return [...set].sort();
  }, [profiles, sector]);

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
      const matchesSector = sector === "all" || p.sector === sector;
      const matchesSubSector = subSector === "all" || p.subSector === subSector;
      return matchesQuery && matchesCategory && matchesSector && matchesSubSector;
    });
  }, [profiles, query, category, sector, subSector]);

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
                setSubSector("all");
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
                  setSubSector("all");
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

          {subSectors.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pl-1">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-500">
                Type
              </span>
              <button
                type="button"
                onClick={() => setSubSector("all")}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  subSector === "all"
                    ? "border-signal-400/50 bg-signal-400/10 text-signal-400"
                    : "border-ink-700/60 bg-ink-900/40 text-ink-300 hover:border-ink-600 hover:text-ink-100",
                )}
              >
                All
              </button>
              {subSectors.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSubSector(s)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    subSector === s
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
        emptyHint={
          filtered.length === 0 && profiles.length > 0
            ? "No networks match your search."
            : emptyHint
        }
      />
    </div>
  );
}
