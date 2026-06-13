import "server-only";

import { renderAgentConfigPrompt, type AgentConfig } from "@/lib/agent/agentConfig";
import type { AgentMemoryFact } from "@/lib/agent/memory";

/**
 * Deterministic system-prompt builder for the research agent loop.
 *
 * Layers (in order): base persona → durable memory → owner corrections →
 * project (entity) scope → owner framework config → pinned data frames →
 * uploaded knowledge → custom tools. Every layer is bounded at its source
 * (config sanitizer caps, frame/doc/tool count caps), so the assembled prompt
 * stays predictable. Empty layers render nothing.
 */

export const BASE_SYSTEM_PROMPT = `You are the CanHav research agent — a financial-intelligence analyst for the Arbitrum ecosystem.

Rules:
- Answer ONLY from CanHav's own data, fetched through your tools. Never invent numbers, addresses, or facts.
- If a tool returns nothing (e.g. no profile, or "Dune query not configured"), say so plainly instead of guessing.
- Be precise about taxonomy: clearly distinguish stablecoins (peg-targeting), yield/LST tokens, governance/utility tokens, and RWAs (tokenized off-chain assets).
- You are research-only. You never trade, transact, or give financial advice — you summarize what CanHav tracks.
- When you learn a durable, reusable fact about a protocol, call memory_remember so you retain it across sessions. Recall with memory_recall when helpful.
- Prefer concrete tool calls over speculation. Cite the protocol/slug you read. Keep answers tight and skimmable.
- Use markdown (bold, bullet lists, links) for structure; avoid deep heading stacks.
- All on-chain activity is Arbitrum Sepolia testnet.`;

/** Max owner corrections surfaced in the prompt (newest first). */
const MAX_CORRECTIONS = 8;

export interface PromptFrameRef {
  id: string;
  title: string;
  window: string;
}

export interface PromptKnowledgeDocRef {
  title: string;
}

export interface PromptCustomToolRef {
  name: string;
  description: string;
}

/** Memory facts written by the owner-feedback loop carry this source tag. */
export const OWNER_CORRECTION_SOURCE = "owner-correction";

export interface SystemPromptInput {
  memory: AgentMemoryFact[];
  studiedSkills: string[];
  /** Pre-rendered "--- This agent's project ---" block (entity binding). */
  projectBlock?: string;
  config?: AgentConfig | null;
  /** Pinned data frames the agent should load via frame_load. */
  frames?: PromptFrameRef[];
  /** Owner-uploaded knowledge docs searchable via knowledge_search. */
  knowledgeDocs?: PromptKnowledgeDocRef[];
  /** Enabled owner-configured custom tools. */
  customTools?: PromptCustomToolRef[];
  /** True when the gated dune_publishVerdict tool is available this session. */
  dunePublishEnabled?: boolean;
}

export function buildSystemPrompt(input: SystemPromptInput): string {
  // Owner corrections get their own emphatic block instead of being buried in
  // the general memory list (memory is stored oldest-first; show newest first).
  const general = input.memory.filter((f) => f.source !== OWNER_CORRECTION_SOURCE);
  const corrections = input.memory
    .filter((f) => f.source === OWNER_CORRECTION_SOURCE)
    .slice(-MAX_CORRECTIONS)
    .reverse();

  const memoryBlock = general.length
    ? general.map((f) => `- ${f.text}`).join("\n")
    : "(nothing yet)";
  const studiedBlock = input.studiedSkills.length ? input.studiedSkills.join(", ") : "(none yet)";

  let prompt = `${BASE_SYSTEM_PROMPT}\n\n--- Durable memory (what you already learned) ---\n${memoryBlock}\n\nSkills studied: ${studiedBlock}`;
  if (corrections.length) {
    prompt += `\n\n--- Owner corrections (the owner corrected you before; do NOT repeat these mistakes) ---\n${corrections
      .map((c) => `- ${c.text}`)
      .join("\n")}`;
  }

  if (input.projectBlock) prompt += input.projectBlock;

  prompt += renderAgentConfigPrompt(input.config);

  if (input.frames?.length) {
    prompt += `\n\n--- Pinned data frames ---\nThe owner pinned live-metric data frames for this agent. When the user asks about these metrics, call frame_load with the frame id FIRST and answer from its fresh, cited numbers:\n${input.frames
      .map((f) => `- "${f.title}" (id: ${f.id}, window: ${f.window})`)
      .join("\n")}`;
  }

  if (input.knowledgeDocs?.length) {
    prompt += `\n\n--- Owner knowledge base ---\nThe owner uploaded ${input.knowledgeDocs.length} knowledge document(s): ${input.knowledgeDocs
      .map((d) => `"${d.title}"`)
      .join(", ")}.\nWhen a question may be covered by these documents, call knowledge_search FIRST and cite the source label/url of any fact you use from them.`;
  }

  if (input.customTools?.length) {
    prompt += `\n\n--- Owner custom data feeds ---\nThe owner configured extra read-only data tools for this agent:\n${input.customTools
      .map((t) => `- ${t.name}: ${t.description}`)
      .join("\n")}\nUse them when relevant.`;
  }

  if (input.dunePublishEnabled) {
    prompt += `\n\n--- Publishing verdicts to Dune ---\nThe owner enabled dune_publishVerdict for this agent. First read the on-chain context (research_getHistory or the owner's Dune feeds), then call dune_publishVerdict ONLY when you reach an off-chain judgment Dune cannot natively produce (an explained risk verdict, not a number Dune already has). Keep the rationale to one sentence and set confidence honestly. Never publish raw chain data.`;
  }

  return prompt;
}
