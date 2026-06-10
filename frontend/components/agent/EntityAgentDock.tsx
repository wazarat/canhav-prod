"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Bot, Loader2 } from "lucide-react";
import type { UIMessage } from "ai";

import { Badge } from "@/components/ui/Badge";
import { AgentChat } from "./AgentChat";

interface ForEntityResponse {
  authenticated?: boolean;
  agentId?: string | null;
  onChain?: boolean;
  agentName?: string | null;
}

interface ConversationMetaLite {
  id: string;
}

/**
 * The persistent, right-side chatbot for an Entity's ERC-8004 agent.
 *
 * Mint-gated + signed-in-only: it resolves the wallet's agent for `entitySlug`
 * and renders nothing unless the agent exists AND is minted on-chain. When it
 * does render, it resumes the agent's most recent conversation so the SAME chat
 * carries over as the user navigates between the entity page and its member
 * stablecoin / RWA / token pages.
 */
export function EntityAgentDock({
  entitySlug,
  entityName,
  llmConfigured,
}: {
  entitySlug: string | null | undefined;
  entityName?: string;
  llmConfigured: boolean;
}) {
  const [phase, setPhase] = useState<"loading" | "hidden" | "ready">("loading");
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const chatKeyRef = useRef(0);

  useEffect(() => {
    let active = true;
    if (!entitySlug) {
      setPhase("hidden");
      return;
    }
    setPhase("loading");

    (async () => {
      try {
        const res = await fetch(`/api/agent/for-entity?slug=${encodeURIComponent(entitySlug)}`);
        if (!res.ok) {
          if (active) setPhase("hidden");
          return;
        }
        const data = (await res.json()) as ForEntityResponse;
        // Mint-gated: only show the chatbot for an authenticated wallet whose
        // agent for this project has been minted on-chain.
        if (!active) return;
        if (!data.authenticated || !data.agentId || !data.onChain) {
          setPhase("hidden");
          return;
        }
        setAgentId(data.agentId);
        setAgentName(data.agentName ?? entityName ?? "Research agent");

        // Resume the agent's most recent conversation (newest first) so the chat
        // is continuous across the entity page and its member product pages.
        try {
          const convRes = await fetch(
            `/api/agent/conversations?agentId=${encodeURIComponent(data.agentId)}`,
          );
          if (convRes.ok && active) {
            const convData = (await convRes.json()) as {
              conversations?: ConversationMetaLite[];
            };
            const latest = convData.conversations?.[0];
            if (latest) {
              const msgRes = await fetch(
                `/api/agent/conversations/${encodeURIComponent(latest.id)}`,
              );
              if (msgRes.ok && active) {
                const msgData = (await msgRes.json()) as { messages?: UIMessage[] };
                setConversationId(latest.id);
                setInitialMessages(msgData.messages ?? []);
              }
            }
          }
        } catch {
          // No conversation history yet — start fresh.
        }

        if (active) {
          chatKeyRef.current += 1;
          setPhase("ready");
        }
      } catch {
        if (active) setPhase("hidden");
      }
    })();

    return () => {
      active = false;
    };
  }, [entitySlug, entityName]);

  if (phase === "hidden") return null;

  if (phase === "loading") {
    return (
      <div className="glass flex items-center gap-2 rounded-2xl p-6 text-sm text-ink-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your agent…
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-electric-400" />
          <span className="text-sm font-medium text-ink-100">{agentName}</span>
          <Badge tone="neon">ERC-8004</Badge>
        </div>
        {agentId && (
          <Link
            href={`/agents/${encodeURIComponent(agentId)}`}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-electric-400 transition-colors hover:text-electric-300"
          >
            Open agent
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      {agentId && (
        <AgentChat
          key={chatKeyRef.current}
          agentId={agentId}
          llmConfigured={llmConfigured}
          conversationId={conversationId}
          initialMessages={initialMessages}
          onConversationChange={(id) => setConversationId(id)}
        />
      )}
    </div>
  );
}
