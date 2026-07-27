import { Card } from "@/components/ui/Card";
import type { PercentileRow } from "@/lib/networks/competitorsTab";

/**
 * CAN-87 Koyfin-style percentile rank bars vs the tag cohort. Server-rendered,
 * zero JS. Cohorts are 9-12 entities, so a bare percentile is noisy at the
 * edges: "rank N of M" always renders beside the bar (the honest denominator
 * counts only cohort members reporting the metric). APY rows do not exist by
 * design (no consistent source across the cohort); utilisation is never
 * derived from borrowed/supplied.
 */
export function PercentileBars({
  rows,
  tagLabel,
  cohortSize,
  asOf,
}: {
  rows: PercentileRow[];
  tagLabel: string;
  cohortSize: number;
  asOf: string | null;
}) {
  return (
    <Card className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-ink-100">
          Position in the {tagLabel} cohort
        </h3>
        <p className="text-xs leading-relaxed text-ink-400">
          Percentile rank against the {cohortSize} on-platform {tagLabel} entities
          {asOf ? ` (snapshot as of ${asOf})` : ""}. Supply and borrow APY are omitted: no
          source covers the whole cohort, and a single-market rate would misrepresent a
          protocol-level number.
        </p>
      </div>
      <dl className="space-y-2.5">
        {rows.map((row) => (
          <div key={row.metricId} className="grid grid-cols-[minmax(90px,140px)_1fr] items-center gap-3">
            <dt className="text-xs text-ink-200">
              {row.label}
              {row.note && (
                <span className="mt-0.5 block text-[10px] leading-snug text-ink-400">{row.note}</span>
              )}
            </dt>
            <dd className="space-y-1">
              {row.percentile != null && row.rank != null ? (
                <>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-ink-800/80"
                    role="img"
                    aria-label={`${row.label}: rank ${row.rank} of ${row.of}, ${row.percentile}th percentile`}
                  >
                    <div
                      className="h-full rounded-full bg-electric-500/80"
                      style={{ width: `${Math.max(row.percentile, 3)}%` }}
                    />
                  </div>
                  <p className="font-mono text-[11px] text-ink-300">
                    {row.display} · rank {row.rank} of {row.of}
                    {row.of < row.cohortSize && (
                      <span className="text-ink-400"> reporting (cohort {row.cohortSize})</span>
                    )}
                  </p>
                </>
              ) : (
                <p className="font-mono text-[11px] text-ink-300">
                  - <span className="text-ink-400">{row.placeholderReason ?? "Not available"}</span>
                </p>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
