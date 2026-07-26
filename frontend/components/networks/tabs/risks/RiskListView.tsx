"use client";

import { DriverBadge } from "@/components/networks/tabs/risks/DriverBadge";
import { SEVERITY_TONE } from "@/components/shared/riskTone";
import { Badge } from "@/components/ui/Badge";
import type { RiskTabModel } from "@/lib/networks/riskTab";
import { RISK_TAB_CATEGORIES } from "@/lib/networks/riskTab";

/**
 * CAN-79 list view: filtered risks grouped by category (the four core, then
 * Regulatory, then any unexpected extras), every row a button into the shared
 * expansion drawer.
 */
export function RiskListView({
  model,
  visibleIdx,
  onSelect,
}: {
  model: RiskTabModel;
  visibleIdx: number[];
  onSelect: (idx: number) => void;
}) {
  if (!visibleIdx.length) {
    return (
      <p className="rounded-xl border border-ink-800/60 bg-ink-950/40 p-4 text-sm text-ink-400">
        No risks match the current filters.
      </p>
    );
  }

  const knownOrder = [...RISK_TAB_CATEGORIES] as string[];
  const categories = [
    ...knownOrder.filter((c) => visibleIdx.some((i) => model.risks[i].category === c)),
    ...[...new Set(visibleIdx.map((i) => model.risks[i].category))]
      .filter((c) => !knownOrder.includes(c))
      .sort(),
  ];

  return (
    <div className="space-y-5">
      {categories.map((category) => {
        const idxs = visibleIdx.filter((i) => model.risks[i].category === category);
        return (
          <div key={category}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
              {category}
              <span className="ml-2 font-mono text-[10px] text-ink-300">{idxs.length}</span>
            </p>
            <ul className="space-y-2">
              {idxs.map((i) => {
                const risk = model.risks[i];
                const badges = model.sharedDriverBadges[i] ?? [];
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => onSelect(i)}
                      className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-ink-800/60 bg-ink-950/40 p-3 text-left transition hover:border-electric-500/40"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-100">
                        {risk.name ?? risk.category}
                      </span>
                      {badges
                        .filter((b) => !b.audit)
                        .slice(0, 2)
                        .map((b) => (
                          <DriverBadge key={b.label} badge={b} total={model.driverEntityTotal} />
                        ))}
                      {risk.likelihood && risk.impact && (
                        <span className="font-mono text-[10px] uppercase tracking-wide text-ink-300">
                          {risk.likelihood} × {risk.impact}
                        </span>
                      )}
                      <Badge tone={SEVERITY_TONE[risk.severity]} className="text-[10px] uppercase">
                        {risk.severity}
                      </Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
