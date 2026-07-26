"use client";

import { ArrowUpRight } from "lucide-react";

import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Drawer";
import type { AssetRiskRowModel } from "@/lib/networks/assetRisk";
import { CORE_RISK_CATEGORIES } from "@/lib/networks/assetRisk";
import type { RiskSeverity, SourceRef, TypedRisk } from "@/lib/types";

const SEVERITY_TONE: Record<RiskSeverity, BadgeTone> = {
  critical: "danger",
  high: "danger",
  medium: "warning",
  low: "neutral",
};

function SourceLinks({ sources }: { sources: SourceRef[] }) {
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

function ParamRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-xs text-ink-400">{label}</dt>
      <dd className="text-right text-xs text-ink-200">{value}</dd>
    </div>
  );
}

function RiskCard({ risk }: { risk: TypedRisk }) {
  return (
    <div className="rounded-xl border border-ink-800/60 bg-ink-950/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-ink-100">{risk.name ?? risk.category}</p>
        <Badge tone={SEVERITY_TONE[risk.severity]} className="text-[10px] uppercase">
          {risk.severity}
        </Badge>
        {risk.asOf && <span className="font-mono text-[10px] text-ink-500">{risk.asOf}</span>}
      </div>
      {(risk.likelihood || risk.impact) && (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-ink-500">
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
        <p className="mt-1 text-[11px] text-ink-500">
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
    </div>
  );
}

/**
 * Per-asset drill-down (CAN-77): the full parameter model behind the 6-column
 * default view, the flagged-asset history, and the risk narrative grouped by
 * the four core categories plus Regulatory. Pulls straight from the same
 * TypedRisk records the Risks tab renders (M7 shared shape).
 */
export function AssetRiskDrawer({
  open,
  onClose,
  row,
  risks,
}: {
  open: boolean;
  onClose: () => void;
  row: AssetRiskRowModel | null;
  risks: TypedRisk[];
}) {
  if (!row) return null;
  const a = row.asset;
  const isLending = a.underlyingYieldSource == null && a.maturityOrTerm == null;

  return (
    <Drawer open={open} onClose={onClose} title={a.asset}>
      <div className="space-y-5 text-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{a.role}</Badge>
            {a.chain && <Badge tone="neutral">{a.chain}</Badge>}
            {a.borrowingDisabled && <Badge tone="danger">Borrowing disabled</Badge>}
            {a.ltvWithdrawn && <Badge tone="warning">LTV withdrawn</Badge>}
          </div>
          <dl className="mt-3 divide-y divide-ink-800/60">
            {isLending ? (
              <>
                <ParamRow
                  label="Max LTV"
                  value={a.maxLtvText ?? (a.maxLtvPct != null ? `${a.maxLtvPct}%` : null)}
                />
                <ParamRow
                  label="Liquidation threshold"
                  value={
                    a.liqThresholdText ?? (a.liqThresholdPct != null ? `${a.liqThresholdPct}%` : null)
                  }
                />
                <ParamRow
                  label="Liquidation bonus"
                  value={a.liqBonusText ?? (a.liqBonusPct != null ? `${a.liqBonusPct}%` : null)}
                />
                <ParamRow label="Supply cap" value={a.supplyCapDisplay} />
                <ParamRow
                  label="Borrow cap"
                  value={a.borrowingDisabled ? "Borrowing disabled" : a.borrowCapDisplay}
                />
                <ParamRow label="E-Mode / isolation" value={a.isolationEmode} />
              </>
            ) : (
              <>
                <ParamRow label="Underlying yield source" value={a.underlyingYieldSource} />
                <ParamRow label="Maturity / term" value={a.maturityOrTerm} />
                <ParamRow label="Fixed / implied APY" value={a.fixedImpliedApy} />
                <ParamRow label="Collateral / cap parameters" value={a.collateralOrCapParameters} />
              </>
            )}
            <ParamRow label="Oracle" value={a.oracle} />
          </dl>
          {a.notes && <p className="mt-2 text-xs leading-relaxed text-ink-400">{a.notes}</p>}
          <div className="mt-2">
            <SourceLinks sources={a.sources} />
          </div>
        </div>

        {row.flagged && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
            <div className="flex items-center gap-2">
              <Badge tone="danger">{row.flagged.flag}</Badge>
            </div>
            {row.flagged.reason && (
              <p className="mt-1.5 text-xs leading-relaxed text-ink-300">{row.flagged.reason}</p>
            )}
            <div className="mt-1.5">
              <SourceLinks sources={row.flagged.sources} />
            </div>
          </div>
        )}

        {row.riskIdx.length > 0 || row.regulatoryIdx.length > 0 ? (
          <div className="space-y-4">
            {row.subScores
              .filter((s) => s.count > 0)
              .map((s) => (
                <div key={s.category}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                    {s.category}
                    <span className="ml-2 font-mono text-[10px] text-ink-500">
                      weighted {s.weighted}
                    </span>
                  </p>
                  <div className="space-y-2">
                    {s.riskIdx.map((i) => (
                      <RiskCard key={i} risk={risks[i]} />
                    ))}
                  </div>
                </div>
              ))}
            {row.regulatoryIdx.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                  Regulatory
                </p>
                <div className="space-y-2">
                  {row.regulatoryIdx.map((i) => (
                    <RiskCard key={i} risk={risks[i]} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-ink-500">
            No typed risk in the dataset attaches to this asset directly; protocol-wide risks
            still apply (listed under the table).
          </p>
        )}
        <p className="text-[11px] leading-relaxed text-ink-500">
          {CORE_RISK_CATEGORIES.join(" / ")} scores sum severity weights (critical 4, high 3,
          medium 2, low 1) over the risks linked to this asset in the M6/M7 dataset.
        </p>
      </div>
    </Drawer>
  );
}
