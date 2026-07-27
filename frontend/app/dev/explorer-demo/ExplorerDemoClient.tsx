"use client";

import { useMemo, useState } from "react";

import { RelationshipExplorer } from "@/components/explorer/RelationshipExplorer";
import type { ExplorerNode } from "@/lib/explorer/types";
import { buildCompetitorExplorerProps } from "@/lib/networks/competitorExplorerAdapter";

export function ExplorerDemoClient() {
  const props = useMemo(() => buildCompetitorExplorerProps("aave"), []);
  const [log, setLog] = useState<string[]>([]);

  return (
    <div className="space-y-4">
      <RelationshipExplorer
        {...props}
        views={["clusters", "graph"]}
        ariaLabel="Competitor explorer demo"
        searchPlaceholder="Search competitors"
        onNodeSelect={(node) => setLog((prev) => [node.id, ...prev].slice(0, 5))}
        renderDetail={(node: ExplorerNode) => (
          <div className="space-y-2 text-xs text-ink-100">
            <p className="font-mono text-[11px] text-signal-400">custom renderDetail()</p>
            <p>
              {node.label} — {node.summary}
            </p>
            {node.href && (
              <a href={node.href} className="text-electric-300 underline">
                Open profile
              </a>
            )}
          </div>
        )}
      />
      <div className="rounded-xl border border-ink-800/60 p-3 text-xs text-ink-300">
        onNodeSelect log: {log.length > 0 ? log.join(" ← ") : "(nothing selected yet)"}
      </div>
    </div>
  );
}
