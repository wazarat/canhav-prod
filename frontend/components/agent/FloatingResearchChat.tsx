"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Bot, MessageCircle, X } from "lucide-react";
import type { UIMessage } from "ai";

import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { AgentChat } from "./AgentChat";

interface ForEntityResponse {
  authenticated?: boolean;
  agentId?: string | null;
  onChain?: boolean;
  agentName?: string | null;
}

interface MeResponse {
  authenticated?: boolean;
  agentId?: string | null;
  agentName?: string | null;
}

const OPEN_STATE_KEY = "canhav:research-chat-open";

/**
 * The floating research chatbot for data pages (entities / stablecoins / RWAs /
 * tokens, list + detail). A bottom-right launcher expands into a chat panel
 * wrapping the same AgentChat + /api/agent stack used everywhere else.
 *
 * Agent resolution:
 *   - `entitySlug` set and the user minted that entity's agent -> entity agent
 *     (with its most recent conversation resumed, same as the old sidebar dock)
 *   - otherwise -> the signed-in user's default research agent
 *   - signed out -> renders nothing
 */
export function FloatingResearchChat({
  entitySlug = null,
  entityName,
  llmConfigured,
}: {
  entitySlug?: string | null;
  entityName?: string;
  llmConfigured: boolean;
}) {
  const [phase, setPhase] = useState<"loading" | "hidden" | "ready">("loading");
  const [open, setOpen] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string>("Research agent");
  const [onChain, setOnChain] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const chatKeyRef = useRef(0);

  // Remember open/closed across page navigations within the session.
  useEffect(() => {
    try {
      setOpen(sessionStorage.getItem(OPEN_STATE_KEY) === "1");
    } catch {
      // Storage unavailable — stay closed.
    }
  }, []);

  function toggleOpen(next: boolean) {
    setOpen(next);
    try {
      sessionStorage.setItem(OPEN_STATE_KEY, next ? "1" : "0");
    } catch {
      // Best-effort only.
    }
  }

  useEffect(() => {
    let active = true;
    setPhase("loading");

    (async () => {
      try {
        // Prefer the minted entity agent when this page belongs to a project.
        let resolvedId: string | null = null;
        let resolvedName: string | null = null;
        let resolvedOnChain = false;

        if (entitySlug) {
          const res = await fetch(`/api/agent/for-entity?slug=${encodeURIComponent(entitySlug)}`);
          if (res.ok) {
            const data = (await res.json()) as ForEntityResponse;
            if (!data.authenticated) {
              if (active) setPhase("hidden");
              return;
            }
            if (data.agentId && data.onChain) {
              resolvedId = data.agentId;
              resolvedName = data.agentName ?? entityName ?? null;
              resolvedOnChain = true;
            }
          }
        }

        if (!resolvedId) {
          const res = await fetch("/api/agent/me");
          if (!res.ok) {
            if (active) setPhase("hidden");
            return;
          }
          const data = (await res.json()) as MeResponse;
          if (!data.authenticated || !data.agentId) {
            if (active) setPhase("hidden");
            return;
          }
          resolvedId = data.agentId;
          resolvedName = data.agentName ?? null;
        }

        if (!active) return;
        setAgentId(resolvedId);
        setAgentName(resolvedName ?? "Research agent");
        setOnChain(resolvedOnChain);

        // Resume the agent's most recent conversation so the chat is continuous
        // as the user moves between data pages.
        try {
          const convRes = await fetch(
            `/api/agent/conversations?agentId=${encodeURIComponent(resolvedId)}`,
          );
          if (convRes.ok && active) {
            const convData = (await convRes.json()) as { conversations?: { id: string }[] };
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
          // No history yet — start fresh.
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

  if (phase !== "ready" || !agentId) return null;

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          type="button"
          onClick={() => toggleOpen(true)}
          aria-label="Open research chat"
          className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-electric-500/40 bg-ink-900/95 text-electric-300 shadow-lg shadow-ink-950/50 backdrop-blur transition-all hover:scale-105 hover:bg-ink-900 hover:text-electric-200"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Panel */}
      <div
        className={cn(
          "fixed z-40 transition-all duration-200",
          // Full-width sheet on mobile, anchored card on desktop.
          "inset-x-3 bottom-3 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[400px]",
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0",
        )}
      >
        <div className="overflow-hidden rounded-2xl border border-ink-700/80 bg-ink-950/95 shadow-2xl shadow-ink-950/60 backdrop-blur">
          <div className="flex items-center gap-2 border-b border-ink-800/60 bg-ink-900/60 px-4 py-2.5">
            <Bot className="h-4 w-4 shrink-0 text-electric-400" />
            <span className="truncate text-sm font-medium text-ink-100">{agentName}</span>
            {onChain && (
              <Badge tone="neon" className="shrink-0">
                ERC-8004
              </Badge>
            )}
            <span className="ml-auto flex shrink-0 items-center gap-1">
              <Link
                href={`/agents/${encodeURIComponent(agentId)}`}
                aria-label="Open agent page"
                className="rounded-lg p-1.5 text-ink-400 transition-colors hover:text-electric-300"
              >
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => toggleOpen(false)}
                aria-label="Close research chat"
                className="rounded-lg p-1.5 text-ink-400 transition-colors hover:text-ink-100"
              >
                <X className="h-4 w-4" />
              </button>
            </span>
          </div>
          <div className="max-h-[min(70vh,34rem)] overflow-y-auto p-3">
            {open && (
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
        </div>
      </div>
    </>
  );
}
