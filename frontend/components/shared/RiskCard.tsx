import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { SEVERITY_TONE } from "@/components/shared/riskTone";
import type { SourceRef, TypedRisk } from "@/lib/types";

/**
 * The one renderer for a full TypedRisk record (name, severity, likelihood x
 * impact, description, mitigation, monitoring signal, scope note, source) —
 * lifted from AssetRiskDrawer in M7 so the Asset coverage drill-down and the
 * Risks tab expansion panels stay one component. Presentational only; inherits
 * clientness from its importer.
 */

export function SourceLinks({ sources }: { sources: SourceRef[] }) {
  if (!sources.length) return null;
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1">
      {sources.map((s) => (
        <a
          key={s.url}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-xs text-electric-400 transition hover:text-electric-300"
        >
          {s.label}
          <ArrowUpRight className="h-3 w-3" aria-hidden />
        </a>
      ))}
    </span>
  );
}

export function RiskCard({
  risk,
  headerExtra,
  footer,
}: {
  risk: TypedRisk;
  /** Extra badges/chips rendered after severity + asOf (M7 driver badges). */
  headerExtra?: ReactNode;
  /** Extra block rendered after the source link (M7 cross-links). */
  footer?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-ink-800/60 bg-ink-950/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-ink-100">{risk.name ?? risk.category}</p>
        <Badge tone={SEVERITY_TONE[risk.severity]} className="text-[10px] uppercase">
          {risk.severity}
        </Badge>
        {risk.asOf && <span className="font-mono text-[10px] text-ink-300">{risk.asOf}</span>}
        {headerExtra}
      </div>
      {(risk.likelihood || risk.impact) && (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-ink-300">
          likelihood {risk.likelihood ?? "n/a"} · impact {risk.impact ?? "n/a"}
        </p>
      )}
      <p className="mt-1.5 text-xs leading-relaxed text-ink-300">{risk.description}</p>
      {risk.mitigation && (
        <p className="mt-1.5 text-xs leading-relaxed text-ink-400">
          <span className="font-medium text-ink-300">Mitigation: </span>
          {risk.mitigation}
        </p>
      )}
      {risk.monitoringSignal && (
        <p className="mt-1 text-xs leading-relaxed text-ink-400">
          <span className="font-medium text-ink-300">Watch: </span>
          {risk.monitoringSignal}
        </p>
      )}
      {risk.linkedAssetsUnmatched?.length ? (
        <p className="mt-1 text-[11px] text-ink-300">
          Also touches (outside the curated table): {risk.linkedAssetsUnmatched.join(", ")}
        </p>
      ) : null}
      {risk.sourceUrl && (
        <a
          href={risk.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-flex items-center gap-0.5 text-[11px] text-electric-400 transition hover:text-electric-300"
        >
          {risk.sourceLabel ?? "Source"}
          <ArrowUpRight className="h-3 w-3" aria-hidden />
        </a>
      )}
      {footer}
    </div>
  );
}
