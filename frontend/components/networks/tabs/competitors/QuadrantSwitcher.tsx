"use client";

import { useState, type ReactNode } from "react";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { QuadrantAxesId } from "@/lib/networks/competitorsTab";

/**
 * Thin client wrapper for CAN-89: the four axis-pair charts are fully
 * server-rendered and passed as children; this island only toggles which one
 * is visible and mirrors the choice to ?axes= via history.replaceState.
 * Zero chart code ships to the client.
 */
export function QuadrantSwitcher({
  options,
  initialAxes,
  panels,
}: {
  options: { value: QuadrantAxesId; label: string }[];
  initialAxes: QuadrantAxesId;
  panels: { id: QuadrantAxesId; node: ReactNode }[];
}) {
  const [axes, setAxes] = useState<QuadrantAxesId>(initialAxes);

  const onChange = (next: QuadrantAxesId) => {
    setAxes(next);
    const url = new URL(window.location.href);
    url.searchParams.set("axes", next);
    window.history.replaceState(window.history.state, "", url);
  };

  return (
    <div className="space-y-4">
      <SegmentedControl ariaLabel="Quadrant axes" options={options} value={axes} onChange={onChange} />
      {panels.map((p) => (
        <div key={p.id} hidden={p.id !== axes}>
          {p.node}
        </div>
      ))}
    </div>
  );
}
