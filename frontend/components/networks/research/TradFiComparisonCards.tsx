import { ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { CollapsibleSection } from "@/components/networks/research/CollapsibleSection";
import { InlineLinkText } from "@/components/shared/InlineLinkText";
import type { NetworkProfile, TradFiRow } from "@/lib/types";

/**
 * #tradfi — side-by-side comparison cards, one per compared dimension
 * (CAN-71: replaces the 3-column min-w-[720px] prose table). Left: how the
 * protocol handles the dimension; right: the TradFi analogue. Legacy 3-field
 * rows (the 8 parked Credit entities and non-Credit sectors) fall back to a
 * single-card treatment — still cards, never a prose table.
 */
export function TradFiComparisonCards({ profile }: { profile: NetworkProfile }) {
  const rows = profile.tradFiComparison;
  if (!rows.length) return null;

  return (
    <CollapsibleSection
      id="tradfi"
      title="TradFi analogy"
      subtitle={
        profile.tradFiAnalogue
          ? undefined
          : `How ${profile.name} maps onto established TradFi structures, and where it diverges.`
      }
      count={rows.length}
    >
      <div className="space-y-4">
        {profile.tradFiAnalogue && (
          <Card className="glass-strong border-l-2 border-l-electric-500/60 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Closest analogue
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-100">
              <InlineLinkText text={profile.tradFiAnalogue} glossary />
            </p>
          </Card>
        )}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {rows.map((row, i) => (
            <TradFiCard key={row.dimension ?? row.product ?? i} row={row} networkName={profile.name} />
          ))}
        </div>
      </div>
    </CollapsibleSection>
  );
}

function TradFiCard({ row, networkName }: { row: TradFiRow; networkName: string }) {
  const dimension = row.dimension ?? row.product;
  const protocolSide = row.protocolSide ?? row.similarity;
  const tradFiSide = row.tradFiSide ?? row.differences;
  return (
    <Card className="space-y-3 p-5">
      <p className="text-sm font-semibold text-ink-50">{dimension}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1 rounded-lg border border-electric-500/20 bg-electric-500/5 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-electric-400">
            {networkName}
          </p>
          <p className="text-sm leading-relaxed text-ink-200">
            <InlineLinkText text={protocolSide} glossary />
          </p>
        </div>
        <div className="space-y-1 rounded-lg border border-ink-700/60 bg-ink-900/40 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-400">
            TradFi analogue
          </p>
          <p className="text-sm leading-relaxed text-ink-300">
            <InlineLinkText text={tradFiSide} glossary />
          </p>
        </div>
      </div>
      {row.sourceUrl && (
        <a
          href={row.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 text-xs text-electric-400 hover:underline"
        >
          {row.sourceLabel ?? "Source"}
          <ArrowUpRight className="h-3 w-3" />
        </a>
      )}
    </Card>
  );
}
