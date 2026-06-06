import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { TypedRisk } from "@/lib/types";

const SEVERITY_TONE = {
  high: "danger",
  medium: "warning",
  low: "neutral",
} as const;

interface TypedRiskListProps {
  risks: TypedRisk[];
  title?: string;
  id?: string;
}

export function TypedRiskList({
  risks,
  title = "Risk factors",
  id = "typed-risks",
}: TypedRiskListProps) {
  if (!risks.length) return null;
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div className="border-b border-ink-800/60 pb-2">
        <h2 className="font-display text-lg font-semibold tracking-tight text-ink-50">
          {title}
        </h2>
      </div>
      <div className="space-y-3">
        {risks.map((risk) => (
          <Card key={risk.category} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium text-ink-100">{risk.category}</p>
              <p className="text-sm leading-relaxed text-ink-300">{risk.description}</p>
            </div>
            <Badge tone={SEVERITY_TONE[risk.severity]} className="shrink-0 self-start capitalize">
              {risk.severity}
            </Badge>
          </Card>
        ))}
      </div>
    </section>
  );
}
