"use client";

import { useCallback, useState } from "react";
import type { UIMessage } from "ai";

import { AgentChat } from "./AgentChat";
import { ConversationList } from "./ConversationList";

export function AgentLabPanel({
  agentId,
  llmConfigured,
}: {
  agentId: string;
  llmConfigured: boolean;
}) {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [chatKey, setChatKey] = useState(0);
  const [listRefresh, setListRefresh] = useState(0);

  const startNewChat = useCallback(() => {
    setActiveConversationId(null);
    setInitialMessages([]);
    setChatKey((k) => k + 1);
  }, []);

  const selectConversation = useCallback(async (id: string) => {
    const res = await fetch(`/api/agent/conversations/${encodeURIComponent(id)}`);
    if (!res.ok) return;
    const data = (await res.json()) as { messages?: UIMessage[] };
    setActiveConversationId(id);
    setInitialMessages(data.messages ?? []);
    setChatKey((k) => k + 1);
  }, []);

  const refreshList = useCallback(() => {
    setListRefresh((k) => k + 1);
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,14rem)_1fr]">
      <ConversationList
        activeId={activeConversationId}
        onSelect={selectConversation}
        onNew={startNewChat}
        refreshKey={listRefresh}
      />
      <AgentChat
        key={chatKey}
        agentId={agentId}
        llmConfigured={llmConfigured}
        conversationId={activeConversationId}
        initialMessages={initialMessages}
        onConversationChange={(id) => {
          setActiveConversationId(id);
          refreshList();
        }}
        onMessageComplete={refreshList}
      />
    </div>
  );
}
