"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, Users } from "lucide-react";

import { Badge } from "@/components/ui/Badge";

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

interface CombinedVerdictCardProps {
  entitySlug: string;
  asset: string;
}

const SEVERITY_TONE: Record<ResearchVerdict["severity"], "positive" | "warning" | "danger"> = {
  low: "positive",
  medium: "warning",
  high: "danger",
};

const ENTITY_ASSET: Record<string, string> = {
  ethena: "sUSDe",
  "usd-ai": "sUSDai",
};

export function CombinedVerdictCard({ entitySlug, asset }: CombinedVerdictCardProps) {
  const [combined, setCombined] = useState<ResearchVerdict | null>(null);
  const [agents, setAgents] = useState<{ stablecoin: string | null; yield: string | null } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolvedAsset = asset || ENTITY_ASSET[entitySlug];
    if (!resolvedAsset) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const res = await fetch(
          `/api/agent/combined-verdict?entity=${encodeURIComponent(entitySlug)}`,
        );
        const data = (await res.json()) as {
          ok?: boolean;
          combined?: ResearchVerdict | null;
          agents?: { stablecoin: string | null; yield: string | null };
        };
        if (data.ok) {
          setCombined(data.combined ?? null);
          setAgents(data.agents ?? null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [entitySlug, asset]);

  if (!ENTITY_ASSET[entitySlug] && !asset) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-ink-700/60 bg-ink-900/40 px-4 py-3 text-sm text-ink-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading community agent read…
      </div>
    );
  }

  if (!combined) return null;

  return (
    <div className="glass rounded-2xl border border-neon-500/20 bg-neon-500/5 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Users className="h-4 w-4 text-neon-400" />
        <h3 className="font-display text-sm font-semibold text-ink-50">
          Community agent read · {combined.asset}
        </h3>
        <Badge tone={SEVERITY_TONE[combined.severity]}>{combined.severity}</Badge>
      </div>
      <p className="mt-1 text-[10px] uppercase tracking-wider text-ink-500">
        Stablecoin + yield agents combined (typed verdicts only)
      </p>

      <div className="mt-3 flex items-start gap-2">
        {combined.severity === "high" && (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-signal-400" />
        )}
        <div>
          <p className="font-mono text-sm text-ink-100">{combined.signal}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-300">{combined.rationale}</p>
          <p className="mt-2 text-xs text-ink-500">
            {(combined.confidence * 100).toFixed(0)}% confidence · updated{" "}
            {new Date(combined.ts).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {agents && (agents.stablecoin || agents.yield) && (
        <p className="mt-4 text-xs text-ink-400">
          Sources:{" "}
          {agents.stablecoin && (
            <Link
              href={`/agents/${agents.stablecoin}`}
              className="text-electric-400 hover:text-electric-300"
            >
              stablecoin agent
            </Link>
          )}
          {agents.stablecoin && agents.yield && " + "}
          {agents.yield && (
            <Link
              href={`/agents/${agents.yield}`}
              className="text-electric-400 hover:text-electric-300"
            >
              yield agent
            </Link>
          )}
          {" · "}
          <Link href="/collab" className="text-neon-400 hover:text-neon-300">
            marketplace
          </Link>
        </p>
      )}
    </div>
  );
}
