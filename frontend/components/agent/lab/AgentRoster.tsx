import Link from "next/link";
import { ArrowRight, Bot } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { agentCategoryLabel } from "@/lib/agent/categories";
import type { AgentProfile } from "@/lib/agent/memory";

export interface AgentRosterGroup {
  key: string;
  label: string;
  slug: string | null;
  agents: AgentProfile[];
}

export interface AgentChainInfo {
  balance: string | null;
  verified: boolean;
}

/**
 * "Your agents" roster grouped by project. Each card links to the agent
 * detail page (default tab: Trade & research).
 */
export function AgentRoster({
  groups,
  agentCount,
  agentChain,
  listedAgentIds,
}: {
  groups: AgentRosterGroup[];
  agentCount: number;
  agentChain: Map<string, AgentChainInfo>;
  listedAgentIds: Set<string>;
}) {
  if (agentCount === 0) return null;

  return (
    <Card id="agents-roster" className="scroll-mt-32 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-800/60 pb-3">
        <div>
          <CardTitle className="text-base">Your agents</CardTitle>
          <CardDescription className="mt-1">
            Open an agent to trade with it, train it, manage its ERC-8004 identity, and enable
            collaboration.
          </CardDescription>
        </div>
        <Badge tone="neutral">{agentCount}</Badge>
      </div>
      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.key} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                {group.label}
              </h3>
              {group.slug && (
                <Link
                  href={`/networks/${group.slug}`}
                  className="text-[10px] font-medium text-electric-400 transition-colors hover:text-electric-300"
                >
                  View project
                </Link>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.agents.map((agent) => (
                <Link
                  key={agent.agentId}
                  href={`/agents/${encodeURIComponent(agent.agentId)}`}
                  className="group card-surface card-lift flex items-start gap-3 rounded-xl border border-ink-800/60 px-4 py-3"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-700/80 bg-ink-900/60 text-electric-400">
                    <Bot className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-ink-100">{agent.name}</p>
                      {agentCategoryLabel(agent.category) && (
                        <Badge tone="signal" className="shrink-0">
                          {agentCategoryLabel(agent.category)}
                        </Badge>
                      )}
                      {listedAgentIds.has(agent.agentId) && (
                        <Badge tone="positive" className="shrink-0">
                          Listed
                        </Badge>
                      )}
                      {agent.onChain && !(agentChain.get(agent.agentId)?.verified ?? false) && (
                        <Badge tone="neutral" className="shrink-0">
                          Legacy
                        </Badge>
                      )}
                    </span>
                    {agent.associatedProducts.length > 0 && (
                      <p className="mt-0.5 truncate text-[11px] text-ink-400">
                        {agent.associatedProducts.map((p) => p.symbol).join(" · ")}
                      </p>
                    )}
                    {agentChain.get(agent.agentId)?.balance != null && (
                      <p className="mt-0.5 text-[11px] font-medium text-neon-400">
                        Funded {agentChain.get(agent.agentId)!.balance} tCNHV
                      </p>
                    )}
                    <p className="mt-0.5 font-mono text-[10px] text-ink-500">
                      agent {agent.agentId}
                      {agent.onChain
                        ? agentChain.get(agent.agentId)?.verified
                          ? " · on-chain"
                          : " · legacy (re-mint)"
                        : " · local"}
                    </p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ink-500 transition-colors group-hover:text-electric-400" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
