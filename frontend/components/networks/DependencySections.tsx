import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { IncidentEvent, NetworkDependency, RiskSeverity } from "@/lib/types";
import { cn } from "@/lib/utils";

const SEVERITY_DOT: Record<RiskSeverity, string> = {
  high: "bg-rose-400",
  medium: "bg-amber-300",
  low: "bg-ink-400",
};

const SEVERITY_TONE = {
  high: "danger",
  medium: "warning",
  low: "neutral",
} as const;

/** "collateral-issuer" -> "Collateral issuer" (kind/via are free strings). */
function humanizeKind(kind: string): string {
  const words = kind.replace(/[-_]/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function SeverityDot({ severity }: { severity?: RiskSeverity }) {
  if (!severity) return null;
  return (
    <span
      title={`${severity} severity`}
      className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", SEVERITY_DOT[severity])}
    />
  );
}

function CoinChips({ coins }: { coins?: string[] }) {
  if (!coins?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {coins.map((symbol) => (
        <span
          key={symbol}
          className="rounded-md border border-ink-700/80 bg-ink-900/60 px-1.5 py-0.5 font-mono text-[11px] text-ink-200"
        >
          {symbol}
        </span>
      ))}
    </div>
  );
}

export function DependenciesSection({
  dependencies,
}: {
  dependencies?: NetworkDependency[];
}) {
  if (!dependencies?.length) return null;
  const byKind = new Map<string, NetworkDependency[]>();
  for (const dep of dependencies) {
    const group = byKind.get(dep.kind) ?? [];
    group.push(dep);
    byKind.set(dep.kind, group);
  }
  return (
    <section id="dependencies" className="scroll-mt-24 space-y-4">
      <div className="space-y-1 border-b border-ink-800/60 pb-2">
        <h2 className="font-display text-lg font-semibold tracking-tight text-ink-50">
          Dependencies
        </h2>
        <p className="text-sm text-ink-300">
          External protocols and infrastructure this network relies on.
        </p>
      </div>
      <div className="space-y-5">
        {[...byKind.entries()].map(([kind, deps]) => (
          <div key={kind} className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-ink-400">
              {humanizeKind(kind)}
            </p>
            <div className="space-y-2">
              {deps.map((dep) => (
                <Card key={dep.name} className="flex items-start gap-3 p-4">
                  <SeverityDot severity={dep.severity} />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {dep.slug ? (
                        <Link
                          href={`/networks/${dep.slug}`}
                          className="text-sm font-medium text-electric-400 hover:underline"
                        >
                          {dep.name}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-ink-100">{dep.name}</p>
                      )}
                      {dep.link && (
                        <a
                          href={dep.link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-xs text-ink-400 hover:text-ink-200"
                        >
                          Source
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-ink-300">{dep.description}</p>
                    <CoinChips coins={dep.coins} />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ContagionHistorySection({ incidents }: { incidents?: IncidentEvent[] }) {
  if (!incidents?.length) return null;
  const sorted = [...incidents].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <section id="contagion-history" className="scroll-mt-24 space-y-4">
      <div className="space-y-1 border-b border-ink-800/60 pb-2">
        <h2 className="font-display text-lg font-semibold tracking-tight text-ink-50">
          Contagion history
        </h2>
        <p className="text-sm text-ink-300">
          Past incidents and how they transmitted to this network.
        </p>
      </div>
      <div className="space-y-3">
        {sorted.map((incident) => (
          <Card key={`${incident.date}-${incident.title}`} className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-ink-400">{incident.date}</span>
              <p className="text-sm font-medium text-ink-100">{incident.title}</p>
              {incident.severity && (
                <Badge tone={SEVERITY_TONE[incident.severity]} className="capitalize">
                  {incident.severity}
                </Badge>
              )}
            </div>
            <p className="text-sm leading-relaxed text-ink-300">{incident.description}</p>
            <div className="flex flex-wrap items-center gap-2">
              {incident.via && (
                <span className="text-xs text-ink-400">
                  via <span className="text-ink-200">{incident.via}</span>
                </span>
              )}
              <CoinChips coins={incident.affectedCoins} />
              {incident.link && (
                <a
                  href={incident.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 text-xs text-ink-400 hover:text-ink-200"
                >
                  Source
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
