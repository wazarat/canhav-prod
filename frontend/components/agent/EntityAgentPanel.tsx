"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Loader2, LogIn, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { LaunchAgentButton } from "@/components/agent/LaunchAgentButton";
import { ENTITY_AGENT_MINTED_EVENT } from "@/components/agent/research-chat-context";

interface ForEntityResponse {
  authenticated?: boolean;
  agentId?: string | null;
  onChain?: boolean;
}

/**
 * The project-page agent creation + status surface. The actual chatbot is the
 * floating {@link FloatingResearchChat} widget (bottom-right); this panel
 * handles the lifecycle:
 *   - signed out                     -> sign in with a social login
 *   - signed in, no agent yet         -> mint ONE ERC-8004 agent for this entity
 *   - signed in, minted agent on-chain -> "agent is live" (chat floats bottom-right)
 *
 * Agent creation lives ONLY here (one per entity); the Agents tab is a roster.
 */
export function EntityAgentPanel({
  entitySlug,
  entityName,
  skill,
  zerodevConfigured,
  llmConfigured,
}: {
  entitySlug: string;
  entityName: string;
  skill: { id: string; title: string };
  zerodevConfigured: boolean;
  llmConfigured: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [onChain, setOnChain] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadAgent() {
      setLoading(true);
      try {
        const res = await fetch(`/api/agent/for-entity?slug=${encodeURIComponent(entitySlug)}`);
        if (!res.ok) return;
        const data = (await res.json()) as ForEntityResponse;
        if (!active) return;
        setAuthenticated(Boolean(data.authenticated));
        setAgentId(data.agentId ?? null);
        setOnChain(Boolean(data.onChain));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAgent();

    function onMinted() {
      loadAgent();
    }
    window.addEventListener(ENTITY_AGENT_MINTED_EVENT, onMinted);

    return () => {
      active = false;
      window.removeEventListener(ENTITY_AGENT_MINTED_EVENT, onMinted);
    };
  }, [entitySlug]);

  const minted = Boolean(agentId && onChain);

  return (
    <section id="agent" className="scroll-mt-24 space-y-4">
      <div className="border-b border-ink-800/60 pb-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-ink-50">
          <Bot className="h-4 w-4 text-electric-400" />
          Research agent
          <Badge tone="neon" className="ml-1">
            ERC-8004
          </Badge>
        </h2>
        <p className="mt-1 text-sm text-ink-300">
          Mint one AI agent for {entityName}, owned by your self-custodial wallet. It gets its own
          on-chain ERC-8004 identity (scannable on Arbiscan) and answers from this entity&apos;s
          stablecoins, tokens, and RWAs — and follows you onto those product pages.
        </p>
      </div>

      <div className="glass space-y-4 rounded-2xl p-6">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-ink-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking for your {entityName} agent…
          </p>
        ) : !authenticated ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-300">
              Sign in with Google or email to create the {entityName} research agent.
            </p>
            <Link
              href="/agents"
              className="inline-flex items-center gap-1.5 rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-2 text-sm font-medium text-electric-300 transition-colors hover:bg-electric-500/20"
            >
              <LogIn className="h-4 w-4" /> Sign in to Agents
            </Link>
          </div>
        ) : minted ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-ink-200">
              <Wallet className="h-4 w-4 text-electric-400" />
              Your {entityName} agent is live on-chain (ERC-8004).
            </div>
            <p className="text-xs text-ink-400">
              Use the floating chat (bottom-right) to talk to your agent — the conversation
              carries over to {entityName}&apos;s stablecoin, RWA, and token pages.
            </p>
            <Link
              href={`/agents/${encodeURIComponent(agentId as string)}`}
              className="group inline-flex items-center gap-1.5 text-xs font-medium text-ink-400 transition-colors hover:text-electric-300"
            >
              Agent settings & memory
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            {!llmConfigured && (
              <p className="text-xs text-amber-300/80">
                Chat needs an LLM provider — set OPENAI_API_KEY or AI_GATEWAY_API_KEY.
              </p>
            )}
          </div>
        ) : (
          <LaunchAgentButton
            skills={[skill]}
            zerodevConfigured={zerodevConfigured}
            entitySlug={entitySlug}
          />
        )}
      </div>
    </section>
  );
}
