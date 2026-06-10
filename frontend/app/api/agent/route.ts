import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { NextResponse } from "next/server";

import { hasLLM, resolveAgentModel } from "@/lib/agent/config";
import {
  createConversation,
  saveConversationMessages,
} from "@/lib/agent/conversations";
import {
  appendRun,
  getAgentProfile,
  getMemory,
  getStudiedSkills,
  type AgentToolCall,
} from "@/lib/agent/memory";
import { resolveEntityBinding, type AgentScope } from "@/lib/agent/entity-binding";
import { userAgentId } from "@/lib/agent/user-agent";
import { buildAgentTools } from "@/lib/agent/tools";
import { getSession } from "@/lib/auth/session";

/**
 * The CanHav research agent loop.
 *
 * Requires passkey session. Persists chat history per user in Upstash.
 */

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are the CanHav research agent — a financial-intelligence analyst for the Arbitrum ecosystem.

Rules:
- Answer ONLY from CanHav's own data, fetched through your tools. Never invent numbers, addresses, or facts.
- If a tool returns nothing (e.g. no profile, or "Dune query not configured"), say so plainly instead of guessing.
- Be precise about taxonomy: clearly distinguish stablecoins (peg-targeting), yield/LST tokens, governance/utility tokens, and RWAs (tokenized off-chain assets).
- You are research-only. You never trade, transact, or give financial advice — you summarize what CanHav tracks.
- When you learn a durable, reusable fact about a protocol, call memory_remember so you retain it across sessions. Recall with memory_recall when helpful.
- Prefer concrete tool calls over speculation. Cite the protocol/slug you read. Keep answers tight and skimmable.
- All on-chain activity is Arbitrum Sepolia testnet.`;

interface MinimalToolResult {
  toolName: string;
  input?: unknown;
  output?: { summary?: string } | unknown;
}

interface TextPart {
  type: string;
  text?: string;
}

function uiMessageText(message: UIMessage | undefined): string {
  if (!message) return "";
  const parts = (message.parts ?? []) as TextPart[];
  return parts
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join(" ")
    .trim();
}

export async function POST(req: Request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Sign in with your passkey to use the research agent." },
      { status: 401 },
    );
  }

  if (!hasLLM()) {
    return NextResponse.json(
      {
        configured: false,
        error: "No LLM provider configured. Set OPENAI_API_KEY or AI_GATEWAY_API_KEY.",
      },
      { status: 503 },
    );
  }

  let body: { messages?: UIMessage[]; agentId?: string; conversationId?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const messages = body.messages ?? [];
  const agentId =
    typeof body.agentId === "string" && body.agentId
      ? body.agentId
      : userAgentId(session.userId);

  let conversationId =
    typeof body.conversationId === "string" && body.conversationId
      ? body.conversationId
      : null;

  if (!conversationId) {
    const created = await createConversation(session.userId, agentId);
    conversationId = created.id;
  }

  const [memory, studied, profile] = await Promise.all([
    getMemory(agentId),
    getStudiedSkills(agentId),
    getAgentProfile(agentId),
  ]);
  const memoryBlock = memory.length ? memory.map((f) => `- ${f.text}`).join("\n") : "(nothing yet)";
  const studiedBlock = studied.length ? studied.join(", ") : "(none yet)";

  // Bind the agent to its project (Entity) so it defaults to that entity + its
  // member products without the user re-specifying slugs.
  let scope: AgentScope | undefined;
  let projectBlock = "";
  if (profile?.entitySlug) {
    const binding = await resolveEntityBinding(profile.entitySlug);
    if (binding) {
      scope = binding.scope;
      const products =
        binding.associatedProducts
          .map((p) => `${p.symbol} (${p.category}, slug: ${p.slug})`)
          .join("; ") || "none tracked";
      projectBlock = `\n\n--- This agent's project ---\nThis agent lives on the ${binding.entityName} entity. Default to ${binding.entityName} and its member products unless the user explicitly asks about something else.\nMember products: ${products}`;
    }
  }

  const system = `${SYSTEM_PROMPT}\n\n--- Durable memory (what you already learned) ---\n${memoryBlock}\n\nSkills studied: ${studiedBlock}${projectBlock}`;

  const modelMessages = await convertToModelMessages(messages);
  const activeConversationId = conversationId;

  const result = streamText({
    model: resolveAgentModel(),
    system,
    messages: modelMessages,
    tools: buildAgentTools(agentId, scope),
    stopWhen: stepCountIs(8),
    onFinish: async (event) => {
      try {
        const toolCalls: AgentToolCall[] = [];
        for (const step of event.steps) {
          for (const tr of step.toolResults as unknown as MinimalToolResult[]) {
            const output = tr.output as { summary?: string } | undefined;
            toolCalls.push({
              name: tr.toolName,
              args: tr.input,
              summary: output?.summary ?? "",
            });
          }
        }
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        await appendRun(agentId, {
          id: `run_${Date.now().toString(36)}`,
          ts: new Date().toISOString(),
          question: uiMessageText(lastUser),
          toolCalls,
          answer: event.text,
          learned: toolCalls
            .filter((t) => t.name === "memory_remember")
            .map((t) => t.summary)
            .filter(Boolean),
        });
        await saveConversationMessages(
          session.userId,
          activeConversationId,
          messages,
          event.text,
        );
      } catch {
        // run logging is best-effort; never fail the response over it
      }
    },
  });

  const response = result.toUIMessageStreamResponse({ onError: friendlyError });
  response.headers.set("X-Conversation-Id", activeConversationId);
  return response;
}

/**
 * Map raw provider stream errors to actionable, user-facing copy. The most
 * common one in this project is OpenAI `insufficient_quota` — surfacing the raw
 * billing JSON in the chat is confusing, so we translate it.
 */
function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/insufficient_quota|exceeded your current quota|billing|\b429\b|\b402\b/i.test(message)) {
    return "The research agent's model provider is out of quota. Add credits to your OpenAI key or set AI_GATEWAY_API_KEY to route through the Vercel AI Gateway.";
  }
  if (/api key|unauthorized|\b401\b/i.test(message)) {
    return "The research agent's model provider rejected the API key. Check OPENAI_API_KEY / AI_GATEWAY_API_KEY.";
  }
  return "The research agent hit an unexpected error. Please try again.";
}
