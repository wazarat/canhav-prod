"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ClusterView } from "@/components/explorer/ClusterView";
import { DetailPanel } from "@/components/explorer/DetailPanel";
import { ExplorerSearch } from "@/components/explorer/ExplorerSearch";
import { GraphView } from "@/components/explorer/GraphView";
import { firstDegree, groupByCategory } from "@/lib/explorer/model";
import {
  EXPLORER_TONES,
  type ExplorerNode,
  type ExplorerViewId,
  type RelationshipExplorerProps,
} from "@/lib/explorer/types";
import { cn } from "@/lib/utils";

/**
 * The generic relationship-explorer shell (M9.2, CAN-83): view switching with
 * state preserved (one island, nothing unmounts), taxonomy-driven category
 * filtering (dims, never removes), search, a synced detail panel, deep links
 * (?view= / ?node= via history.replaceState, SSR-resolved by the consumer),
 * empty/loading states, and M2.5 focus management. Domain-agnostic on
 * purpose: consumers map their relation into nodes/edges/categories
 * (docs/credit/relationship-explorer.md).
 */

const VIEW_LABELS: Record<ExplorerViewId, string> = {
  clusters: "Groups",
  graph: "Graph",
  flow: "Flow",
};

export function RelationshipExplorer({
  centerId,
  nodes,
  edges,
  categories,
  views = ["clusters", "graph"],
  initialView,
  initialSelectedId = null,
  badgeStrips,
  searchPlaceholder,
  emptyMessage,
  ariaLabel,
  renderDetail,
  onNodeSelect,
}: RelationshipExplorerProps) {
  const [view, setView] = useState<ExplorerViewId>(initialView ?? views[0]);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [dimmedCategoryIds, setDimmedCategoryIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const selected = selectedId ? (nodeById.get(selectedId) ?? null) : null;

  const neighborhood = useMemo(() => firstDegree(nodes, edges, centerId), [nodes, edges, centerId]);
  const groups = useMemo(() => groupByCategory(neighborhood, categories), [neighborhood, categories]);
  const searchable = useMemo(() => nodes.filter((n) => n.id !== centerId), [nodes, centerId]);

  const syncUrl = (nextView: ExplorerViewId, nextSelected: string | null) => {
    const url = new URL(window.location.href);
    if (nextView === views[0]) url.searchParams.delete("view");
    else url.searchParams.set("view", nextView);
    if (nextSelected) url.searchParams.set("node", nextSelected);
    else url.searchParams.delete("node");
    window.history.replaceState(window.history.state, "", url);
  };

  const changeView = (next: ExplorerViewId) => {
    setView(next);
    syncUrl(next, selectedId);
  };

  const select = (node: ExplorerNode, trigger: HTMLElement | null) => {
    triggerRef.current = trigger;
    setSelectedId(node.id);
    syncUrl(view, node.id);
    onNodeSelect?.(node);
  };

  const clearSelection = () => {
    setSelectedId(null);
    syncUrl(view, null);
    triggerRef.current?.focus();
    triggerRef.current = null;
  };

  const toggleCategory = (id: string) => {
    setDimmedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (nodes.length === 0 || edges.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink-800/60 p-6 text-sm text-ink-300">
        {emptyMessage ?? "No relationships recorded yet."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {views.length > 1 && (
          <SegmentedControl
            ariaLabel={`${ariaLabel} view`}
            options={views.map((v) => ({ value: v, label: VIEW_LABELS[v] }))}
            value={view}
            onChange={changeView}
          />
        )}
        <ExplorerSearch
          nodes={searchable}
          query={query}
          onQueryChange={setQuery}
          onPick={select}
          placeholder={searchPlaceholder}
        />
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label={`${ariaLabel} category filter`}>
        {categories
          .filter((c) => c.renderAs !== "badges")
          .map((category) => {
            const dimmed = dimmedCategoryIds.has(category.id);
            const tone = EXPLORER_TONES[category.tone];
            return (
              <button
                key={category.id}
                type="button"
                aria-pressed={!dimmed}
                title={dimmed ? `Show ${category.label}` : `Dim ${category.label}`}
                onClick={() => toggleCategory(category.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-opacity",
                  tone.chip,
                  dimmed && "opacity-40",
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} aria-hidden />
                {category.label}
              </button>
            );
          })}
      </div>

      {badgeStrips?.map((strip) => (
        <div key={strip.heading} className="rounded-xl border border-ink-800/60 bg-ink-900/40 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-300">{strip.heading}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {strip.items.map((item) =>
              item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  title={item.title}
                  className={cn(
                    "rounded-full border border-ink-700/60 px-2 py-0.5 text-[11px] text-ink-100 hover:border-ink-500",
                    // Muted = dimmer token + fainter border, not opacity: 11px
                    // text under 75% opacity drops below the 4.5:1 AA floor.
                    item.muted && "border-ink-800/60 text-ink-300",
                  )}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  key={item.label}
                  title={item.title}
                  className={cn(
                    "rounded-full border border-ink-800/60 px-2 py-0.5 text-[11px] text-ink-300",
                    item.muted && "border-dashed",
                  )}
                >
                  {item.label}
                </span>
              ),
            )}
          </div>
        </div>
      ))}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <div hidden={view !== "clusters"}>
            <ClusterView
              groups={groups}
              dimmedCategoryIds={dimmedCategoryIds}
              query={query}
              selectedId={selectedId}
              onSelect={select}
            />
          </div>
          {view === "graph" && (
            <GraphView
              nodes={nodes}
              edges={edges}
              categories={categories}
              centerId={centerId}
              dimmedCategoryIds={dimmedCategoryIds}
              selectedId={selectedId}
              onSelect={(node) => select(node, null)}
            />
          )}
        </div>
        <DetailPanel
          node={selected}
          onClose={clearSelection}
          isMobileSheet={isMobile}
          renderDetail={renderDetail}
        />
      </div>
    </div>
  );
}
