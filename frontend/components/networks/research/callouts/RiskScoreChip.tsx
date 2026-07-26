import { ShieldAlert } from "lucide-react";
import Link from "next/link";

import { deriveRiskCategoryScores } from "@/lib/networks/riskScore";
import type { NetworkProfile } from "@/lib/types";

/**
 * Per-category weighted risk sub-scores derived live from profile.typedRisks
 * (CAN-63 callout #3), linking to the Risks tab where the full risk list
 * renders. The M6/M7 dataset's scoring rule is deliberate: NEVER a single
 * composite number without the category table behind it — so the chip shows
 * the per-category breakdown itself. Hidden entirely when no typed risks
 * exist (honest absence, not a zero).
 */
export function RiskScoreChip({ profile }: { profile: NetworkProfile }) {
  const scores = deriveRiskCategoryScores(profile.typedRisks);
  if (!scores.length) return null;
  const totalRisks = scores.reduce((s, c) => s + c.count, 0);
  const criticals = scores.reduce((s, c) => s + c.criticalCount, 0);

  return (
    <Link
      href={`/networks/${profile.slug}?tab=risks`}
      className="glass group flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-ink-700/60 px-4 py-3 transition-colors hover:border-ink-600"
    >
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-50">
        <ShieldAlert className="h-4 w-4 text-amber-300" />
        {totalRisks} typed risks
        {criticals > 0 && <span className="text-rose-400">({criticals} critical)</span>}
      </span>
      <span className="flex flex-wrap items-center gap-1.5">
        {scores.map((s) => (
          <span
            key={s.category}
            title={`${s.count} risk(s), severity-weighted ${s.weighted}`}
            className="inline-flex items-center gap-1 rounded-full border border-ink-700/60 bg-ink-900/40 px-2 py-0.5 text-[11px] text-ink-300"
          >
            {s.category}
            <span className="font-mono text-ink-100">{s.weighted}</span>
          </span>
        ))}
      </span>
      <span className="text-xs text-electric-400 group-hover:underline">Open Risks tab</span>
    </Link>
  );
}
