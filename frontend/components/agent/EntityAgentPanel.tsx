"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Fingerprint, Loader2, LogIn } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { PasskeySpawnButton } from "@/components/agent/PasskeySpawnButton";

interface ForEntityResponse {
  authenticated?: boolean;
  agentId?: string | null;
}

/**
 * The project-page entry point into the agent. Resolves the logged-in wallet's
 * agent for THIS entity:
 *   - signed out         -> link to /agents to sign in with a passkey
 *   - signed in, has one  -> "Open the {entity} agent" -> /agents/[agentId]
 *   - signed in, no agent -> launch one pre-bound to this project (ERC-8004)
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

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/agent/for-entity?slug=${encodeURIComponent(entitySlug)}`);
        if (!res.ok) return;
        const data = (await res.json()) as ForEntityResponse;
        if (!active) return;
        setAuthenticated(Boolean(data.authenticated));
        setAgentId(data.agentId ?? null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [entitySlug]);

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
          A passkey-owned AI agent that lives on {entityName} and answers from its
          stablecoins, tokens, and RWAs — with its own on-chain ERC-8004 identity.
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
              Sign in with your passkey to launch or open the {entityName} research agent.
            </p>
            <Link
              href="/agents"
              className="inline-flex items-center gap-1.5 rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-2 text-sm font-medium text-electric-300 transition-colors hover:bg-electric-500/20"
            >
              <LogIn className="h-4 w-4" /> Sign in to Agents
            </Link>
          </div>
        ) : agentId ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-ink-200">
              <Fingerprint className="h-4 w-4 text-electric-400" />
              You have an agent for this project.
            </div>
            <Link
              href={`/agents/${encodeURIComponent(agentId)}`}
              className="group inline-flex items-center gap-1.5 rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-2 text-sm font-medium text-electric-300 transition-colors hover:bg-electric-500/20"
            >
              Open the {entityName} agent
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            {!llmConfigured && (
              <p className="text-xs text-amber-300/80">
                Chat needs an LLM provider — set OPENAI_API_KEY or AI_GATEWAY_API_KEY.
              </p>
            )}
          </div>
        ) : (
          <PasskeySpawnButton
            skills={[skill]}
            zerodevConfigured={zerodevConfigured}
            entitySlug={entitySlug}
          />
        )}
      </div>
    </section>
  );
}
