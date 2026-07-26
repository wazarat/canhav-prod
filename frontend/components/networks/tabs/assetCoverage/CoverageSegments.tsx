import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { AssetRiskTable, type AssetRoleFilter } from "@/components/networks/tabs/assetCoverage/AssetRiskTable";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataPanel } from "@/components/ui/DataPanel";
import { DonutChart, DONUT_COLORS } from "@/components/ui/DonutChart";
import type {
  AssetRiskTableModel,
  CollateralComposition,
} from "@/lib/networks/assetRisk";
import { assetEntityHref } from "@/lib/networks/assetRisk";
import type { AssetCoverage, NetworkProfile, SourceRef } from "@/lib/types";

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

/** Collateral / Loan / Instruments: the asset-risk table plus (collateral
 *  only) the composition donut. */
export function AssetTableSegment({
  model,
  roleFilter,
  composition,
  ariaLabel,
}: {
  model: AssetRiskTableModel;
  roleFilter: AssetRoleFilter;
  composition?: CollateralComposition | null;
  ariaLabel: string;
}) {
  return (
    <div className="space-y-4">
      {composition && composition.slices.length > 1 && (
        <Card className="flex items-center gap-5">
          <DonutChart
            segments={composition.slices}
            ariaLabel="Collateral composition"
            className="h-[88px] w-[88px] shrink-0"
          />
          <div className="min-w-0">
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {composition.slices.map((slice, i) => (
                <li key={slice.label} className="flex items-center gap-1.5 text-xs text-ink-300">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                    aria-hidden
                  />
                  {slice.label}
                  <span className="font-mono text-[10px] text-ink-500">{slice.value}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-[11px] text-ink-500">{composition.basis}</p>
          </div>
        </Card>
      )}
      <AssetRiskTable model={model} roleFilter={roleFilter} ariaLabel={ariaLabel} />
    </div>
  );
}

/** Oracles: provider cards with covered-asset chips and feed detail. */
export function OracleSegment({
  coverage,
  entitySlug,
}: {
  coverage: AssetCoverage;
  entitySlug: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {coverage.oracles.map((oracle) => (
        <Card key={oracle.provider} className="space-y-2">
          <p className="text-sm font-semibold text-ink-100">{oracle.provider}</p>
          {oracle.feedType && (
            <p className="text-xs leading-relaxed text-ink-400">{oracle.feedType}</p>
          )}
          {oracle.assetsCovered.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {oracle.assetsCovered.map((asset) => {
                const href = assetEntityHref(asset, entitySlug);
                return href ? (
                  <Link key={asset} href={href}>
                    <Badge tone="electric" className="cursor-pointer font-mono text-[10px]">
                      {asset}
                    </Badge>
                  </Link>
                ) : (
                  <Badge key={asset} tone="neutral" className="font-mono text-[10px]">
                    {asset}
                  </Badge>
                );
              })}
              <Badge tone="neutral" className="font-mono text-[10px]">
                {oracle.assetsCovered.length} assets
              </Badge>
            </div>
          )}
          <SourceLinks sources={oracle.sources} />
        </Card>
      ))}
    </div>
  );
}

/** Risk parameters: the deeper parameter columns + flagged-asset warnings. */
export function RiskParamsSegment({ coverage }: { coverage: AssetCoverage }) {
  const lendingRows = coverage.assets.filter(
    (a) =>
      a.liqBonusPct != null ||
      a.liqBonusText != null ||
      a.supplyCapDisplay != null ||
      a.borrowCapDisplay != null ||
      a.isolationEmode != null,
  );
  const fiRows = coverage.assets.filter((a) => a.collateralOrCapParameters != null);
  return (
    <div className="space-y-4">
      {coverage.shape === "lending" && lendingRows.length > 0 && (
        <DataPanel title="Per-asset parameters">
          <div className="divide-y divide-ink-800/60">
            {lendingRows.map((a) => (
              <div key={a.asset + a.role} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium text-ink-100">{a.asset}</span>
                  {a.borrowingDisabled && (
                    <Badge tone="danger" className="text-[9px] uppercase">
                      Borrowing disabled
                    </Badge>
                  )}
                  {a.ltvWithdrawn && (
                    <Badge tone="warning" className="text-[9px] uppercase">
                      LTV withdrawn
                    </Badge>
                  )}
                </div>
                <p className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-ink-400">
                  {(a.liqBonusText ?? a.liqBonusPct) != null && (
                    <span>Liq. bonus {a.liqBonusText ?? `${a.liqBonusPct}%`}</span>
                  )}
                  {a.supplyCapDisplay && <span>Supply cap {a.supplyCapDisplay}</span>}
                  {a.borrowCapDisplay && !a.borrowingDisabled && (
                    <span>Borrow cap {a.borrowCapDisplay}</span>
                  )}
                  {a.isolationEmode && <span>{a.isolationEmode}</span>}
                </p>
              </div>
            ))}
          </div>
        </DataPanel>
      )}
      {coverage.shape === "fixedIncome" && fiRows.length > 0 && (
        <DataPanel title="Collateral / cap parameters">
          <div className="divide-y divide-ink-800/60">
            {fiRows.map((a) => (
              <div key={a.asset + a.role} className="py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm font-medium text-ink-100">{a.asset}</span>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-400">
                  {a.collateralOrCapParameters}
                </p>
              </div>
            ))}
          </div>
        </DataPanel>
      )}
      {coverage.flaggedAssets.length > 0 && (
        <DataPanel title="Flagged assets" badge={`${coverage.flaggedAssets.length}`}>
          <div className="divide-y divide-ink-800/60">
            {coverage.flaggedAssets.map((f) => (
              <div key={f.asset + f.flag} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium text-ink-100">{f.asset}</span>
                  <Badge tone="danger" className="text-[10px]">
                    {f.flag}
                  </Badge>
                </div>
                {f.reason && (
                  <p className="mt-1 text-xs leading-relaxed text-ink-400">{f.reason}</p>
                )}
                <div className="mt-1">
                  <SourceLinks sources={f.sources} />
                </div>
              </div>
            ))}
          </div>
        </DataPanel>
      )}
    </div>
  );
}

/** Governance: who can change parameters, activity metrics (editorial `lending`). */
export function GovernanceSegment({ lending }: { lending: NonNullable<NetworkProfile["lending"]> }) {
  const detail = lending.governanceDetail;
  return (
    <DataPanel title="Governance">
      <div className="space-y-3 pt-1">
        {lending.governanceActivity && (
          <p className="text-sm leading-relaxed text-ink-300">{lending.governanceActivity}</p>
        )}
        {detail && (
          <div className="flex flex-wrap gap-x-6 gap-y-1.5">
            {detail.proposals != null && (
              <p className="text-xs text-ink-400">
                Proposals <span className="font-mono text-ink-200">{detail.proposals}</span>
              </p>
            )}
            {detail.voterTurnoutPct != null && (
              <p className="text-xs text-ink-400">
                Voter turnout{" "}
                <span className="font-mono text-ink-200">{detail.voterTurnoutPct}%</span>
              </p>
            )}
            {detail.treasuryUsd != null && (
              <p className="text-xs text-ink-400">
                Treasury{" "}
                <span className="font-mono text-ink-200">
                  ${Math.round(detail.treasuryUsd / 1e6).toLocaleString()}M
                </span>
              </p>
            )}
          </div>
        )}
        {detail?.notes && <p className="text-xs leading-relaxed text-ink-400">{detail.notes}</p>}
      </div>
    </DataPanel>
  );
}

/** Deployment: chains, audit / exploit history (editorial `lending`). */
export function DeploymentSegment({ lending }: { lending: NonNullable<NetworkProfile["lending"]> }) {
  const deployment = lending.deployment;
  return (
    <DataPanel title="Deployment & audits">
      <div className="space-y-3 pt-1">
        {deployment?.chains.length ? (
          <div className="flex flex-wrap gap-1">
            {deployment.chains.map((chain) => (
              <Badge key={chain} tone="neutral">
                {chain}
              </Badge>
            ))}
            <Badge tone="neutral" className="font-mono text-[10px]">
              {deployment.chains.length} chains
            </Badge>
          </div>
        ) : null}
        {deployment?.notes && (
          <p className="text-xs leading-relaxed text-ink-400">{deployment.notes}</p>
        )}
        {lending.auditHistory && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
              Audit / exploit history
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-300">{lending.auditHistory}</p>
          </div>
        )}
      </div>
    </DataPanel>
  );
}
