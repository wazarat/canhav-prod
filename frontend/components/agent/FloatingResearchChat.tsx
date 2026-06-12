"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Bot, Loader2, MessageCircle, X } from "lucide-react";
import type { UIMessage } from "ai";

import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { AgentChat } from "./AgentChat";
import {
  AGENT_CACHE_KEY,
  OPEN_STATE_KEY,
  REFRESH_EVENT,
} from "./research-chat-context";

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

interface AgentCache {
  agentId: string;
  agentName: string;
  onChain: boolean;
}

function readAgentCache(): AgentCache | null {
  try {
    const raw = sessionStorage.getItem(AGENT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AgentCache;
    if (!parsed.agentId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeAgentCache(cache: AgentCache): void {
  try {
    sessionStorage.setItem(AGENT_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Best-effort only.
  }
}

/**
 * The floating research chatbot for data pages (entities / stablecoins / RWAs /
 * tokens, list + detail). A bottom-right launcher expands into a chat panel
 * wrapping the same AgentChat + /api/agent stack used everywhere else.
 *
 * Mounted once via {@link ResearchChatProvider}; pages set entity context via
 * {@link ResearchChatScope}.
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
  refreshToken = 0,
}: {
  entitySlug?: string | null;
  entityName?: string;
  llmConfigured: boolean;
  refreshToken?: number;
}) {
  const cached = readAgentCache();
  const [phase, setPhase] = useState<"loading" | "hidden" | "ready">(
    cached ? "ready" : "loading",
  );
  const [open, setOpen] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(cached?.agentId ?? null);
  const [agentName, setAgentName] = useState<string>(cached?.agentName ?? "Research agent");
  const [onChain, setOnChain] = useState(cached?.onChain ?? false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const chatKeyRef = useRef(0);
  const prevAgentIdRef = useRef<string | null>(cached?.agentId ?? null);
  const conversationForRef = useRef<string | null>(null);

  // Remember open/closed across page navigations within the session.
  useEffect(() => {
    try {
      setOpen(sessionStorage.getItem(OPEN_STATE_KEY) === "1");
    } catch {
      // Storage unavailable — stay closed.
    }
  }, []);

  // External refresh (e.g. post-mint) opens the panel and re-resolves agent.
  useEffect(() => {
    function onRefresh() {
      try {
        setOpen(sessionStorage.getItem(OPEN_STATE_KEY) === "1");
      } catch {
        setOpen(true);
      }
    }
    window.addEventListener(REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(REFRESH_EVENT, onRefresh);
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
    if (!readAgentCache()?.agentId) {
      setPhase("loading");
    }

    (async () => {
      try {
        let resolvedId: string | null = null;
        let resolvedName: string | null = null;
        let resolvedOnChain = false;

        if (entitySlug) {
          const res = await fetch(`/api/agent/for-entity?slug=${encodeURIComponent(entitySlug)}`);
          if (res.ok) {
            const data = (await res.json()) as ForEntityResponse;
            if (!data.authenticated) {
              if (active) {
                setPhase("hidden");
                setAgentId(null);
              }
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
            if (active) {
              setPhase("hidden");
              setAgentId(null);
            }
            return;
          }
          const data = (await res.json()) as MeResponse;
          if (!data.authenticated || !data.agentId) {
            if (active) {
              setPhase("hidden");
              setAgentId(null);
            }
            return;
          }
          resolvedId = data.agentId;
          resolvedName = data.agentName ?? null;
        }

        if (!active) return;

        const agentChanged = resolvedId !== prevAgentIdRef.current;
        const needsConversation = agentChanged || conversationForRef.current !== resolvedId;

        setAgentId(resolvedId);
        setAgentName(resolvedName ?? "Research agent");
        setOnChain(resolvedOnChain);
        writeAgentCache({
          agentId: resolvedId,
          agentName: resolvedName ?? "Research agent",
          onChain: resolvedOnChain,
        });

        if (needsConversation) {
          conversationForRef.current = resolvedId;
          if (agentChanged) {
            prevAgentIdRef.current = resolvedId;
            setConversationId(null);
            setInitialMessages([]);
            chatKeyRef.current += 1;
          }

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
        }

        if (active) setPhase("ready");
      } catch {
        if (active && !readAgentCache()?.agentId) {
          setPhase("hidden");
          setAgentId(null);
        } else if (active) {
          setPhase("ready");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [entitySlug, entityName, refreshToken]);

  if (phase === "hidden" || (!agentId && phase !== "loading")) return null;

  const loading = phase === "loading" && !agentId;
  const showLauncher = !open;

  return (
    <>
      {showLauncher && (
        <button
          type="button"
          onClick={() => !loading && toggleOpen(true)}
          disabled={loading}
          aria-label="Open research chat"
          className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-electric-500/40 bg-ink-900/95 text-electric-300 shadow-lg shadow-ink-950/50 backdrop-blur transition-all hover:scale-105 hover:bg-ink-900 hover:text-electric-200 disabled:opacity-80"
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <MessageCircle className="h-6 w-6" />
          )}
        </button>
      )}

      <div
        className={cn(
          "fixed z-40 transition-all duration-200",
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
            {phase === "loading" && agentId && (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-ink-400" />
            )}
            <span className="ml-auto flex shrink-0 items-center gap-1">
              {agentId && (
                <Link
                  href={`/agents/${encodeURIComponent(agentId)}`}
                  aria-label="Open agent page"
                  className="rounded-lg p-1.5 text-ink-400 transition-colors hover:text-electric-300"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              )}
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
            {open && agentId && (
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
