import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { CollapsibleSection } from "@/components/networks/research/CollapsibleSection";
import type { BullBearCase, BullBearPoint } from "@/lib/types";

/**
 * #bull-bear — the Morningstar-style contrasting callout pair (CAN-63 callout
 * #1): two card columns, each bullet sourced. Copy comes from the M5 dataset
 * section 8 (never authored in code).
 */
export function BullBearCallout({ bullBearCase }: { bullBearCase?: BullBearCase }) {
  if (!bullBearCase || (!bullBearCase.bull.length && !bullBearCase.bear.length)) return null;

  return (
    <CollapsibleSection id="bull-bear" title="Bull and bear case">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CaseColumn
          title="Bull case"
          points={bullBearCase.bull}
          borderClass="border-l-emerald-500/60"
          icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
        />
        <CaseColumn
          title="Bear case"
          points={bullBearCase.bear}
          borderClass="border-l-rose-500/60"
          icon={<TrendingDown className="h-4 w-4 text-rose-400" />}
        />
      </div>
    </CollapsibleSection>
  );
}

function CaseColumn({
  title,
  points,
  borderClass,
  icon,
}: {
  title: string;
  points: BullBearPoint[];
  borderClass: string;
  icon: React.ReactNode;
}) {
  if (!points.length) return null;
  return (
    <Card className={`space-y-3 border-l-2 p-5 ${borderClass}`}>
      <p className="flex items-center gap-2 text-sm font-semibold text-ink-50">
        {icon}
        {title}
      </p>
      <ul className="space-y-3">
        {points.map((point, i) => (
          <li key={i} className="space-y-1">
            <p className="text-sm leading-relaxed text-ink-300">{point.claim}</p>
            <a
              href={point.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-xs text-electric-400 hover:underline"
            >
              {point.sourceLabel}
              <ArrowUpRight className="h-3 w-3 shrink-0" />
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}
