"use client";

import Image from "next/image";
import { useState } from "react";

import { EXPLORER_TONES, type ExplorerCategory, type ExplorerNode } from "@/lib/explorer/types";
import { matchesSearch } from "@/lib/explorer/model";
import { cn } from "@/lib/utils";

/**
 * View 1 (CAN-86, default + guaranteed-good fallback): categorised card
 * clusters — one collapsible group per category with a count, cards inside.
 * Card/DataPanel house styling (RailCard is the Trade-desk toggle card — the
 * thrice-recorded PLAN-CHANGES correction). Fully keyboard accessible; this
 * view is the accessible equivalent of the canvas graph.
 */

function StatusChip({ chip }: { chip: NonNullable<ExplorerNode["statusChip"]> }) {
  return (
    <span
      className={cn(
        "rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none",
        chip.tone === "positive" && "border-emerald-500/40 text-emerald-300",
        chip.tone === "warning" && "border-amber-500/40 text-amber-300",
        chip.tone === "neutral" && "border-ink-500/60 text-ink-300",
      )}
    >
      {chip.label}
    </span>
  );
}

function NodeAvatar({ node }: { node: ExplorerNode }) {
  if (node.iconUrl) {
    return (
      <Image
        src={node.iconUrl}
        alt=""
        width={28}
        height={28}
        unoptimized
        className="h-7 w-7 shrink-0 rounded-full border border-ink-700/60 bg-ink-900 object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink-700/60 bg-ink-850 font-mono text-xs text-ink-300"
    >
      {node.label.charAt(0).toUpperCase()}
    </span>
  );
}

export function ClusterView({
  groups,
  dimmedCategoryIds,
  query,
  selectedId,
  onSelect,
}: {
  groups: { category: ExplorerCategory; nodes: ExplorerNode[] }[];
  dimmedCategoryIds: ReadonlySet<string>;
  query: string;
  selectedId: string | null;
  onSelect: (node: ExplorerNode, trigger: HTMLElement | null) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {groups.map(({ category, nodes }) => {
        const visible = nodes.filter((n) => matchesSearch(n, query));
        const isCollapsed = collapsed.has(category.id) || dimmedCategoryIds.has(category.id);
        const tone = EXPLORER_TONES[category.tone];
        if (nodes.length === 0) {
          return (
            <div
              key={category.id}
              className="rounded-xl border border-dashed border-ink-800/60 px-4 py-3 text-xs text-ink-300"
            >
              <span className={cn("mr-2 inline-block h-2 w-2 rounded-full align-middle", tone.dot)} aria-hidden />
              {category.label}: no evidenced relationships. A genuine gap, not an omission.
            </div>
          );
        }
        return (
          <section
            key={category.id}
            className={cn(
              "rounded-xl border border-ink-800/60 bg-ink-900/40",
              dimmedCategoryIds.has(category.id) && "opacity-50",
            )}
          >
            <button
              type="button"
              aria-expanded={!isCollapsed}
              onClick={() => toggle(category.id)}
              className="flex w-full items-center gap-2 px-4 py-3 text-left"
            >
              <span className={cn("h-2 w-2 rounded-full", tone.dot)} aria-hidden />
              <span className="text-sm font-medium text-ink-100">{category.label}</span>
              <span className="rounded-full bg-ink-800/70 px-1.5 py-0.5 font-mono text-[10px] leading-none text-ink-300">
                {query ? `${visible.length}/${nodes.length}` : nodes.length}
              </span>
              <span className="ml-auto text-xs text-ink-300" aria-hidden>
                {isCollapsed ? "+" : "−"}
              </span>
            </button>
            {!isCollapsed && (
              <ul className="grid grid-cols-1 gap-2 px-3 pb-3 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((node) => (
                  <li key={node.id}>
                    <button
                      type="button"
                      onClick={(e) => onSelect(node, e.currentTarget)}
                      aria-pressed={selectedId === node.id}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-lg border border-ink-800/60 bg-ink-950/50 px-3 py-2.5 text-left transition-colors hover:border-ink-700",
                        selectedId === node.id && "border-electric-500/60 ring-1 ring-electric-500/40",
                      )}
                    >
                      <NodeAvatar node={node} />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-medium text-ink-100">{node.label}</span>
                          {node.statusChip && <StatusChip chip={node.statusChip} />}
                          {node.badges?.map((b) => (
                            <span
                              key={b}
                              className="rounded-full border border-neon-500/40 px-1.5 py-0.5 text-[10px] leading-none text-neon-400"
                            >
                              {b}
                            </span>
                          ))}
                        </span>
                        {node.summary && (
                          <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-ink-300">
                            {node.summary}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
                {visible.length === 0 && (
                  <li className="col-span-full px-1 py-2 text-xs text-ink-300">
                    No matches for “{query}” in {category.label}.
                  </li>
                )}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
