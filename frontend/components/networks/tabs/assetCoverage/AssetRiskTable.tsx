"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { AssetRiskDrawer } from "@/components/networks/tabs/assetCoverage/AssetRiskDrawer";
import { SEVERITY_BAR, SEVERITY_TONE } from "@/components/shared/riskTone";
import { Badge } from "@/components/ui/Badge";
import { Table, TableShell, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { Tooltip } from "@/components/ui/Tooltip";
import type { AssetRiskRowModel, AssetRiskTableModel } from "@/lib/networks/assetRisk";
import { assetEntityHref } from "@/lib/networks/assetRisk";
import type { RiskSeverity } from "@/lib/types";

const VISIBLE_ROWS = 8;

export type AssetRoleFilter = "collateral" | "loan" | "instruments" | "all";

function rowsForFilter(rows: AssetRiskRowModel[], filter: AssetRoleFilter): AssetRiskRowModel[] {
  switch (filter) {
    case "collateral":
      return rows.filter((r) => r.asset.roleKind === "collateral" || r.asset.roleKind === "both");
    case "loan":
      return rows.filter((r) => r.asset.roleKind === "loan" || r.asset.roleKind === "both");
    case "instruments":
      return rows.filter((r) => r.asset.roleKind === "other");
    default:
      return rows;
  }
}

function pctCell(value: number | null, text: string | null): React.ReactNode {
  if (text) {
    return (
      <span className="block max-w-[180px] truncate text-xs" title={text}>
        {text}
      </span>
    );
  }
  if (value != null) return <span className="font-mono text-xs">{value}%</span>;
  return <span className="text-ink-600">—</span>;
}

function capCell(row: AssetRiskRowModel, kind: "supply" | "borrow"): React.ReactNode {
  const a = row.asset;
  if (kind === "borrow" && a.borrowingDisabled) {
    return <Badge tone="danger" className="text-[10px]">Borrowing disabled</Badge>;
  }
  const display = kind === "supply" ? a.supplyCapDisplay : a.borrowCapDisplay;
  if (!display) return <span className="text-ink-600">—</span>;
  return (
    <span className="block max-w-[170px] truncate font-mono text-xs" title={display}>
      {display}
    </span>
  );
}

/** Four core-category severity bars — the CAN-77 at-a-glance visual. Each bar
 *  carries a native title with the contributing risk names; the full
 *  narrative is one click away in the row drawer (no per-bar tab stops). */
function SeverityBars({
  row,
  risks,
  maxWeighted,
}: {
  row: AssetRiskRowModel;
  risks: AssetRiskTableModel["risks"];
  maxWeighted: number;
}) {
  const denominator = Math.max(maxWeighted, 1);
  return (
    <div className="flex items-center gap-2">
      <div
        role="img"
        className="grid w-24 grid-cols-[10px_1fr] items-center gap-x-1 gap-y-0.5"
        aria-label={`Risk sub-scores: ${row.subScores
          .map((s) => `${s.category} ${s.weighted}`)
          .join(", ")}`}
      >
        {row.subScores.map((s) => {
          const title =
            s.count === 0
              ? `${s.category}: no linked risks`
              : `${s.category} ${s.weighted}: ${s.riskIdx
                  .map((i) => risks[i].name ?? risks[i].category)
                  .join("; ")}`;
          return (
            <span key={s.category} className="contents">
              <span
                className="font-mono text-[9px] uppercase leading-none text-ink-300"
                title={title}
              >
                {s.category[0]}
              </span>
              <span
                className="block h-1.5 overflow-hidden rounded-full bg-ink-800/70"
                title={title}
              >
                {s.weighted > 0 && (
                  <span
                    className={`block h-full rounded-full ${SEVERITY_BAR[s.maxSeverity ?? "low"]}`}
                    style={{ width: `${Math.max((s.weighted / denominator) * 100, 8)}%` }}
                  />
                )}
              </span>
            </span>
          );
        })}
      </div>
      {row.regulatoryIdx.length > 0 && (
        <span
          className="rounded-full border border-ink-700/70 px-1.5 py-0.5 font-mono text-[9px] uppercase text-ink-400"
          title="Regulatory risks attach to this asset; kept separate from the four scored categories, never folded in."
        >
          Reg
        </span>
      )}
    </div>
  );
}

/**
 * CAN-77: one table where every row is a supported asset carrying both its
 * parameters and its risk profile. ~6 columns and 8 rows by default (the
 * 12-column source model lives behind the row drill-down); severity bars are
 * scaled within the entity so the weak link reads at a glance.
 */
export function AssetRiskTable({
  model,
  roleFilter,
  ariaLabel,
}: {
  model: AssetRiskTableModel;
  roleFilter: AssetRoleFilter;
  ariaLabel: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<AssetRiskRowModel | null>(null);

  const rows = useMemo(() => rowsForFilter(model.rows, roleFilter), [model.rows, roleFilter]);
  const visible = showAll ? rows : rows.slice(0, VISIBLE_ROWS);
  const isLending = model.shape === "lending";

  if (!rows.length) return null;

  const paramHeaders = !model.hasParams
    ? [<TH key="chain">Chain</TH>]
    : isLending
      ? roleFilter === "loan"
        ? [<TH key="bcap">Borrow cap</TH>, <TH key="scap">Supply cap</TH>]
        : [<TH key="ltv">Max LTV</TH>, <TH key="thr">Liq. threshold</TH>]
      : [<TH key="mat">Maturity</TH>, <TH key="apy">Implied APY</TH>];

  return (
    <div className="space-y-3">
      <TableShell>
        <Table aria-label={ariaLabel} className="min-w-[640px]">
          <THead>
            <tr>
              <TH>Asset</TH>
              <TH>Role</TH>
              {paramHeaders}
              <TH>Oracle</TH>
              <TH>
                <Tooltip content="Per-category risk score = severity weights (critical 4, high 3, medium 2, low 1) summed over the dataset risks linked to this asset: M market, T technological, C counterparty, G governance. Bars scale to the highest category score for this entity. Open a row for the contributing risks.">
                  <span className="cursor-help underline decoration-ink-600 decoration-dotted underline-offset-2">
                    Risk
                  </span>
                </Tooltip>
              </TH>
              <TH aria-label="Details" />
            </tr>
          </THead>
          <TBody>
            {visible.map((row) => {
              const a = row.asset;
              const href = assetEntityHref(a.asset, model.entitySlug);
              return (
                <TR
                  key={a.asset + a.role}
                  className="cursor-pointer"
                  onClick={() => setSelected(row)}
                >
                  <TD>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {href ? (
                        <Link
                          href={href}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-electric-400 transition hover:text-electric-300"
                        >
                          {a.asset}
                        </Link>
                      ) : (
                        <span className="font-medium text-ink-100">{a.asset}</span>
                      )}
                      {row.flagged && (
                        <span title={row.flagged.flag}>
                          <Badge tone="danger" className="text-[9px] uppercase">
                            Flagged
                          </Badge>
                        </span>
                      )}
                      {a.ltvWithdrawn && roleFilter !== "loan" && (
                        <Badge tone="warning" className="text-[9px] uppercase">
                          LTV withdrawn
                        </Badge>
                      )}
                      {a.borrowingDisabled && roleFilter !== "loan" && isLending && (
                        <Badge tone="neutral" className="text-[9px] uppercase">
                          No borrow
                        </Badge>
                      )}
                    </div>
                    {a.chain && model.hasParams && (
                      <p className="mt-0.5 text-[10px] text-ink-300">{a.chain}</p>
                    )}
                  </TD>
                  <TD>
                    <span className="block max-w-[150px] truncate text-xs text-ink-300" title={a.role}>
                      {a.role}
                    </span>
                  </TD>
                  {!model.hasParams ? (
                    <TD>
                      <span className="text-xs text-ink-300">{a.chain ?? "—"}</span>
                    </TD>
                  ) : isLending ? (
                    roleFilter === "loan" ? (
                      <>
                        <TD>{capCell(row, "borrow")}</TD>
                        <TD>{capCell(row, "supply")}</TD>
                      </>
                    ) : (
                      <>
                        <TD>
                          {a.ltvWithdrawn ? (
                            <Badge tone="warning" className="text-[10px]">
                              Withdrawn
                            </Badge>
                          ) : (
                            pctCell(a.maxLtvPct, a.maxLtvText)
                          )}
                        </TD>
                        <TD>{pctCell(a.liqThresholdPct, a.liqThresholdText)}</TD>
                      </>
                    )
                  ) : (
                    <>
                      <TD>
                        <span
                          className="block max-w-[150px] truncate font-mono text-xs"
                          title={a.maturityOrTerm ?? undefined}
                        >
                          {a.maturityOrTerm ?? "—"}
                        </span>
                      </TD>
                      <TD>
                        <span
                          className="block max-w-[170px] truncate text-xs"
                          title={a.fixedImpliedApy ?? undefined}
                        >
                          {a.fixedImpliedApy ?? "—"}
                        </span>
                      </TD>
                    </>
                  )}
                  <TD>
                    <span
                      className="block max-w-[190px] truncate text-xs text-ink-300"
                      title={a.oracle ?? undefined}
                    >
                      {a.oracle ?? "—"}
                    </span>
                  </TD>
                  <TD>
                    <SeverityBars
                      row={row}
                      risks={model.risks}
                      maxWeighted={model.maxSubScoreWeighted}
                    />
                  </TD>
                  <TD className="w-10">
                    <button
                      type="button"
                      aria-label={`Open ${a.asset} details`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(row);
                      }}
                      className="rounded-lg border border-ink-800/60 p-1 text-ink-400 transition hover:text-ink-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-500/70"
                    >
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </TableShell>

      {rows.length > VISIBLE_ROWS && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="text-xs font-medium text-electric-400 transition hover:text-electric-300"
        >
          {showAll ? "Show fewer" : `Show all ${rows.length} assets`}
        </button>
      )}

      {model.protocolWideIdx.length > 0 && (
        <details className="rounded-xl border border-ink-800/60 bg-ink-950/40 p-3">
          <summary className="cursor-pointer text-xs font-medium text-ink-300">
            Protocol-wide risks not tied to a single asset ({model.protocolWideIdx.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {model.protocolWideIdx.map((i) => {
              const risk = model.risks[i];
              return (
                <li key={i} className="flex flex-wrap items-center gap-2 text-xs text-ink-300">
                  <Badge tone={SEVERITY_TONE[risk.severity]} className="text-[9px] uppercase">
                    {risk.severity}
                  </Badge>
                  <span className="font-medium text-ink-200">{risk.name ?? risk.category}</span>
                  <span className="text-ink-300">{risk.category}</span>
                  {risk.linkedAssetsUnmatched?.length ? (
                    <span className="text-[10px] text-ink-300">
                      scope: {risk.linkedAssetsUnmatched.join(", ")}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[11px] text-ink-300">
            Full narratives on the{" "}
            <Link
              href={`/networks/${model.entitySlug}?tab=risks`}
              className="text-electric-400 hover:text-electric-300"
            >
              Risks tab
            </Link>
            .
          </p>
        </details>
      )}

      {model.riskLinkNote && (
        <p className="text-[11px] leading-relaxed text-ink-300">{model.riskLinkNote}</p>
      )}

      <AssetRiskDrawer
        open={selected != null}
        onClose={() => setSelected(null)}
        row={selected}
        risks={model.risks}
      />
    </div>
  );
}
