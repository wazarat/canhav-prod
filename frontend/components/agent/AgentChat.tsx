"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  AlertTriangle,
  Bot,
  Check,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { AgentActivityFeed, type ActivityStep } from "./AgentActivityFeed";
import { AgentMessageContent } from "./AgentMessageContent";

interface UIPart {
  type: string;
  text?: string;
  state?: string;
  toolCallId?: string;
  output?: { summary?: string };
}

function messageText(message: UIMessage): string {
  return ((message.parts ?? []) as UIPart[])
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("");
}

function extractSteps(messages: UIMessage[]): ActivityStep[] {
  const steps: ActivityStep[] = [];
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    for (const part of (message.parts ?? []) as UIPart[]) {
      if (part.type.startsWith("tool-")) {
        steps.push({
          id: part.toolCallId ?? `${message.id}-${steps.length}`,
          tool: part.type.replace(/^tool-/, ""),
          state: part.state ?? "input-available",
          summary: part.output?.summary,
        });
      }
    }
  }
  return steps;
}

const SUGGESTIONS = [
  "What stablecoins does CanHav track?",
  "Summarize the Jupiter entity and its member coins.",
  "How is JLP's yield generated?",
];

export function AgentChat({
  agentId,
  llmConfigured,
  conversationId: conversationIdProp = null,
  initialMessages = [],
  onConversationChange,
  onMessageComplete,
}: {
  agentId: string;
  llmConfigured: boolean;
  conversationId?: string | null;
  initialMessages?: UIMessage[];
  onConversationChange?: (id: string) => void;
  onMessageComplete?: () => void;
}) {
  const conversationIdRef = useRef<string | null>(conversationIdProp);
  conversationIdRef.current = conversationIdProp;

  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/agent",
        body: () => ({
          agentId,
          conversationId: conversationIdRef.current,
        }),
        fetch: async (input, init) => {
          const res = await fetch(input, init);
          const newId = res.headers.get("X-Conversation-Id");
          if (newId && newId !== conversationIdRef.current) {
            conversationIdRef.current = newId;
            onConversationChange?.(newId);
          }
          return res;
        },
      }),
  );

  const chatOptions = useMemo(
    () => ({
      transport,
      ...(initialMessages.length > 0 ? { messages: initialMessages } : {}),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remount via parent key when conversation changes
    [transport],
  );

  const { messages, sendMessage, status, error } = useChat(chatOptions);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevStatus = useRef(status);

  // Refinement loop: thumbs up/down per assistant message; thumbs-down opens an
  // optional correction box that is stored as durable "owner-correction" memory.
  const [feedbackState, setFeedbackState] = useState<Record<string, "up" | "down" | "saved">>({});
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [correctionText, setCorrectionText] = useState("");

  /** The user question that preceded an assistant message (for correction context). */
  function questionFor(messageId: string): string {
    const list = messages as UIMessage[];
    const idx = list.findIndex((m) => m.id === messageId);
    for (let i = idx - 1; i >= 0; i--) {
      if (list[i].role === "user") return messageText(list[i]);
    }
    return "";
  }

  async function sendFeedback(messageId: string, verdict: "up" | "down", correction?: string) {
    setFeedbackState((s) => ({ ...s, [messageId]: verdict }));
    try {
      const res = await fetch(`/api/agent/${encodeURIComponent(agentId)}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verdict,
          correction: correction || undefined,
          question: questionFor(messageId) || undefined,
        }),
      });
      if (res.ok && correction) {
        setFeedbackState((s) => ({ ...s, [messageId]: "saved" }));
      }
    } catch {
      // Feedback is best-effort; never disrupt the chat.
    }
  }

  const busy = status === "submitted" || status === "streaming";
  const steps = useMemo(() => extractSteps(messages as UIMessage[]), [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (prevStatus.current !== "ready" && status === "ready" && messages.length > 0) {
      onMessageComplete?.();
    }
    prevStatus.current = status;
  }, [status, messages.length, onMessageComplete]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    void sendMessage({ text: trimmed });
  }

  if (!llmConfigured) {
    return (
      <div className="glass space-y-3 rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-electric-400" />
          <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
            Research chat
          </h3>
          <Badge tone="warning" className="ml-auto">
            <AlertTriangle className="h-3 w-3" /> LLM not configured
          </Badge>
        </div>
        <p className="text-sm text-ink-300">
          Set <code className="font-mono text-ink-100">OPENAI_API_KEY</code> to enable the research
          agent.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="glass flex flex-col rounded-2xl p-6">
        <div className="flex items-center gap-2 border-b border-ink-800/60 pb-3">
          <Bot className="h-4 w-4 text-electric-400" />
          <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
            Research chat
          </h3>
          <Badge tone={busy ? "electric" : "positive"} className="ml-auto">
            {busy ? "thinking…" : "ready"}
          </Badge>
        </div>

        <div
          ref={scrollRef}
          className="my-4 max-h-[24rem] min-h-[10rem] space-y-3 overflow-y-auto pr-1"
        >
          {messages.length === 0 ? (
            <div className="space-y-3 py-4">
              <p className="text-sm text-ink-400">
                Ask about anything CanHav tracks. Chats are saved to your account.
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => submit(s)}
                    className="rounded-full border border-ink-700 bg-ink-900/60 px-3 py-1 text-xs text-ink-200 transition-colors hover:border-electric-500/40 hover:text-ink-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            (messages as UIMessage[]).map((m) => {
              const text = messageText(m);
              const isUser = m.role === "user";
              const verdict = feedbackState[m.id];
              const showFeedback = !isUser && Boolean(text) && !busy;
              return (
                <div
                  key={m.id}
                  className={cn("flex gap-2.5", isUser ? "justify-end" : "justify-start")}
                >
                  {!isUser && (
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-ink-700/80 bg-ink-900/60 text-electric-400">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <div
                    className={cn(
                      "min-w-0 space-y-1",
                      isUser ? "flex max-w-[80%] flex-col items-end" : "max-w-[92%] flex-1",
                    )}
                  >
                    {/* No whitespace-pre-wrap on assistant bubbles: markdown owns
                        the layout, and pre-wrap doubles every blank line the LLM
                        emits between blocks. User text keeps it (plain text). */}
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                        isUser
                          ? "whitespace-pre-wrap bg-electric-500/15 text-ink-50"
                          : "border border-ink-800/60 bg-ink-900/40 text-ink-100",
                      )}
                    >
                      {text ? (
                        <AgentMessageContent role={m.role} text={text} />
                      ) : m.role === "assistant" && busy ? (
                        "…"
                      ) : null}
                    </div>
                    {showFeedback && (
                      <div className="flex items-center gap-2 pl-1">
                        {verdict === "saved" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-signal-300">
                            <Check className="h-3 w-3" /> Correction saved — the agent will
                            remember.
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              aria-label="Good answer"
                              onClick={() => sendFeedback(m.id, "up")}
                              disabled={Boolean(verdict)}
                              className={cn(
                                "transition-colors disabled:opacity-60",
                                verdict === "up"
                                  ? "text-signal-300"
                                  : "text-ink-500 hover:text-signal-300",
                              )}
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label="Bad answer — correct it"
                              onClick={() => {
                                setFeedbackState((s) => ({ ...s, [m.id]: "down" }));
                                setCorrectingId(m.id);
                                setCorrectionText("");
                              }}
                              className={cn(
                                "transition-colors",
                                verdict === "down"
                                  ? "text-rose-300"
                                  : "text-ink-500 hover:text-rose-300",
                              )}
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    {correctingId === m.id && verdict !== "saved" && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!correctionText.trim()) return;
                          void sendFeedback(m.id, "down", correctionText.trim());
                          setCorrectingId(null);
                        }}
                        className="flex w-full items-center gap-1.5"
                      >
                        <input
                          value={correctionText}
                          onChange={(e) => setCorrectionText(e.target.value.slice(0, 400))}
                          placeholder="What should it have said?"
                          autoFocus
                          className="min-w-0 flex-1 rounded-lg border border-ink-700 bg-ink-900/60 px-2.5 py-1.5 text-xs text-ink-100 outline-none focus:border-electric-500/60"
                        />
                        <button
                          type="submit"
                          disabled={!correctionText.trim()}
                          className="shrink-0 rounded-lg border border-electric-500/40 bg-electric-500/10 px-2 py-1.5 text-[11px] font-medium text-electric-300 transition-colors hover:bg-electric-500/20 disabled:opacity-50"
                        >
                          Teach
                        </button>
                      </form>
                    )}
                  </div>
                  {isUser && (
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-ink-700/80 bg-ink-900/60 text-ink-300">
                      <User className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {error && (
          <p className="mb-2 text-xs text-rose-300">
            {error.message || "Something went wrong."}
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="flex items-center gap-2 border-t border-ink-800/60 pt-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the research agent…"
            className="flex-1 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 outline-none focus:border-electric-500/60"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-2 text-sm font-medium text-electric-300 transition-colors hover:bg-electric-500/20 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" /> Send
          </button>
        </form>
      </div>

      <AgentActivityFeed steps={steps} />
    </div>
  );
}
