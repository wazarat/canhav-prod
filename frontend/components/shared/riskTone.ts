import type { BadgeTone } from "@/components/ui/Badge";
import type { RiskSeverity } from "@/lib/types";

/**
 * Single source for risk severity/category presentation (M7 consolidation of
 * four per-file SEVERITY_TONE copies). Severity colors say "how bad";
 * category colors deliberately avoid the severity hues so a Governance dot
 * never reads as "medium severity".
 */

/** Badge tone per severity (identical across all previous copies). */
export const SEVERITY_TONE: Record<RiskSeverity, BadgeTone> = {
  critical: "danger",
  high: "danger",
  medium: "warning",
  low: "neutral",
};

/** Small status-dot fill (DependencySections variant). */
export const SEVERITY_DOT: Record<RiskSeverity, string> = {
  critical: "bg-rose-400",
  high: "bg-rose-400",
  medium: "bg-amber-300",
  low: "bg-ink-400",
};

/** Severity-bar fill (AssetRiskTable variant — four distinct steps). */
export const SEVERITY_BAR: Record<RiskSeverity, string> = {
  critical: "bg-rose-500",
  high: "bg-amber-400",
  medium: "bg-yellow-600/80",
  low: "bg-ink-500",
};

/**
 * Matrix-dot fill per risk category (M7 severity matrix). Non-severity hues:
 * the house electric/neon/signal accents + emerald/fuchsia for the last two.
 */
export const CATEGORY_COLOR: Record<string, string> = {
  Market: "bg-electric-400",
  Technological: "bg-neon-400",
  Counterparty: "bg-signal-400",
  Governance: "bg-emerald-400",
  Regulatory: "bg-fuchsia-400",
};

/** Fallback dot fill for unexpected category strings. */
export const CATEGORY_COLOR_FALLBACK = "bg-ink-300";
