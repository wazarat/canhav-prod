import type { TypedRisk } from "@/lib/types";

/**
 * Severity weights from the M6/M7 risk dataset's own scoring rule
 * (critical 4, high 3, medium 2, low 1). The dataset is explicit that a
 * composite number must never be shown without the per-category table behind
 * it, so consumers (M5 RiskScoreChip, the future M7 scorecard) render the
 * per-category breakdown, not one blended score.
 */
export const RISK_SEVERITY_WEIGHTS: Record<TypedRisk["severity"], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export interface RiskCategoryScore {
  category: string;
  count: number;
  weighted: number;
  criticalCount: number;
}

/**
 * Per-category weighted sub-scores derived from typedRisks at render time.
 * No stored composite: this derivation IS the interface the M7 scorecard
 * consumes. Categories come from the data (Market / Technological /
 * Counterparty / Governance / Regulatory in the M6/M7 dataset), not from the
 * legacy RiskCategory enum. Empty input -> empty output (callers hide).
 */
export function deriveRiskCategoryScores(risks: TypedRisk[] | undefined | null): RiskCategoryScore[] {
  if (!risks?.length) return [];
  const byCategory = new Map<string, RiskCategoryScore>();
  for (const risk of risks) {
    const entry = byCategory.get(risk.category) ?? {
      category: risk.category,
      count: 0,
      weighted: 0,
      criticalCount: 0,
    };
    entry.count += 1;
    entry.weighted += RISK_SEVERITY_WEIGHTS[risk.severity] ?? 0;
    if (risk.severity === "critical") entry.criticalCount += 1;
    byCategory.set(risk.category, entry);
  }
  return [...byCategory.values()].sort((a, b) => b.weighted - a.weighted);
}
