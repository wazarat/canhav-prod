"use client";

import { useState, type ReactNode } from "react";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { CompetitorsViewId } from "@/lib/networks/competitorsTab";

/**
 * The one view-switch island for the M8 Competitors tab (clone of the
 * RisksViews ?view= mechanics): list / compare / map toggle mirrored to
 * ?view= via history.replaceState. All three panels are server-rendered and
 * passed as children; the island only toggles visibility, so a deep link
 * SSRs the right panel and no panel content ships as client JS.
 */
export function CompetitorsViews({
  initialView,
  hasMap,
  panels,
}: {
  initialView: CompetitorsViewId;
  hasMap: boolean;
  panels: { id: CompetitorsViewId; node: ReactNode }[];
}) {
  const [view, setView] = useState<CompetitorsViewId>(initialView);

  const onChange = (next: CompetitorsViewId) => {
    setView(next);
    const url = new URL(window.location.href);
    if (next === "list") url.searchParams.delete("view");
    else url.searchParams.set("view", next);
    window.history.replaceState(window.history.state, "", url);
  };

  const options: { value: CompetitorsViewId; label: string }[] = [
    { value: "list", label: "Competitor set" },
    { value: "compare", label: "Compare" },
    ...(hasMap ? [{ value: "map" as const, label: "Quadrant" }] : []),
  ];

  return (
    <section className="space-y-4">
      <SegmentedControl ariaLabel="Competitors view" options={options} value={view} onChange={onChange} />
      {panels.map((p) => (
        <div key={p.id} hidden={p.id !== view}>
          {p.node}
        </div>
      ))}
    </section>
  );
}
