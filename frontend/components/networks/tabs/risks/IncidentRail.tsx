import { ArrowUpRight } from "lucide-react";

import { CATEGORY_COLOR, CATEGORY_COLOR_FALLBACK } from "@/components/shared/riskTone";
import { incidentCategory, incidentDateRank } from "@/lib/networks/riskTab";
import type { IncidentEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * CAN-78 incident history rail (server-rendered, zero JS). Chronological
 * horizontal timeline of the dataset's documented incidents; each card is a
 * native <details> (NAMED group — nested-details gotcha) expanding to the full
 * record. The category chip is a documented eventType->category
 * classification, not per-incident data, and is labelled as such. Amounts and
 * outcomes render only when the dataset carries them — never fabricated.
 * The rail scrolls inside its own container; the page never scrolls
 * horizontally.
 */

/** True when the incidents carry the M6-pushed rich fields. */
export function hasRichIncidents(incidents: IncidentEvent[] | undefined): boolean {
  return Boolean(
    incidents?.some((i) => i.eventType != null || i.outcome != null || i.amountUsdDisplay != null),
  );
}

export function IncidentRail({ incidents }: { incidents: IncidentEvent[] }) {
  if (!incidents.length) return null;
  const sorted = [...incidents]
    .map((incident, i) => ({ incident, i, rank: incidentDateRank(incident.date) }))
    .sort((a, b) =>
      // Chronological when both dates parse; unparseable dates keep their
      // original order after the parsed ones.
      a.rank != null && b.rank != null ? a.rank - b.rank : a.rank != null ? -1 : b.rank != null ? 1 : a.i - b.i,
    )
    .map((x) => x.incident);
  const first = sorted[0]?.date;
  const last = sorted[sorted.length - 1]?.date;

  return (
    <section id="incident-history" className="scroll-mt-24 space-y-3">
      <div className="border-b border-ink-800/60 pb-2">
        <h2 className="font-display text-lg font-semibold tracking-tight text-ink-50">
          Incident history
        </h2>
        <p className="mt-1 text-sm text-ink-300">
          {sorted.length} documented incident{sorted.length === 1 ? "" : "s"}
          {first && last && first !== last ? ` · ${first} — ${last}` : first ? ` · ${first}` : ""}
          {" · "}how the protocol behaved under stress, with sources.
        </p>
      </div>
      <div className="overflow-x-auto pb-2">
        <ol className="flex items-start gap-3">
          {sorted.map((incident, i) => {
            const category = incidentCategory(incident.eventType);
            return (
              <li key={`${incident.date}-${i}`} className="relative w-64 shrink-0">
                {i < sorted.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute -right-3 top-5 h-px w-3 bg-ink-800"
                  />
                )}
                <details className="group/incident rounded-xl border border-ink-800/60 bg-ink-950/40 p-3 open:border-ink-700">
                  <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <p className="font-mono text-[10px] text-ink-300">{incident.date}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {incident.eventType && (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-ink-700/80 bg-ink-900/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ink-200">
                          <span
                            aria-hidden
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              category
                                ? (CATEGORY_COLOR[category] ?? CATEGORY_COLOR_FALLBACK)
                                : "bg-ink-500",
                            )}
                          />
                          {incident.eventType}
                        </span>
                      )}
                      {incident.amountUsdDisplay && (
                        <span className="font-mono text-[10px] text-rose-300/90">
                          {incident.amountUsdDisplay}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-ink-300 group-open/incident:hidden">
                      {incident.description}
                    </p>
                    <span className="mt-1 inline-block text-[10px] text-electric-400 group-open/incident:hidden">
                      Details
                    </span>
                  </summary>
                  <div className="mt-1.5 space-y-2">
                    <p className="text-xs leading-relaxed text-ink-300">{incident.description}</p>
                    {incident.outcome && (
                      <p className="text-xs leading-relaxed text-ink-400">
                        <span className="font-medium text-ink-300">Outcome: </span>
                        {incident.outcome}
                      </p>
                    )}
                    {incident.link && (
                      <a
                        href={incident.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[11px] text-electric-400 transition hover:text-electric-300"
                      >
                        Source
                        <ArrowUpRight className="h-3 w-3" aria-hidden />
                      </a>
                    )}
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      </div>
      <p className="text-[11px] leading-relaxed text-ink-300">
        Event-type chips are categorised by event type against the risk taxonomy (a documented
        presentation mapping, not a dataset assessment). Amounts are the dataset&apos;s published
        figures; missing values were never published.
      </p>
    </section>
  );
}
