"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  Coins,
  Gem,
  Landmark,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

/** Lightweight, client-safe projection of a skill for the picker. */
export interface SkillPickerOption {
  id: string;
  title: string;
  summary?: string;
  /** "user" = a skill the signed-in user authored ("My Skills"). */
  group: "user" | "entity" | "stablecoin" | "rwa" | "token";
}

const GROUP_META: {
  id: SkillPickerOption["group"];
  label: string;
  icon: typeof Coins;
  hint: string;
}[] = [
  { id: "user", label: "My Skills", icon: Sparkles, hint: "Skills you created" },
  { id: "entity", label: "Entities", icon: Building2, hint: "Umbrella protocols" },
  { id: "stablecoin", label: "Stablecoins", icon: Coins, hint: "Pegged assets" },
  { id: "rwa", label: "RWAs", icon: Landmark, hint: "Real-world assets" },
  { id: "token", label: "Tokens", icon: Gem, hint: "Governance & utility" },
];

/** Strip the boilerplate suffix so chips and rows stay compact. */
function shortTitle(title: string): string {
  return title.replace(/\s+—\s+(Research|Stablecoin|RWA|Token) Skill$/, "");
}

/**
 * Grouped, searchable multi-select for platform skills. Replaces the flat
 * dropdowns so users browsing dozens of skills see four tidy, collapsible
 * catalog groups instead of one long list.
 */
export function SkillPicker({
  options,
  selected,
  onToggle,
  lockedIds = [],
  suggested,
  disabled = false,
  maxHeightClass = "max-h-72",
}: {
  options: SkillPickerOption[];
  selected: string[];
  onToggle: (id: string) => void;
  /** Always-selected ids the user can't remove (e.g. the entity's own skill). */
  lockedIds?: string[];
  /** Auto-suggested ids mapped to the reason ("dependency", "related", ...). */
  suggested?: Record<string, string>;
  disabled?: boolean;
  maxHeightClass?: string;
}) {
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(["user", "entity"]));

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const lockedSet = useMemo(() => new Set(lockedIds), [lockedIds]);
  const optionById = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalizedQuery) return options;
    return options.filter(
      (o) =>
        o.title.toLowerCase().includes(normalizedQuery) ||
        (o.summary ?? "").toLowerCase().includes(normalizedQuery),
    );
  }, [options, normalizedQuery]);

  const grouped = useMemo(() => {
    const map = new Map<SkillPickerOption["group"], SkillPickerOption[]>();
    for (const meta of GROUP_META) map.set(meta.id, []);
    for (const option of filtered) map.get(option.group)?.push(option);
    return map;
  }, [filtered]);

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedChips = selected
    .map((id) => optionById.get(id))
    .filter((o): o is SkillPickerOption => Boolean(o));

  return (
    <div className="space-y-3">
      {selectedChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedChips.map((option) => {
            const locked = lockedSet.has(option.id);
            return (
              <span
                key={option.id}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
                  locked
                    ? "border-neon-500/40 bg-neon-500/10 text-neon-400"
                    : "border-electric-500/40 bg-electric-500/10 text-electric-300",
                )}
              >
                {shortTitle(option.title)}
                {locked ? (
                  <span className="font-mono text-[9px] uppercase tracking-wider opacity-70">
                    core
                  </span>
                ) : (
                  <>
                    {suggested?.[option.id] && (
                      <span className="font-mono text-[9px] uppercase tracking-wider opacity-70">
                        suggested
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onToggle(option.id)}
                      disabled={disabled}
                      aria-label={`Remove ${shortTitle(option.title)}`}
                      className="rounded-full p-0.5 transition-colors hover:bg-electric-500/20 disabled:opacity-50"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                )}
              </span>
            );
          })}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search skills…"
          disabled={disabled}
          className="w-full rounded-lg border border-ink-700 bg-ink-900/60 py-2 pl-9 pr-3 text-sm text-ink-100 placeholder:text-ink-500 outline-none focus:border-electric-500/60 disabled:opacity-50"
        />
      </div>

      <div
        className={cn(
          "space-y-1.5 overflow-y-auto rounded-xl border border-ink-800/60 bg-ink-950/40 p-1.5",
          maxHeightClass,
        )}
      >
        {GROUP_META.map((meta) => {
          const groupOptions = grouped.get(meta.id) ?? [];
          if (groupOptions.length === 0 && normalizedQuery) return null;
          // Searching auto-expands every group that still has matches.
          const isOpen = normalizedQuery ? true : openGroups.has(meta.id);
          const Icon = meta.icon;
          const selectedInGroup = groupOptions.filter((o) => selectedSet.has(o.id)).length;
          return (
            <div key={meta.id} className="rounded-lg border border-ink-800/40 bg-ink-900/30">
              <button
                type="button"
                onClick={() => toggleGroup(meta.id)}
                disabled={disabled}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-ink-900/60 disabled:opacity-50"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-200">
                  {meta.label}
                </span>
                <span className="text-[10px] text-ink-500">{meta.hint}</span>
                <span className="ml-auto flex items-center gap-2">
                  {selectedInGroup > 0 && (
                    <span className="rounded-full bg-electric-500/15 px-1.5 py-0.5 font-mono text-[10px] text-electric-300">
                      {selectedInGroup} selected
                    </span>
                  )}
                  <span className="font-mono text-[10px] text-ink-500">{groupOptions.length}</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-ink-500 transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </span>
              </button>
              {isOpen && (
                <div className="space-y-0.5 px-1.5 pb-1.5">
                  {groupOptions.length === 0 ? (
                    <p className="px-2 py-1.5 text-xs text-ink-500">
                      No {meta.label.toLowerCase()} skills available.
                    </p>
                  ) : (
                    groupOptions.map((option) => {
                      const isSelected = selectedSet.has(option.id);
                      const locked = lockedSet.has(option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => !locked && onToggle(option.id)}
                          disabled={disabled || locked}
                          className={cn(
                            "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                            isSelected
                              ? "bg-electric-500/10"
                              : "hover:bg-ink-900/60",
                            locked ? "cursor-default opacity-90" : "disabled:opacity-50",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                              isSelected
                                ? "border-electric-500/60 bg-electric-500/20 text-electric-300"
                                : "border-ink-600 bg-ink-900/60 text-transparent",
                            )}
                          >
                            <Check className="h-3 w-3" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="min-w-0 truncate text-sm text-ink-100">
                                {shortTitle(option.title)}
                              </span>
                              {suggested?.[option.id] && (
                                <span className="shrink-0 rounded-full border border-neon-500/30 bg-neon-500/10 px-1.5 text-[10px] text-neon-300">
                                  Suggested · {suggested[option.id]}
                                </span>
                              )}
                            </span>
                            {option.summary && (
                              <span className="mt-0.5 block truncate text-[11px] text-ink-500">
                                {option.summary}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-2 py-3 text-center text-xs text-ink-500">
            No skills match &ldquo;{query}&rdquo;.
          </p>
        )}
      </div>
    </div>
  );
}
