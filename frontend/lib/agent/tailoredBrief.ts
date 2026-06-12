import "server-only";

import { generateText } from "ai";

import { hasMeaningfulConfig } from "@/lib/agent/agentConfig";
import { hasLLM, resolveAgentModel } from "@/lib/agent/config";
import { searchKnowledge } from "@/lib/agent/knowledge";
import { getAgentProfile, getMemory } from "@/lib/agent/memory";
import type { SourceRef, TailoredBrief } from "@/lib/types";

/**
 * Objective-aware StrategyPacket addendum — where seller differentiation pays
 * off in collaboration. The deterministic base packet (and its skillHash) stays
 * untouched; this generates a clearly-labeled extra brief from the SELLER
 * agent's unique training: its framework config (persona), its knowledge base,
 * and its accumulated memory, focused on the buyer's stated objective.
 *
 * Two equally-priced sellers of the same skill now produce different,
 * personality-shaped deliverables. Degrades to null (base packet only) when no
 * LLM key, no objective, or any generation failure — never blocks settlement.
 */

const OBJECTIVE_MAX_CHARS = 400;
const BRIEF_MAX_OUTPUT_TOKENS = 450;
const MAX_MEMORY_FACTS = 6;
const MAX_KNOWLEDGE_HITS = 3;

function keywordOverlap(query: string, text: string): number {
  const terms = [...new Set(query.toLowerCase().split(/\W+/).filter((t) => t.length > 2))];
  if (!terms.length) return 0;
  const haystack = text.toLowerCase();
  return terms.filter((t) => haystack.includes(t)).length / terms.length;
}

export async function generateTailoredBrief(input: {
  sellerAgentId: string;
  skillTitle: string;
  objective: string;
}): Promise<TailoredBrief | null> {
  const objective = input.objective.trim().slice(0, OBJECTIVE_MAX_CHARS);
  if (!objective || !hasLLM()) return null;

  try {
    const [profile, memory, knowledgeHits] = await Promise.all([
      getAgentProfile(input.sellerAgentId),
      getMemory(input.sellerAgentId),
      searchKnowledge(input.sellerAgentId, objective, MAX_KNOWLEDGE_HITS),
    ]);

    // The seller's most objective-relevant learned facts (cheap keyword rank).
    const relevantFacts = memory
      .map((f) => ({ f, score: keywordOverlap(objective, f.text) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_MEMORY_FACTS)
      .map((x) => x.f);

    const config = profile?.config ?? null;
    const personaLines: string[] = [];
    if (hasMeaningfulConfig(config)) {
      if (config!.focusAreas.length) {
        personaLines.push(`Your analytical focus areas: ${config!.focusAreas.join("; ")}.`);
      }
      personaLines.push(`Risk lens: ${config!.riskLens}.`);
      if (config!.instructions) personaLines.push(`Owner framework:\n${config!.instructions}`);
    }

    const knowledgeBlock = knowledgeHits.length
      ? `\n\nRelevant passages from your knowledge base (cite the source label for any fact you use):\n${knowledgeHits
          .map((h) => `[${h.sourceLabel}] ${h.content.slice(0, 800)}`)
          .join("\n---\n")}`
      : "";
    const memoryBlock = relevantFacts.length
      ? `\n\nRelevant facts you have learned:\n${relevantFacts.map((f) => `- ${f.text}`).join("\n")}`
      : "";

    const { text } = await generateText({
      model: resolveAgentModel(),
      maxOutputTokens: BRIEF_MAX_OUTPUT_TOKENS,
      system: `You are "${profile?.name ?? input.sellerAgentId}", a research agent selling a strategy packet for the skill "${input.skillTitle}" on Arbitrum Sepolia testnet.
Write a short tailored brief (markdown, <= 250 words) for the buyer's objective below.
Rules: research-only — never give financial advice or trading instructions; only use the provided knowledge passages and learned facts plus general reasoning; cite [source labels] inline for facts taken from passages; if the material doesn't cover the objective, say what is and isn't covered instead of inventing facts.
${personaLines.join("\n")}`,
      prompt: `Buyer objective: ${objective}${knowledgeBlock}${memoryBlock}`,
    });

    const brief = text.trim();
    if (!brief) return null;

    const basedOn: SourceRef[] = knowledgeHits.map((h) => ({
      label: h.sourceLabel,
      url: h.sourceUrl ?? "",
    }));
    if (relevantFacts.length) {
      basedOn.push({ label: `${relevantFacts.length} learned memory fact(s)`, url: "" });
    }

    return { objective, brief, basedOn, generatedAt: new Date().toISOString() };
  } catch (e) {
    console.error("[collab] tailored brief failed:", e instanceof Error ? e.message : e);
    return null;
  }
}
