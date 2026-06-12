/**
 * Agent research categories — the owner-chosen focus a user assigns when
 * naming an agent. Shared by server (memory layer, routes) and client
 * (creation form, rename editor), so this module must stay isomorphic
 * (no "server-only" imports).
 */

export type AgentCategory = "stablecoins" | "rwas" | "governance" | "yield" | "risks";

export const AGENT_CATEGORIES: { id: AgentCategory; label: string; description: string }[] = [
  { id: "stablecoins", label: "Stablecoins", description: "Peg mechanics, reserves, supply" },
  { id: "rwas", label: "RWAs", description: "Real-world assets and tokenized funds" },
  { id: "governance", label: "Governance", description: "DAO votes, tokenomics, control" },
  { id: "yield", label: "Yield", description: "APR sources, incentives, sustainability" },
  { id: "risks", label: "Risks", description: "Smart-contract, oracle, depeg exposure" },
];

export function isAgentCategory(value: unknown): value is AgentCategory {
  return (
    typeof value === "string" && AGENT_CATEGORIES.some((c) => c.id === (value as AgentCategory))
  );
}

export function agentCategoryLabel(category: AgentCategory | null | undefined): string | null {
  if (!category) return null;
  return AGENT_CATEGORIES.find((c) => c.id === category)?.label ?? null;
}
