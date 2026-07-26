import type { ReactNode } from "react";

import { InlineLinkText } from "@/components/shared/InlineLinkText";

/**
 * Inline embed of a single MetricCard beside a narrative claim (CAN-63
 * callout #4), so a research statement can sit next to the number that
 * supports it. Pass the MetricCard (already a client component with its own
 * drill-down) as `children`.
 */
export function KeyMetricCallout({ claim, children }: { claim: string; children: ReactNode }) {
  return (
    <aside className="glass grid items-center gap-4 rounded-xl border border-ink-700/60 p-4 sm:grid-cols-[minmax(0,1fr)_240px]">
      <p className="text-sm leading-relaxed text-ink-200">
        <InlineLinkText text={claim} glossary />
      </p>
      <div className="min-w-0">{children}</div>
    </aside>
  );
}
