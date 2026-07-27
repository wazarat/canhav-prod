import { SEVERITY_BAR, SEVERITY_TONE } from "@/components/shared/riskTone";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { RiskScorecardModel } from "@/lib/networks/riskTab";
import type { RiskCategoryScore } from "@/lib/networks/riskScore";
import type { RiskSeverity, TypedRisk } from "@/lib/types";

/**
 * CAN-73 scorecard header (server-rendered, zero JS). The composite renders
 * ONLY with its per-category inputs beside it and the full methodology one
 * disclosure away — the dataset's hard rule. Gauges scale to the entity's own
 * max category score: composites are entity-scoped and never comparable
 * across tags (Morpho's 9/16 technological vs Maple's counterparty/regulatory
 * mix would make any league table a lie).
 */

function maxSeverityOf(score: RiskCategoryScore, risks: TypedRisk[]): RiskSeverity | null {
  let best: RiskSeverity | null = null;
  let bestRank = 0;
  for (const r of risks) {
    if (r.category !== score.category) continue;
    const rank = { critical: 4, high: 3, medium: 2, low: 1 }[r.severity] ?? 0;
    if (rank > bestRank) {
      bestRank = rank;
      best = r.severity;
    }
  }
  return best;
}

function Gauge({
  score,
  max,
  risks,
}: {
  score: RiskCategoryScore;
  max: number;
  risks: TypedRisk[];
}) {
  const severity = maxSeverityOf(score, risks);
  const width = max > 0 ? Math.max((score.weighted / max) * 100, score.weighted > 0 ? 6 : 0) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-300">
          {score.category}
        </p>
        <p className="font-mono text-xs text-ink-100">
          {score.weighted}
          <span className="ml-1 text-[10px] text-ink-300">
            · {score.count} risk{score.count === 1 ? "" : "s"}
            {score.criticalCount > 0 ? ` · ${score.criticalCount} critical` : ""}
          </span>
        </p>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-800/80"
        role="img"
        aria-label={`${score.category}: weighted score ${score.weighted} from ${score.count} risks`}
      >
        <div
          className={`h-full rounded-full ${severity ? SEVERITY_BAR[severity] : "bg-ink-500"}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export function RiskScorecard({
  scorecard,
  risks,
}: {
  scorecard: RiskScorecardModel;
  risks: TypedRisk[];
}) {
  const { composite, totalRisks, criticalCount, categories, regulatory, maxCategoryWeighted } =
    scorecard;
  const allScores = regulatory ? [...categories, regulatory] : categories;

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="font-display text-3xl font-semibold tracking-tight text-ink-50">
          {composite}
        </p>
        <p className="text-sm text-ink-300">
          severity-weighted points across {totalRisks} typed risks
          {criticalCount > 0 ? (
            <>
              {" · "}
              <span className="text-rose-400">{criticalCount} critical</span>
            </>
          ) : (
            " · no critical risks"
          )}
        </p>
        {scorecard.lastReviewed && (
          <span className="font-mono text-xs text-ink-300">
            assessed {scorecard.lastReviewed}
          </span>
        )}
      </div>

      <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {categories.map((score) => (
          <Gauge key={score.category} score={score} max={maxCategoryWeighted} risks={risks} />
        ))}
        {regulatory ? (
          <Gauge score={regulatory} max={maxCategoryWeighted} risks={risks} />
        ) : (
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-300">
                Regulatory
              </p>
              <Badge tone="neutral" className="text-[10px]">
                No rows
              </Badge>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-300">
              No Regulatory risk rows in the dataset: a recorded finding (no fetchable
              regulatory exposure source), not missing data.
            </p>
          </div>
        )}
      </div>

      <details className="group/methodology">
        <summary className="cursor-pointer list-none text-xs text-electric-400 hover:underline [&::-webkit-details-marker]:hidden">
          <span className="group-open/methodology:hidden">How these scores are derived</span>
          <span className="hidden group-open/methodology:inline">Hide methodology</span>
        </summary>
        <div className="mt-3 space-y-3 rounded-xl border border-ink-800/60 bg-ink-950/40 p-3 text-xs leading-relaxed text-ink-300">
          <p>
            Every score is recomputed at render time from the typed risks below; nothing is
            hand-assigned. Each risk contributes its severity weight (
            <span className="font-mono">critical 4 · high 3 · medium 2 · low 1</span>) to its
            category; the headline number is the sum across all categories. Bars scale to this
            entity&apos;s highest category score.{" "}
            <span className="text-ink-200">
              Scores are not comparable across tags
            </span>{" "}
            because a permissionless-market protocol concentrates technological risk while an
            institutional-credit protocol concentrates counterparty and regulatory risk, and a
            single league table would misrepresent both.
          </p>
          <div className="space-y-2">
            {allScores
              .filter((s) => s.count > 0)
              .map((s) => (
                <div key={s.category}>
                  <p className="font-medium uppercase tracking-wider text-ink-400">
                    {s.category}{" "}
                    <span className="font-mono text-[10px] text-ink-300">
                      {s.count} × → {s.weighted}
                    </span>
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {risks
                      .filter((r) => r.category === s.category)
                      .map((r, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Badge
                            tone={SEVERITY_TONE[r.severity]}
                            className="shrink-0 text-[9px] uppercase"
                          >
                            {r.severity}
                          </Badge>
                          <span className="truncate text-ink-300">{r.name ?? r.category}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
          </div>
        </div>
      </details>
    </Card>
  );
}
