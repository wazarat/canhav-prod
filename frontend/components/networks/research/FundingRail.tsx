import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { CollapsibleSection } from "@/components/networks/research/CollapsibleSection";
import { InlineLinkText } from "@/components/shared/InlineLinkText";
import { splitParagraphs } from "@/lib/text";
import type { NetworkProfile } from "@/lib/types";
import { formatUsdCompact } from "@/lib/utils";

/**
 * #funding — chronological vertical funding rail, one card per round (CAN-71:
 * replaces the 5-column min-w-[640px] table). Lead investors render as
 * highlighted chips ahead of the other participants. DAO-funded / no-VC
 * entities render the dataset's stated-absence note instead of an empty
 * table (fundingNote also carries caveats like conflicting raise reports).
 */
export function FundingRail({ profile }: { profile: NetworkProfile }) {
  const rounds = profile.investmentRounds;
  const note = profile.fundingNote;
  if (!rounds.length && !note) return null;

  return (
    <CollapsibleSection id="funding" title="Funding history" count={rounds.length}>
      <div className="space-y-4">
        {rounds.length > 0 && (
          <div className="relative space-y-0 pl-6">
            <div className="absolute bottom-2 left-[7px] top-2 w-px bg-ink-700/80" />
            {rounds.map((r, i) => (
              <div key={`${r.date}-${i}`} className="relative pb-5 last:pb-0">
                <span className="absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-electric-500/50 bg-ink-950" />
                <div className="space-y-2 rounded-xl border border-ink-800/60 bg-ink-900/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ink-50">{r.round}</p>
                    <Badge tone="neutral">{r.date}</Badge>
                  </div>
                  {(r.amountLabel || r.amountUsd != null) && (
                    <p className="font-mono text-sm text-ink-100">
                      {r.amountLabel ?? formatUsdCompact(r.amountUsd as number)}
                    </p>
                  )}
                  {((r.leadInvestors?.length ?? 0) > 0 || r.investors.length > 0) && (
                    <div className="flex flex-wrap gap-1">
                      {r.leadInvestors?.map((inv) => (
                        <Badge key={inv} tone="electric">
                          {inv}
                        </Badge>
                      ))}
                      {r.investors.map((inv) => (
                        <Badge key={inv} tone="neutral">
                          {inv}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {r.link && (
                    <a
                      href={r.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 text-xs text-electric-400 hover:underline"
                    >
                      Announcement
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {note && (
          <div className="max-w-prose space-y-2 rounded-xl border border-dashed border-ink-700/70 bg-ink-900/20 p-4">
            {splitParagraphs(note).map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-ink-300">
                <InlineLinkText text={p} />
              </p>
            ))}
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
