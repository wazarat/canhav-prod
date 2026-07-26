"use client";

import { useState, type ReactNode } from "react";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { CoverageSegment, CoverageSegmentId } from "@/lib/networks/assetRisk";

/**
 * Client shell for the six CAN-72 segments. The panels arrive server-rendered
 * (zero data serialized); this island only toggles visibility and mirrors the
 * active segment to ?seg= via history.replaceState — no navigation, no
 * scroll jump (the recorded pre-hydration hash-drift gotcha), deep-linkable
 * for the M7 cross-links.
 */
export function AssetCoverageSegments({
  segments,
  initialSegment,
  panels,
}: {
  segments: CoverageSegment[];
  initialSegment: CoverageSegmentId;
  panels: Partial<Record<CoverageSegmentId, ReactNode>>;
}) {
  const [active, setActive] = useState<CoverageSegmentId>(initialSegment);

  const onChange = (next: CoverageSegmentId) => {
    setActive(next);
    const url = new URL(window.location.href);
    url.searchParams.set("seg", next);
    window.history.replaceState(window.history.state, "", url);
  };

  return (
    <div className="space-y-4">
      <SegmentedControl
        ariaLabel="Asset coverage segment"
        options={segments.map((s) => ({ value: s.id, label: s.label, count: s.count }))}
        value={active}
        onChange={onChange}
      />
      {segments.map((s) => (
        <div key={s.id} hidden={s.id !== active}>
          {panels[s.id]}
        </div>
      ))}
    </div>
  );
}
