import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { DataPanel } from "@/components/ui/DataPanel";
import { CollapsibleSection } from "@/components/networks/research/CollapsibleSection";
import { InlineLinkText } from "@/components/shared/InlineLinkText";
import { splitParagraphs } from "@/lib/text";
import type { NetworkProfile } from "@/lib/types";

/** #organisation — intro prose (orgIntro) + the people/units list with per-row sources. */
export function OrgSection({ profile }: { profile: NetworkProfile }) {
  const rows = profile.orgStructure;
  const intro = profile.orgIntro;
  if (!rows.length && !intro) return null;

  return (
    <CollapsibleSection id="organisation" title="Organisation" count={rows.length}>
      <div className="space-y-4">
        {intro && (
          <div className="max-w-prose space-y-3">
            {splitParagraphs(intro).map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-ink-300">
                <InlineLinkText text={p} />
              </p>
            ))}
          </div>
        )}
        {rows.length > 0 && (
          <DataPanel title="People & units">
            <ul className="divide-y divide-ink-800/60">
              {rows.map((o, i) => (
                <li key={`${o.name}-${i}`} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-medium text-ink-50">{o.name}</p>
                      <p className="text-sm leading-relaxed text-ink-300">
                        {o.role}
                        {o.description ? ` ${o.description}` : ""}
                      </p>
                      {o.link && (
                        <a
                          href={o.link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-xs text-electric-400 hover:underline"
                        >
                          Source
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </DataPanel>
        )}
      </div>
    </CollapsibleSection>
  );
}
