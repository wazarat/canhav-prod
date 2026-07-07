import type { AgentProductRef, AgentRegistrationFile, AgentService, AgentSkill } from "../types";

/** Canonical EIP-8004 registration file type URI. */
export const ERC8004_REGISTRATION_TYPE =
  "https://eips.ethereum.org/EIPS/eip-8004#registration-v1" as const;

export interface RegistrationBinding {
  /** The Entity ("project") slug this agent is bound to. */
  entity?: string;
  /** Member products the agent is scoped to. */
  associatedProducts?: AgentProductRef[];
}

/**
 * Build a canonical ERC-8004 agent registration file from a CanHav skill. The
 * skill's actions are surfaced as OASF `skills` on a service entry (read-only
 * actions become `research:*`, write actions become `execute:*`). The optional
 * `binding` records the agent's project (Entity) + member products on-chain.
 *
 * This is the fully on-chain `data:` URI fallback; the hosted agent card
 * (preferred tokenURI) carries the richer web/verify service endpoints.
 */
export function buildAgentRegistrationFile(
  skill: AgentSkill,
  binding?: RegistrationBinding,
): AgentRegistrationFile {
  const skills = skill.actions.map(
    (a) => `${a.readOnly ? "research" : "execute"}:${a.name}`,
  );
  const services: AgentService[] = [
    {
      name: "OASF",
      endpoint: `urn:canhav:skill:${skill.id}`,
      version: skill.version,
      skills,
    },
  ];
  return {
    type: ERC8004_REGISTRATION_TYPE,
    name: skill.title,
    description: skill.summary,
    services,
    x402Support: false,
    active: true,
    supportedTrust: ["reputation"],
    skillId: skill.id,
    version: skill.version,
    ...(binding?.entity ? { entity: binding.entity } : {}),
    ...(binding?.associatedProducts ? { associatedProducts: binding.associatedProducts } : {}),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Resolve the fully on-chain ERC-8004 `agentURI` (tokenURI): a base64 `data:`
 * URI with no external host, keeping the scaffold self-contained. When a public
 * base URL is available, `spawnAgentFromSkill` instead points the tokenURI at
 * the hosted, discoverable agent card (`/api/agent/<agentId>/agent-card`) —
 * the agentId is only known post-mint, so that URL can't be built here.
 */
export function toAgentURI(file: AgentRegistrationFile): string {
  const json = JSON.stringify(file);
  const base64 = Buffer.from(json, "utf8").toString("base64");
  return `data:application/json;base64,${base64}`;
}
