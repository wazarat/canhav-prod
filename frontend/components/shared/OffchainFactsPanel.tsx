import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { freshnessMeta, humanizeFactKey } from "@/lib/classification";
import type { OffchainFact } from "@/lib/types";

/**
 * Curated off-chain facts (reg status, ratings, ICO terms) rendered with their
 * own freshness badge + source link, so the freshness contract from the playbook
 * (§3) is visible: a "Curated" fact never masquerades as live data. Theoretical /
 * forward-looking facts are tagged explicitly. Soft-fails to null when empty.
 */
export function OffchainFactsPanel({
  facts,
  title = "Off-chain facts",
}: {
  facts?: OffchainFact[] | null;
  title?: string;
}) {
  if (!facts || facts.length === 0) return null;

  return (
    <Card className="space-y-3">
      <CardTitle className="text-sm">{title}</CardTitle>
      <ul className="divide-y divide-ink-800/60">
        {facts.map((fact) => {
          const fresh = freshnessMeta(fact.freshness);
          return (
            <li key={fact.key} className="space-y-1.5 py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
                  {humanizeFactKey(fact.key)}
                </span>
                <Badge tone={fresh.tone} className="text-[10px]">
                  {fresh.label}
                </Badge>
                {fact.theoretical && (
                  <Badge tone="warning" className="text-[10px]">
                    Theoretical
                  </Badge>
                )}
              </div>
              <p className="text-sm leading-relaxed text-ink-200">{fact.value}</p>
              {fact.source?.url && (
                <a
                  href={fact.source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 text-xs text-electric-400 hover:underline"
                >
                  {fact.source.label}
                  <ArrowUpRight className="h-3 w-3 shrink-0" />
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
