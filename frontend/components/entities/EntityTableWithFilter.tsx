"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { EntityTable } from "@/components/entities/EntityTable";
import type { EntityProfile, MemberCoinCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATEGORY_FILTERS: { label: string; value: MemberCoinCategory | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Stablecoins", value: "Stablecoin" },
  { label: "Tokens", value: "Token" },
  { label: "RWAs", value: "RWA" },
];

interface EntityTableWithFilterProps {
  profiles: EntityProfile[];
  showStatus?: boolean;
  emptyHint?: string;
}

export function EntityTableWithFilter({
  profiles,
  showStatus = false,
  emptyHint,
}: EntityTableWithFilterProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MemberCoinCategory | "all">("all");

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
      return matchesQuery && matchesCategory;
    });
  }, [profiles, query, category]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            placeholder="Search entities or coins…"
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

      <EntityTable
        profiles={filtered}
        showStatus={showStatus}
        emptyHint={
          filtered.length === 0 && profiles.length > 0
            ? "No entities match your search."
            : emptyHint
        }
      />
    </div>
  );
}
