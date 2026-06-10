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

/**
 * Encode a registration file as a base64 `data:` URI so the agentURI is fully
 * on-chain (no external host needed for the scaffold).
 */
export function toAgentURI(file: AgentRegistrationFile): string {
  const json = JSON.stringify(file);
  const base64 = Buffer.from(json, "utf8").toString("base64");
  return `data:application/json;base64,${base64}`;
}
