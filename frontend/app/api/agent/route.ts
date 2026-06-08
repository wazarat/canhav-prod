import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { NextResponse } from "next/server";

import { agentModel, hasOpenAI } from "@/lib/agent/config";
import { appendRun, getMemory, getStudiedSkills, type AgentToolCall } from "@/lib/agent/memory";
import { buildAgentTools } from "@/lib/agent/tools";

/**
 * The CanHav research agent loop.
 *
 * A streaming OpenAI agent that may take up to 8 tool steps per turn, reasoning
 * only over CanHav's own data via the tools in lib/agent/tools.ts. It is primed
 * with the agent's durable memory + studied skills, and on finish it records the
 * run (question, tool steps, answer, learned facts) so the agent visibly grows.
 *
 * Returns 503 { configured: false } when OPENAI_API_KEY is unset — the chat UI
 * shows a clean "not configured" banner and everything else keeps working.
 */

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const DEMO_AGENT_ID = "sandbox";

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
  if (!hasOpenAI()) {
    return NextResponse.json(
      { configured: false, error: "OPENAI_API_KEY not set." },
      { status: 503 },
    );
  }

  let body: { messages?: UIMessage[]; agentId?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const messages = body.messages ?? [];
  const agentId = typeof body.agentId === "string" && body.agentId ? body.agentId : DEMO_AGENT_ID;

  const [memory, studied] = await Promise.all([getMemory(agentId), getStudiedSkills(agentId)]);
  const memoryBlock = memory.length ? memory.map((f) => `- ${f.text}`).join("\n") : "(nothing yet)";
  const studiedBlock = studied.length ? studied.join(", ") : "(none yet)";
  const system = `${SYSTEM_PROMPT}\n\n--- Durable memory (what you already learned) ---\n${memoryBlock}\n\nSkills studied: ${studiedBlock}`;

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: openai(agentModel()),
    system,
    messages: modelMessages,
    tools: buildAgentTools(agentId),
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
      } catch {
        // run logging is best-effort; never fail the response over it
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
