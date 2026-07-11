import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { ProposalNotifier } from "@/components/agent/ProposalNotifier";
import { ProposedTradesPanel } from "@/components/agent/ProposedTradesPanel";
import { TradeDesk } from "@/components/agent/trade/TradeDesk";
import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { sanitizeAgentConfig } from "@/lib/agent/agentConfig";
import { getAgentProfile, listTradeProposals, type AgentProfile } from "@/lib/agent/memory";
import { listOwnedAgentIds } from "@/lib/agent/ownership";
import { getTradeCoin } from "@/lib/agent/trade/coins";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata = { title: "Trade" };

function tradeHref(agentId: string, asset?: string) {
  const params = new URLSearchParams({ agent: agentId });
  if (asset) params.set("asset", asset);
  return `/agents/trade?${params.toString()}`;
}

/**
 * Standalone trading surface: the owner picks one of their agents and gets the
 * same research-gated Trade Desk as the agent detail page's trade tab, plus
 * any open proposals. Nested under /agents so PrivyShell and the login gate
 * come from the layout; a `?asset=` param preselects the coin in the form.
 */
export default async function TradePage({
  searchParams,
}: {
  searchParams: { asset?: string; agent?: string };
}) {
  const session = getSession();
  // Signed out: AgentsShell replaces children with the login gate, so this
  // placeholder is never visible. Skip all fetching.
  if (!session) return <div />;

  const ownedIds = await listOwnedAgentIds(session.userId);
  const owned = (await Promise.all(ownedIds.map((id) => getAgentProfile(id)))).filter(
    (p): p is AgentProfile => Boolean(p),
  );
  const agentsById = new Map(owned.map((a) => [a.agentId, a]));
  const agents = [...agentsById.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  // Canonicalize params: unknown assets become undefined, a foreign or unknown
  // ?agent falls back to the most recent agent (ids only come from the owned set).
  const asset = searchParams.asset ? getTradeCoin(searchParams.asset)?.symbol : undefined;
  const agent = agents.find((p) => p.agentId === searchParams.agent) ?? agents[0];

  const cfg = agent ? sanitizeAgentConfig(agent.config ?? {}) : null;
  const openProposals = agent
    ? (await listTradeProposals(agent.agentId, 10)).filter(
        (p) => p.status === "proposed" || p.status === "executed",
      ).length
    : 0;

  return (
    <div className="container space-y-8 py-12">
      <nav className="flex items-center gap-1.5 text-sm text-ink-300">
        <Link href="/" className="transition-colors hover:text-ink-50">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <Link href="/agents" className="transition-colors hover:text-ink-50">
          Agents
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <span className="text-ink-100">Trade</span>
      </nav>

      <header className="space-y-3">
        <span className="kicker">Research-gated trading</span>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink-50">
            Trade <span className="text-gradient-brand">Desk</span>
          </h1>
          <Badge tone="signal">Arbitrum</Badge>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-300">
          Trade perps on GMX through one of your agents. Every trade is research-gated: a coin is
          tradable only while it carries a fresh, positive CanHav verdict. Proposals your agent
          files on its own show up here too.
        </p>
      </header>

      {!agent ? (
        <Card className="space-y-2">
          <CardTitle>You need an agent to trade</CardTitle>
          <CardDescription>
            Trades run through an agent&apos;s smart account. Launch one in the Agent Lab, then
            come back here.
          </CardDescription>
          <Link
            href="/agents#create"
            className="inline-flex w-fit items-center gap-1 rounded-full border border-neon-500/40 bg-neon-500/10 px-4 py-2 text-sm font-medium text-neon-400 transition-colors hover:bg-neon-500/20"
          >
            Launch an agent
          </Link>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {agents.length > 1 &&
              agents.map((a) => (
                <Link
                  key={a.agentId}
                  href={tradeHref(a.agentId, asset)}
                  className={
                    a.agentId === agent.agentId
                      ? "inline-flex items-center whitespace-nowrap rounded-full border border-neon-500/40 bg-neon-500/10 px-3 py-1.5 text-xs font-medium text-neon-400"
                      : "inline-flex items-center whitespace-nowrap rounded-full border border-ink-800/60 px-3 py-1.5 text-xs font-medium text-ink-300 transition-colors hover:bg-ink-800/60 hover:text-ink-50"
                  }
                >
                  {a.name}
                </Link>
              ))}
            <Link
              href={`/agents/${encodeURIComponent(agent.agentId)}?tab=desk`}
              className="inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium text-ink-400 transition-colors hover:text-ink-50"
            >
              Open {agent.name} →
            </Link>
          </div>

          <ProposalNotifier
            agentId={agent.agentId}
            hitlMethod={cfg?.tradeHitlMethod}
            basePath={tradeHref(agent.agentId, asset)}
          />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <ProposedTradesPanel agentId={agent.agentId} />
              {openProposals === 0 && (
                <Card className="space-y-2">
                  <CardTitle>No open proposals</CardTitle>
                  <CardDescription>
                    Proposals your agent files show up here for review. File one yourself from the
                    desk, or ask the agent in its sandbox chat.
                  </CardDescription>
                </Card>
              )}
            </div>
            <div className="space-y-6">
              <TradeDesk
                key={`${agent.agentId}:${asset ?? ""}`}
                agentId={agent.agentId}
                config={agent.config}
                isOwner
                skillId={agent.skillId}
                defaultAsset={asset}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
