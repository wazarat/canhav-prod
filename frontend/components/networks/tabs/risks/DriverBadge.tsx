import type { RiskDriverBadge } from "@/lib/networks/riskTab";

/**
 * Shared-risk-driver chip (M6/M7 dataset cross-tag finding; M9's
 * RelationshipExplorer renders the full graph). Audit firms are a weaker
 * signal and get muted styling.
 */
export function DriverBadge({
  badge,
  total,
}: {
  badge: RiskDriverBadge;
  total: number;
}) {
  return (
    <span
      title={`${badge.label} appears in ${badge.entityCount} of ${total} Credit entities' risk tables${badge.audit ? " (audit/bounty firm; weaker signal than a shared oracle or issuer)" : ""}`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] ${
        badge.audit
          ? "border-ink-700/60 text-ink-300"
          : "border-electric-500/40 text-electric-400"
      }`}
    >
      {badge.label}
      <span className={badge.audit ? "text-ink-300" : "text-electric-400"}>
        {badge.entityCount}/{total}
      </span>
    </span>
  );
}
