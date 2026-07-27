"use client";

import dynamic from "next/dynamic";

import type { ExplorerCategory, ExplorerEdge, ExplorerNode } from "@/lib/explorer/types";

/**
 * Lazy wrapper: react-force-graph-2d (canvas engine) lives in GraphCanvas and
 * only downloads when the graph view is actually opened. next/dynamic sits in
 * a CLIENT component on purpose — in a server component it does not
 * code-split client chunks (the M4 LazyCharts lesson).
 */
const GraphCanvas = dynamic(() => import("./GraphCanvas").then((m) => m.GraphCanvas), {
  ssr: false,
  loading: () => (
    <div className="flex h-[520px] items-center justify-center rounded-xl border border-ink-800/60 bg-ink-950/60">
      <p className="text-xs text-ink-300">Loading graph…</p>
    </div>
  ),
});

export function GraphView(props: {
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  categories: ExplorerCategory[];
  centerId: string;
  dimmedCategoryIds: ReadonlySet<string>;
  selectedId: string | null;
  onSelect: (node: ExplorerNode) => void;
}) {
  return (
    <div>
      <GraphCanvas {...props} />
      <p className="mt-2 text-[11px] text-ink-300">
        The graph is a visual supplement: every node here is also in the cluster list, and the search box selects
        nodes without a pointer. Node size reflects evidenced significance; colours are relationship categories.
      </p>
    </div>
  );
}
