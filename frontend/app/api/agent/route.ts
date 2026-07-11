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
  listDataFrames,
  type AgentToolCall,
} from "@/lib/agent/memory";
import { listCustomTools } from "@/lib/agent/customTools";
import { userOwnsAgent } from "@/lib/agent/ownership";
import { resolveEntityBinding, type AgentScope } from "@/lib/agent/entity-binding";
import { listKnowledgeDocs } from "@/lib/agent/knowledge";
import { buildSystemPrompt } from "@/lib/agent/prompt";
import { userAgentId } from "@/lib/agent/user-agent";
import { buildAgentTools } from "@/lib/agent/tools";
import { getSession } from "@/lib/auth/session";
import { hasDuneWrite } from "@/lib/server/dune";

/**
 * The CanHav research agent loop.
 *
 * Requires a signed-in session. Persists chat history per user in Upstash.
 */

export const runtime = "nodejs";
// Vercel Hobby (free) plan caps function duration at 60s. Keep it at the ceiling
// so the research loop has the most room; the loop self-aborts a few seconds
// earlier (AGENT_TIME_BUDGET_MS) to flush a partial answer instead of being
// hard-killed by the platform mid-stream.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Stop the agent loop this many ms before the platform's hard kill. */
const AGENT_TIME_BUDGET_MS = (maxDuration - 6) * 1000;

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
      { error: "Sign in to use the research agent." },
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

  const [memory, studied, profile, frames, knowledgeDocs, customTools] = await Promise.all([
    getMemory(agentId),
    getStudiedSkills(agentId),
    getAgentProfile(agentId),
    listDataFrames(agentId),
    listKnowledgeDocs(agentId),
    listCustomTools(agentId),
  ]);

  // Owner sessions unlock the guardrail-update tool. Gated on a stored profile:
  // without one there is no config to merge into (setAgentConfig would no-op).
  const viewerOwnsAgent =
    Boolean(profile) &&
    (await userOwnsAgent(session.userId, agentId, profile?.ownerUserId ?? null));

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

  const system = buildSystemPrompt({
    memory,
    studiedSkills: studied,
    projectBlock,
    config: profile?.config ?? null,
    frames: frames.map((f) => ({ id: f.id, title: f.title, window: f.window })),
    knowledgeDocs: knowledgeDocs.map((d) => ({ title: d.title })),
    customTools: customTools
      .filter((t) => t.enabled)
      .map((t) => ({ name: `custom_${t.id}`, description: t.template.title })),
    dunePublishEnabled: hasDuneWrite() && Boolean(profile?.config?.publishToDune),
    guardrailsToolEnabled: viewerOwnsAgent,
  });

  // `ai@6` throws here if the incoming UIMessage[] from @ai-sdk/react doesn't
  // match the shape it expects. Guard it so a bad history returns a clean 400
  // ("start a new chat") instead of an unhandled 500.
  let modelMessages;
  try {
    modelMessages = await convertToModelMessages(messages);
  } catch (e) {
    console.error("[agent] convertToModelMessages failed:", e);
    return NextResponse.json(
      { error: "Could not read the chat history. Start a new chat." },
      { status: 400 },
    );
  }
  const activeConversationId = conversationId;

  // Time budget: abort a few seconds before the 60s platform limit so the stream
  // ends gracefully (partial answer + run logging) instead of a hard 500. Also
  // aborts if the client disconnects.
  const budget = new AbortController();
  const killTimer = setTimeout(() => budget.abort(), AGENT_TIME_BUDGET_MS);
  budget.signal.addEventListener("abort", () => clearTimeout(killTimer), { once: true });
  if (req.signal.aborted) budget.abort();
  else req.signal.addEventListener("abort", () => budget.abort(), { once: true });

  const result = streamText({
    model: resolveAgentModel(),
    system,
    messages: modelMessages,
    tools: await buildAgentTools(agentId, scope, session.userId, viewerOwnsAgent),
    stopWhen: stepCountIs(8),
    abortSignal: budget.signal,
    onFinish: async (event) => {
      clearTimeout(killTimer);
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
 * Flatten an error into a single searchable string. The AI SDK (`ai@6`) wraps
 * provider failures so the actionable text (e.g. OpenAI `insufficient_quota`) is
 * often NOT on `error.message` but nested under `cause`, `statusCode`,
 * `responseBody`, or `data`. We walk those known fields (bounded depth, cycle
 * guarded) so the classifier below matches the real cause instead of falling
 * through to the generic message.
 */
function collectErrorText(error: unknown): string {
  const seen = new Set<unknown>();
  const parts: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === "string") parts.push(v);
    else if (typeof v === "number" || typeof v === "boolean") parts.push(String(v));
  };
  const walk = (err: unknown, depth: number): void => {
    if (depth > 4 || err == null || seen.has(err)) return;
    if (typeof err !== "object") {
      push(err);
      return;
    }
    seen.add(err);
    const obj = err as Record<string, unknown>;
    push(obj.message);
    push(obj.statusCode);
    push(obj.status);
    push(obj.code);
    push(obj.type);
    push(obj.reason);
    push(obj.name);
    for (const key of ["responseBody", "data", "body", "error", "value"]) {
      const v = obj[key];
      if (typeof v === "string") push(v);
      else if (v && typeof v === "object") walk(v, depth + 1);
    }
    walk(obj.cause, depth + 1);
  };
  walk(error, 0);
  return parts.join(" ");
}

/**
 * Map raw provider stream errors to actionable, user-facing copy. The most
 * common one in this project is OpenAI `insufficient_quota` — surfacing the raw
 * billing JSON in the chat is confusing, so we translate it.
 *
 * Logs the raw error server-side first (the user still sees friendly text); that
 * log line is the actual fault and is what to grep for in Vercel logs. Outside
 * production we also echo the real message into the chat to speed up diagnosis.
 */
function friendlyError(error: unknown): string {
  console.error("[agent] stream error:", error);
  if (error instanceof Error && error.stack) {
    console.error("[agent] stack:", error.stack);
  }

  const message =
    collectErrorText(error) || (error instanceof Error ? error.message : String(error ?? ""));

  // The loop self-aborts ~6s before the 60s Hobby-plan limit (see
  // AGENT_TIME_BUDGET_MS). Surface that as a clear "too long" message rather than
  // the generic fallback so users know to narrow the question.
  if (/\bAbort(ed|Error)?\b|TimeoutError|timed? ?out|operation was aborted/i.test(message)) {
    return "The research took longer than the 60s limit and was stopped early. Try a more specific question (e.g. one entity or metric at a time).";
  }
  if (/insufficient_quota|exceeded your current quota|billing|\b429\b|\b402\b/i.test(message)) {
    return "The research agent's model provider is out of quota. Add credits to your OpenAI key or set AI_GATEWAY_API_KEY to route through the Vercel AI Gateway.";
  }
  if (/api[_ -]?key|unauthorized|invalid_api_key|\b401\b/i.test(message)) {
    return "The research agent's model provider rejected the API key. Check OPENAI_API_KEY / AI_GATEWAY_API_KEY.";
  }
  if (process.env.NODE_ENV !== "production" && message) {
    return `Agent error: ${message}`;
  }
  return "The research agent hit an unexpected error. Please try again.";
}
