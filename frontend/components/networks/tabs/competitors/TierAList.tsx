import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { TierARow } from "@/lib/networks/competitorsTab";
import { SHARED_DRIVER_ENTITY_TOTAL } from "@/lib/networks/sharedRiskDrivers";
import { formatUsdCompact } from "@/lib/utils";

/**
 * Tier A (CAN-84): on-platform competitors, grouped same-tag first, then
 * other Credit peers, then adjacent sectors. Every row is clickable and
 * resolves to /networks/<slug>. Server-rendered, zero JS.
 */

function DriverChips({ row }: { row: TierARow }) {
  const real = row.sharedDrivers.filter((d) => !d.audit);
  const audit = row.sharedDrivers.filter((d) => d.audit);
  if (real.length === 0 && audit.length === 0) return null;
  return (
    <span className="flex flex-wrap items-center gap-1">
      {real.slice(0, 4).map((d) => (
        <span
          key={d.label}
          title={`${d.label} appears in ${d.entityCount} of ${SHARED_DRIVER_ENTITY_TOTAL} Credit entities' risk tables`}
          className="inline-flex shrink-0 items-center rounded-md border border-electric-500/40 px-1.5 py-0.5 font-mono text-[10px] text-electric-400"
        >
          {d.label}
        </span>
      ))}
      {audit.length > 0 && (
        <span
          title={`Shared audit/bounty firms (weaker signal than a shared oracle or issuer): ${audit.map((d) => d.label).join(", ")}`}
          className="inline-flex shrink-0 items-center rounded-md border border-ink-700/60 px-1.5 py-0.5 font-mono text-[10px] text-ink-300"
        >
          {audit.length} shared audit firm{audit.length > 1 ? "s" : ""}
        </span>
      )}
    </span>
  );
}

function TierARowItem({ row }: { row: TierARow }) {
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/networks/${row.slug}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-ink-100 transition hover:text-electric-300"
          >
            {row.name}
            <ArrowUpRight className="h-3 w-3" aria-hidden />
          </a>
          {row.tag && <Badge className="text-[10px]">{row.tag}</Badge>}
          {row.entityType === "risk-curator" && (
            <Badge tone="electric" className="text-[10px]">
              Risk curator
            </Badge>
          )}
          {row.nonSteadyStateLabel && (
            <Badge tone="warning" className="text-[10px]">
              {row.nonSteadyStateLabel}
            </Badge>
          )}
          {row.sharedParentLabel && (
            <Badge tone="neon" className="text-[10px]">
              {row.sharedParentLabel}
            </Badge>
          )}
          {row.alsoPartner && (
            <Badge tone="positive" className="text-[10px]" title="Simultaneously a partner and a competitor">
              Also a partner
            </Badge>
          )}
          {row.tagFit === "partial" && (
            <Badge tone="warning" className="text-[10px]" title="Provisional tag fit (dataset flag)">
              Provisional tag
            </Badge>
          )}
          {row.direct && !row.sharedParentLabel && (
            <span className="font-mono text-[10px] uppercase text-ink-400">direct</span>
          )}
        </div>
        {row.tagline && <p className="text-xs leading-relaxed text-ink-300">{row.tagline}</p>}
        {row.dataQualityFlags.map((flag) => (
          <p key={flag} className="text-[11px] leading-relaxed text-amber-200/80">
            {flag}
          </p>
        ))}
        <DriverChips row={row} />
      </div>
      <div className="shrink-0 space-y-0.5 text-right font-mono text-xs text-ink-200 sm:min-w-[150px]">
        <p>
          TVL {row.tvlUsd != null ? formatUsdCompact(row.tvlUsd) : "-"}
          {row.tvlSource === "live" && <span className="ml-1 text-[9px] uppercase text-emerald-300">live</span>}
        </p>
        <p className="text-ink-300">
          Borrowed {row.totalBorrowedUsd != null ? formatUsdCompact(row.totalBorrowedUsd) : "-"}
        </p>
        <p className="text-ink-300">
          {row.chainCount != null ? `${row.chainCount} chain${row.chainCount === 1 ? "" : "s"}` : "-"}
        </p>
        {row.asOf && <p className="text-[9px] uppercase text-ink-300">as of {row.asOf}</p>}
      </div>
    </li>
  );
}

function Group({ title, note, rows }: { title: string; note?: string; rows: TierARow[] }) {
  if (rows.length === 0) return null;
  return (
    <Card className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink-100">{title}</h3>
        <span className="font-mono text-[10px] uppercase text-ink-400">{rows.length}</span>
      </div>
      {note && <p className="text-xs leading-relaxed text-ink-400">{note}</p>}
      <ul className="divide-y divide-ink-800/70">
        {rows.map((row) => (
          <TierARowItem key={row.slug} row={row} />
        ))}
      </ul>
    </Card>
  );
}

export function TierAList({
  sameTag,
  otherCredit,
  adjacent,
  tagLabel,
}: {
  sameTag: TierARow[];
  otherCredit: TierARow[];
  adjacent: TierARow[];
  tagLabel: string | null;
}) {
  return (
    <div className="space-y-4">
      <Group
        title={tagLabel ? `${tagLabel} peers` : "Credit peers"}
        note="The full on-platform tag cohort. Rows marked direct carry a curated competitor relationship; borrowed can exceed TVL where DefiLlama nets borrowed collateral out of supplied."
        rows={sameTag}
      />
      <Group
        title="Other Credit peers"
        note="Curated competitor relationships across Credit tags."
        rows={otherCredit}
      />
      <Group
        title="Adjacent sectors"
        note="On-platform competitors whose primary sector is outside Credit."
        rows={adjacent}
      />
    </div>
  );
}
