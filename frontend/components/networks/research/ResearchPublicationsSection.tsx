import { ArrowUpRight, ChevronDown } from "lucide-react";

import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CollapsibleSection } from "@/components/networks/research/CollapsibleSection";
import type { ResearchPublication, ResearchPublicationType } from "@/lib/types";

const TYPE_TONE: Record<ResearchPublicationType, BadgeTone> = {
  "risk assessment": "warning",
  "analyst report": "electric",
  "academic paper": "neon",
  audit: "positive",
  "governance analysis": "signal",
  "incident post mortem": "danger",
  "data dashboard": "neutral",
};

const PRIMARY_COUNT = 8;

/**
 * #research — external research and analyst coverage as cards (CAN-71: these
 * rows are publisher/title/date/takeaway/URL and were prose-shaped; card
 * treatment, no table). Progressive disclosure past 8 rows via a native
 * <details> (no client JS), mirroring the M4 Show-all pattern.
 */
export function ResearchPublicationsSection({ publications }: { publications?: ResearchPublication[] }) {
  if (!publications?.length) return null;
  const primary = publications.slice(0, PRIMARY_COUNT);
  const rest = publications.slice(PRIMARY_COUNT);

  return (
    <CollapsibleSection
      id="research"
      title="Research and analyst coverage"
      subtitle="External publications on this protocol: risk assessments, analyst reports, audits and post mortems."
      count={publications.length}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {primary.map((p) => (
            <PublicationCard key={p.url} publication={p} />
          ))}
        </div>
        {rest.length > 0 && (
          <details className="group/more">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-full border border-ink-700/60 bg-ink-900/40 px-3 py-1.5 text-xs font-medium text-ink-300 transition-colors hover:border-ink-600 hover:text-ink-100 [&::-webkit-details-marker]:hidden">
              <span className="group-open/more:hidden">Show all publications (+{rest.length})</span>
              <span className="hidden group-open/more:inline">Show fewer</span>
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open/more:rotate-180" />
            </summary>
            <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
              {rest.map((p) => (
                <PublicationCard key={p.url} publication={p} />
              ))}
            </div>
          </details>
        )}
      </div>
    </CollapsibleSection>
  );
}

function PublicationCard({ publication }: { publication: ResearchPublication }) {
  return (
    <Card className="space-y-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
          {publication.publisher}
        </span>
        <Badge tone={TYPE_TONE[publication.type] ?? "neutral"} className="text-[10px]">
          {publication.type}
        </Badge>
        <span className="text-xs text-ink-400">{publication.date ?? "undated"}</span>
      </div>
      <a
        href={publication.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-start gap-1 text-sm font-medium text-ink-50 hover:text-electric-300"
      >
        <span>{publication.title}</span>
        <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-electric-400" />
      </a>
      <p className="text-sm leading-relaxed text-ink-300">{publication.takeaway}</p>
    </Card>
  );
}
