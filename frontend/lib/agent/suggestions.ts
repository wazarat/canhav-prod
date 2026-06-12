import "server-only";

import { hasMeaningfulConfig } from "@/lib/agent/agentConfig";
import { listCustomTools } from "@/lib/agent/customTools";
import { listKnowledgeDocs } from "@/lib/agent/knowledge";
import {
  getRuns,
  listDataFrames,
  type AgentProfile,
} from "@/lib/agent/memory";

/**
 * Suggestion nudges — a tiny deterministic analyzer over the agent's recent
 * runs and enrichment state. Produces dismissible, deep-linked prompts like
 * "4 peg questions but no peg data frame — pin one?" so owners discover the
 * training surfaces (Phases A–D) exactly when they'd benefit from them.
 * No LLM involved; pure heuristics, cheap to compute on the agent page.
 */

export interface AgentSuggestion {
  /** Stable id — the client uses it for localStorage dismissal. */
  id: string;
  text: string;
  /** Anchor of the panel the suggestion deep-links to. */
  target: "framework" | "frames" | "knowledge" | "custom-tools";
}

function countMatches(texts: string[], re: RegExp): number {
  return texts.filter((t) => re.test(t)).length;
}

export async function buildAgentSuggestions(
  agentId: string,
  profile: AgentProfile,
): Promise<AgentSuggestion[]> {
  const [runs, frames, docs, tools] = await Promise.all([
    getRuns(agentId, 20),
    listDataFrames(agentId),
    listKnowledgeDocs(agentId),
    listCustomTools(agentId),
  ]);

  const questions = runs.map((r) => r.question.toLowerCase());
  const suggestions: AgentSuggestion[] = [];

  // Topic-driven: repeated metric questions with no matching pinned frame.
  const pegQuestions = countMatches(questions, /\bpeg|depeg|de-peg\b/);
  const hasPegFrame = frames.some((f) => f.metrics.some((m) => m.kind === "peg"));
  if (pegQuestions >= 3 && !hasPegFrame) {
    suggestions.push({
      id: "peg-frame",
      text: `${pegQuestions} recent questions touched peg stability, but there's no peg data frame — pin one so answers always carry fresh peg numbers.`,
      target: "frames",
    });
  }

  const priceQuestions = countMatches(questions, /\bprice|market cap|mcap\b/);
  const hasPriceFrame = frames.some((f) => f.metrics.some((m) => m.kind === "price"));
  if (priceQuestions >= 3 && !hasPriceFrame) {
    suggestions.push({
      id: "price-frame",
      text: `${priceQuestions} recent questions asked about price — pin a price data frame for instant, cited numbers.`,
      target: "frames",
    });
  }

  const yieldQuestions = countMatches(questions, /\byield|apy|apr|rates?\b/);
  const hasRatesFrame = frames.some((f) => f.metrics.some((m) => m.kind === "aaveRates"));
  if (yieldQuestions >= 3 && !hasRatesFrame && profile.associatedProducts.length > 0) {
    suggestions.push({
      id: "rates-frame",
      text: `${yieldQuestions} recent questions covered yield/rates — a rates data frame would keep those answers live.`,
      target: "frames",
    });
  }

  // Enrichment-stage nudges (shown once the agent is actually being used).
  if (runs.length >= 3 && !hasMeaningfulConfig(profile.config)) {
    suggestions.push({
      id: "set-framework",
      text: "This agent still thinks with the default framework — set focus areas, a risk lens, and owner instructions to make its analysis yours.",
      target: "framework",
    });
  }

  if (runs.length >= 5 && docs.length === 0) {
    suggestions.push({
      id: "add-knowledge",
      text: "No knowledge documents yet — paste your research notes or docs and the agent will search and cite them.",
      target: "knowledge",
    });
  }

  if (runs.length >= 8 && tools.length === 0 && frames.length > 0) {
    suggestions.push({
      id: "add-custom-tool",
      text: "Heavy usage detected — add a custom data tool (Dune query, CoinGecko market, on-chain supply) to widen what this agent can pull.",
      target: "custom-tools",
    });
  }

  return suggestions.slice(0, 3);
}
