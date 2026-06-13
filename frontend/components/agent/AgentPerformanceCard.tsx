import { Activity, ExternalLink, Repeat, TrendingUp, Users } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import type { AgentLedgerStats } from "@/lib/agent/onchain";

/**
 * AgentPerformanceCard — objective, behavior-derived merit for an agent, read
 * from its on-chain AgentLedger. These signals (verified collaborations, credit
 * flow, repeat partners) complement the subjective buyer reputation score; they
 * cannot be self-reported. Plain-language by design — no chain jargon on the
 * primary surface, with a single discreet explorer link for the curious.
 */

/** Format tCNHV base units (18 decimals) to a short human number. */
function formatCredits(base: string): string {
  try {
    const v = BigInt(base);
    const negative = v < 0n;
    const abs = negative ? -v : v;
    const whole = abs / 10n ** 18n;
    const frac = (abs % 10n ** 18n)
      .toString()
      .padStart(18, "0")
      .slice(0, 2)
      .replace(/0+$/, "");
    const out = frac ? `${whole}.${frac}` : `${whole}`;
    return negative ? `-${out}` : out;
  } catch {
    return "0";
  }
}

function lastActiveLabel(unix: number): string {
  if (!unix) return "—";
  const secs = Math.floor(Date.now() / 1000) - unix;
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86_400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86_400)}d ago`;
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-ink-800/60 bg-ink-900/30 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-ink-500">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tracking-tight text-ink-50">{value}</p>
    </div>
  );
}

export function AgentPerformanceCard({
  stats,
  explorerUrl,
}: {
  stats: AgentLedgerStats | null;
  explorerUrl?: string | null;
}) {
  return (
    <div className="glass space-y-4 rounded-2xl p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-electric-400" />
          <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
            Track record
          </h3>
        </div>
        {stats && stats.collabCount > 0 && (
          <Badge tone={stats.netProducer ? "positive" : "neutral"}>
            {stats.netProducer ? "Net contributor" : "Active"}
          </Badge>
        )}
      </div>

      {!stats || stats.collabCount === 0 ? (
        <p className="text-sm text-ink-400">
          No verified activity yet. Track record fills in automatically as this agent completes
          collaborations.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
            <Stat
              icon={<Activity className="h-3 w-3" />}
              label="Verified collaborations"
              value={stats.collabCount.toString()}
            />
            <Stat
              icon={<Users className="h-3 w-3" />}
              label="Distinct partners"
              value={stats.uniqueCounterparties.toString()}
            />
            <Stat
              icon={<Repeat className="h-3 w-3" />}
              label="Repeat-partner rate"
              value={`${(stats.repeatRateBps / 100).toFixed(0)}%`}
            />
            <Stat
              icon={<TrendingUp className="h-3 w-3" />}
              label="Avg credits / collab"
              value={formatCredits(stats.earnedPerCollab)}
            />
          </div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-500">
            <span>
              Net credits:{" "}
              <span className={stats.netProducer ? "text-emerald-300" : "text-ink-300"}>
                {formatCredits(stats.netFlow)}
              </span>
            </span>
            <span>Last active {lastActiveLabel(stats.lastActive)}</span>
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-ink-400 transition-colors hover:text-electric-300"
              >
                <ExternalLink className="h-3 w-3" /> View record
              </a>
            )}
          </p>
        </>
      )}
    </div>
  );
}
