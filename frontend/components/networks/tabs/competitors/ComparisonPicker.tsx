"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { CompareColumn } from "@/lib/networks/competitorsTab";
import { cn, formatUsdCompact } from "@/lib/utils";

const MAX_PEERS = 3;

/**
 * CAN-87 capped comparison picker (G2 style): select up to three same-tag
 * peers and render a feature + metric matrix. Hard cap of three keeps the
 * matrix legible; the cap state is announced, not silent. Selection mirrors
 * to ?peers= via history.replaceState (deep-linkable, SSR pre-selects).
 * The matrix scrolls inside its own container — the page never scrolls
 * horizontally at 375px.
 */
export function ComparisonPicker({
  self,
  candidates,
  columns,
  initialPeers,
}: {
  self: CompareColumn;
  candidates: { slug: string; name: string }[];
  columns: Record<string, CompareColumn>;
  initialPeers: string[];
}) {
  const [selected, setSelected] = useState<string[]>(initialPeers);

  const sync = (next: string[]) => {
    setSelected(next);
    const url = new URL(window.location.href);
    if (next.length) url.searchParams.set("peers", next.join(","));
    else url.searchParams.delete("peers");
    window.history.replaceState(window.history.state, "", url);
  };

  const toggle = (slug: string) => {
    if (selected.includes(slug)) return sync(selected.filter((s) => s !== slug));
    if (selected.length >= MAX_PEERS) return;
    sync([...selected, slug]);
  };

  const atCap = selected.length >= MAX_PEERS;
  const shown: CompareColumn[] = [self, ...selected.map((s) => columns[s]).filter(Boolean)];

  const metricRows: {
    label: string;
    read: (c: CompareColumn) => string;
  }[] = [
    { label: "Tag", read: (c) => c.tag ?? "-" },
    { label: "Type", read: (c) => c.entityTypeLabel },
    { label: "Status", read: (c) => c.statusLabel ?? "Live" },
    { label: "TVL", read: (c) => (c.tvlUsd != null ? formatUsdCompact(c.tvlUsd) : "-") },
    {
      label: "Total borrowed",
      read: (c) => (c.totalBorrowedUsd != null ? formatUsdCompact(c.totalBorrowedUsd) : "-"),
    },
    { label: "Chains", read: (c) => (c.chainCount != null ? String(c.chainCount) : "-") },
    { label: "Listed since", read: (c) => c.launchDate ?? "-" },
    { label: "Known audits", read: (c) => c.auditLabel },
    {
      label: "Shared risk drivers",
      read: (c) =>
        c.slug === self.slug ? "-" : c.sharedDriverLabels.length ? c.sharedDriverLabels.join(", ") : "None recorded",
    },
  ];

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-ink-100">Compare against peers</h3>
        <p className="text-xs leading-relaxed text-ink-400">
          Pick up to {MAX_PEERS} same-tag peers. Metric values are snapshot figures
          {self.asOf ? ` as of ${self.asOf}` : ""}.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Comparison peers">
        {candidates.map((c) => {
          const active = selected.includes(c.slug);
          const disabled = !active && atCap;
          return (
            <button
              key={c.slug}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => toggle(c.slug)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition",
                active
                  ? "border-electric-500/60 bg-electric-500/10 text-electric-300"
                  : disabled
                    ? "cursor-not-allowed border-ink-800 text-ink-400 opacity-60"
                    : "border-ink-700/80 text-ink-300 hover:border-ink-500",
              )}
            >
              {c.name}
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="font-mono text-[10px] uppercase text-ink-400">
        {selected.length} of {MAX_PEERS} selected
        {atCap ? " · cap reached, deselect to swap" : ""}
      </p>

      {selected.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-[560px] w-full text-left text-xs">
            <thead>
              <tr className="border-b border-ink-800">
                <th scope="col" className="py-2 pr-3 font-medium text-ink-400">
                  Metric
                </th>
                {shown.map((c) => (
                  <th scope="col" key={c.slug} className="py-2 pr-3 font-medium text-ink-100">
                    <span className="flex flex-wrap items-center gap-1.5">
                      {c.name}
                      {c.slug === self.slug && <Badge className="text-[9px] uppercase">this page</Badge>}
                      {c.sharedParentLabel && (
                        <Badge tone="neon" className="text-[9px]">
                          {c.sharedParentLabel}
                        </Badge>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800/60">
              {metricRows.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="py-2 pr-3 font-normal text-ink-300">
                    {row.label}
                  </th>
                  {shown.map((c) => (
                    <td key={c.slug} className="py-2 pr-3 font-mono text-ink-200">
                      {row.read(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-ink-300">Select at least one peer to render the matrix.</p>
      )}
    </Card>
  );
}
