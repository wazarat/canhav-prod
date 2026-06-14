import type { ResearchVerdict } from "../types";

const SEVERITY_RANK: Record<ResearchVerdict["severity"], number> = {
  low: 0,
  medium: 1,
  high: 2,
};

function worst(a: ResearchVerdict["severity"], b: ResearchVerdict["severity"]): ResearchVerdict["severity"] {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

/**
 * Merge two typed verdicts on the same asset (stablecoin + yield).
 * Consumes typed objects only — no free-form string glue between agents.
 */
export function combineVerdicts(a: ResearchVerdict, b: ResearchVerdict): ResearchVerdict {
  if (a.asset !== b.asset) {
    throw new Error(`combineVerdicts: asset mismatch (${a.asset} vs ${b.asset})`);
  }
  return {
    agentId: `${a.agentId}+${b.agentId}`,
    asset: a.asset,
    kind: "stablecoin",
    signal: `${a.signal}+${b.signal}`,
    severity: worst(a.severity, b.severity),
    confidence: Math.min(a.confidence, b.confidence),
    rationale: `Combined: ${a.rationale} | ${b.rationale}`,
    ts: new Date().toISOString(),
  };
}
