"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface ResearchVerdict {
  agentId: string;
  asset: string;
  kind: "stablecoin" | "yield";
  signal: string;
  severity: "low" | "medium" | "high";
  confidence: number;
  rationale: string;
  ts: string;
}

interface VerdictFeedProps {
  agentId: string;
}

const SEVERITY_TONE: Record<ResearchVerdict["severity"], "positive" | "warning" | "danger"> = {
  low: "positive",
  medium: "warning",
  high: "danger",
};

function SeverityIcon({ severity }: { severity: ResearchVerdict["severity"] }) {
  if (severity === "high") return <AlertTriangle className="h-4 w-4 text-signal-400" />;
  if (severity === "medium") return <TrendingDown className="h-4 w-4 text-ink-300" />;
  return <TrendingUp className="h-4 w-4 text-electric-400" />;
}

function formatTs(ts: string): string {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

export function VerdictFeed({ agentId }: VerdictFeedProps) {
  const [verdicts, setVerdicts] = useState<ResearchVerdict[]>([]);
  const [combined, setCombined] = useState<ResearchVerdict | null>(null);
  const [asset, setAsset] = useState<string | null>(null);
  const [kind, setKind] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/agent/${encodeURIComponent(agentId)}/verdicts`);
      const data = (await res.json()) as {
        ok?: boolean;
        verdicts?: ResearchVerdict[];
        combined?: ResearchVerdict | null;
        asset?: string | null;
        kind?: string | null;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not load verdicts.");
        return;
      }
      setVerdicts(data.verdicts ?? []);
      setCombined(data.combined ?? null);
      setAsset(data.asset ?? null);
      setKind(data.kind ?? null);
    } catch {
      setError("Network error loading verdicts.");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function refreshNow() {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`/api/agent/${encodeURIComponent(agentId)}/verdicts`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        verdict?: ResearchVerdict;
        combined?: ResearchVerdict | null;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Refresh failed.");
        return;
      }
      if (data.verdict) {
        setVerdicts((prev) => [data.verdict!, ...prev.filter((v) => v.ts !== data.verdict!.ts)].slice(0, 50));
      }
      if (data.combined) setCombined(data.combined);
    } catch {
      setError("Network error during refresh.");
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="glass flex items-center gap-2 rounded-2xl border border-ink-700/60 p-5 text-sm text-ink-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading research verdicts…
      </div>
    );
  }

  const latest = verdicts[0];

  return (
    <div
      id="panel-verdicts"
      className="glass scroll-mt-32 space-y-4 rounded-2xl border border-ink-700/60 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink-50">Research verdicts</h2>
          <p className="mt-1 text-xs text-ink-400">
            Read-only analysis on Arbitrum Sepolia testnet · runs daily
            {asset ? ` · ${asset}` : ""}
            {kind ? ` · ${kind} agent` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshNow()}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-1.5 text-xs font-medium text-electric-300 transition-colors hover:bg-electric-500/20 disabled:opacity-50"
        >
          {refreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh now
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-signal-500/30 bg-signal-500/10 px-3 py-2 text-xs text-signal-300">
          {error}
        </p>
      )}

      {latest ? (
        <div className="rounded-xl border border-ink-700/80 bg-ink-900/50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityIcon severity={latest.severity} />
            <span className="font-mono text-sm font-medium text-ink-100">{latest.signal}</span>
            <Badge tone={SEVERITY_TONE[latest.severity]}>{latest.severity}</Badge>
            <span className="text-xs text-ink-500">
              {(latest.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-200">{latest.rationale}</p>
          <p className="mt-2 font-mono text-[10px] text-ink-500">{formatTs(latest.ts)}</p>
        </div>
      ) : (
        <p className="text-sm text-ink-400">No verdicts yet. Hit Refresh now to run a pass.</p>
      )}

      {combined && (
        <div className="rounded-xl border border-neon-500/25 bg-neon-500/5 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-neon-400">
            Combined with paired agent
          </p>
          <p className="mt-1 font-mono text-xs text-ink-200">{combined.signal}</p>
          <p className="mt-1 text-xs text-ink-400">{combined.rationale}</p>
        </div>
      )}

      {verdicts.length > 1 && (
        <div className="space-y-2 border-t border-ink-800 pt-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-ink-500">History</p>
          <ul className="max-h-48 space-y-2 overflow-y-auto">
            {verdicts.slice(1, 8).map((v) => (
              <li
                key={v.ts}
                className={cn(
                  "rounded-lg border border-ink-800/80 px-3 py-2 text-xs",
                  v.severity === "high" && "border-signal-500/20",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-ink-200">{v.signal}</span>
                  <Badge tone={SEVERITY_TONE[v.severity]}>{v.severity}</Badge>
                  <span className="text-ink-500">{formatTs(v.ts)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-ink-400">{v.rationale}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
