import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { BadgeTone } from "@/components/ui/Badge";
import type { TimelineEntry } from "@/lib/types";

const STATUS_TONE: Record<string, BadgeTone> = {
  executed: "positive",
  stated: "signal",
  theoretical: "warning",
  "canhav-inferred": "neutral",
};

/**
 * Compact timeline rail for the dashboard band. Shows the most recent few
 * milestones; the full, legended timeline lives further down the page (#timeline).
 */
export function TimelineWidget({ entries }: { entries: TimelineEntry[] }) {
  if (!entries.length) {
    return (
      <Card className="flex h-full flex-col gap-2 p-5">
        <h3 className="text-sm font-semibold text-ink-100">Timeline</h3>
        <p className="mt-2 text-sm text-ink-400">No milestones recorded yet.</p>
      </Card>
    );
  }

  const recent = entries.slice(0, 4);

  return (
    <Card className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink-100">Timeline</h3>
        {entries.length > recent.length && (
          <a
            href="#timeline"
            className="inline-flex items-center gap-1 text-xs font-medium text-electric-400 transition-colors hover:text-electric-300"
          >
            View all ({entries.length})
            <ArrowRight className="h-3 w-3" />
          </a>
        )}
      </div>

      <div className="relative space-y-0 pl-5">
        <div className="absolute bottom-1 left-[5px] top-1 w-px bg-ink-700/80" />
        {recent.map((e) => (
          <div key={`${e.date}-${e.title}`} className="relative pb-4 last:pb-0">
            <span className="absolute -left-5 top-1 h-2.5 w-2.5 rounded-full border-2 border-electric-500/50 bg-ink-950" />
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-ink-100">{e.title}</p>
              <Badge tone={STATUS_TONE[e.status ?? "stated"] ?? "neutral"} className="text-[10px]">
                {e.date}
              </Badge>
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-400">
              {e.description}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
