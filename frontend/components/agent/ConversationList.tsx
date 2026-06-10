"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquarePlus, MessagesSquare } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  agentId: string;
}

export function ConversationList({
  activeId,
  onSelect,
  onNew,
  refreshKey,
  agentId,
}: {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  refreshKey?: number;
  /** Scope the chat list to one agent/project. */
  agentId?: string;
}) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = agentId
        ? `/api/agent/conversations?agentId=${encodeURIComponent(agentId)}`
        : "/api/agent/conversations";
      const res = await fetch(url);
      if (!res.ok) return;
      const data = (await res.json()) as { conversations?: ConversationSummary[] };
      setConversations(data.conversations ?? []);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return (
    <div className="glass space-y-3 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2 border-b border-ink-800/60 pb-2">
        <h3 className="flex items-center gap-2 text-sm font-medium text-ink-100">
          <MessagesSquare className="h-4 w-4 text-electric-400" />
          Saved chats
        </h3>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-1 rounded-lg border border-ink-700 px-2 py-1 text-[10px] font-medium text-ink-300 transition-colors hover:border-electric-500/40 hover:text-ink-100"
        >
          <MessageSquarePlus className="h-3 w-3" /> New
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-ink-500">Loading chats…</p>
      ) : conversations.length === 0 ? (
        <p className="text-xs text-ink-500">No saved chats yet. Start a conversation below.</p>
      ) : (
        <ul className="max-h-48 space-y-1 overflow-y-auto">
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-left text-xs transition-colors",
                  activeId === c.id
                    ? "border border-electric-500/30 bg-electric-500/10 text-ink-50"
                    : "text-ink-300 hover:bg-ink-900/60 hover:text-ink-100",
                )}
              >
                <p className="truncate font-medium">{c.title}</p>
                <p className="mt-0.5 font-mono text-[10px] text-ink-500">
                  {new Date(c.updatedAt).toLocaleString()}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
