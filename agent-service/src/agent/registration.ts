import type { AgentProductRef, AgentRegistrationFile, AgentSkill } from "../types";

export interface RegistrationBinding {
  /** The Entity ("project") slug this agent is bound to. */
  entity?: string;
  /** Member products the agent is scoped to. */
  associatedProducts?: AgentProductRef[];
}

/**
 * Build an ERC-8004 agent registration file from a CanHav skill. Capabilities
 * are derived from the skill's actions: read-only actions become research
 * capabilities; write actions become execution capabilities. The optional
 * `binding` records the agent's project (Entity) + member products on-chain.
 */
export function buildAgentRegistrationFile(
  skill: AgentSkill,
  binding?: RegistrationBinding,
): AgentRegistrationFile {
  const capabilities = skill.actions.map(
    (a) => `${a.readOnly ? "research" : "execute"}:${a.name}`,
  );
  return {
    name: skill.title,
    description: skill.summary,
    skillId: skill.id,
    version: skill.version,
    capabilities,
    ...(binding?.entity ? { entity: binding.entity } : {}),
    ...(binding?.associatedProducts ? { associatedProducts: binding.associatedProducts } : {}),
    createdAt: new Date().toISOString(),
  };
}

export interface AgentURIOptions {
  /**
   * Public base URL of the CanHav app (e.g. https://canhav.co or the Vercel
   * deployment URL). When provided with {@link AgentURIOptions.address}, the
   * tokenURI points at the hosted, standard ERC-8004 agent card so explorers and
   * other agents can discover it over HTTP.
   */
  baseUrl?: string | null;
  /**
   * The agent's smart-account address. Known BEFORE the tokenId is minted, so it
   * yields a stable card URL (`/api/agent/by-address/<address>/agent-card`) we
   * can set as the tokenURI in the same mint.
   */
  address?: string | null;
}

/**
 * Resolve the ERC-8004 `agentURI` (tokenURI).
 *
 * Prefers a hosted, discoverable agent card (`<baseUrl>/api/agent/by-address/
 * <address>/agent-card`) so the identity is indexable by ERC-8004 explorers and
 * readable by other agents. Falls back to a fully on-chain base64 `data:` URI
 * (no external host) when a base URL/address isn't available — keeping the
 * scaffold self-contained and every path degrading gracefully.
 */
export function toAgentURI(file: AgentRegistrationFile, options?: AgentURIOptions): string {
  const baseUrl = options?.baseUrl?.replace(/\/+$/, "");
  const address = options?.address;
  if (baseUrl && address) {
    return `${baseUrl}/api/agent/by-address/${address}/agent-card`;
  }

  const json = JSON.stringify(file);
  const base64 = Buffer.from(json, "utf8").toString("base64");
  return `data:application/json;base64,${base64}`;
}
