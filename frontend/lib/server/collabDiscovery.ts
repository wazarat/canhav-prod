import "server-only";

import {
  collabUsdcAsset,
  defaultCollabPriceUsdc,
  USDC_DECIMALS,
} from "@/lib/agent/collab-config";
import { getAgentProfile, getAgentsForSkill } from "@/lib/agent/memory";
import { readAgentReputation } from "@/lib/agent/reputation";
import { readAgentWallet } from "@/lib/agent/onchain";
import { listDiscoverableSkills, getUserSkill } from "@/lib/server/userSkills";

/**
 * Skill-indexed collaboration discovery.
 *
 * A seller appears only when BOTH opt-ins are set: the agent owner toggled the
 * agent discoverable AND the skill's visibility is "discoverable". Results are
 * re-queried live before every collaboration (routes are force-dynamic) so a
 * just-flipped opt-out is honored immediately.
 */

export interface DiscoveryEntry {
  agentId: string;
  agentName: string;
  ownerHandle: string;
  agentWallet: string | null;
  walletVerified: boolean;
  skillId: string;
  skillTitle: string;
  x402: { price: string; asset: string; decimals: number };
  reputationScore: number | null;
  reputationCount: number;
}

export interface CapabilityManifestEntry {
  skill: { id: string; title: string; summary: string };
  agents: DiscoveryEntry[];
}

async function buildEntry(
  agentId: string,
  skill: { id: string; title: string },
): Promise<DiscoveryEntry | null> {
  const profile = await getAgentProfile(agentId);
  if (!profile || !profile.discoverable) return null;

  const wallet = await readAgentWallet(agentId);
  const reputation = await readAgentReputation(agentId);

  return {
    agentId,
    agentName: profile.name,
    ownerHandle: profile.name.replace(/ — Research Skill$/, ""),
    agentWallet: wallet ?? profile.agentWallet ?? null,
    walletVerified: Boolean(wallet),
    skillId: skill.id,
    skillTitle: skill.title,
    x402: {
      price: profile.collabPriceUsdc ?? defaultCollabPriceUsdc(),
      asset: collabUsdcAsset(),
      decimals: USDC_DECIMALS,
    },
    reputationScore: reputation?.score ?? null,
    reputationCount: reputation?.count ?? 0,
  };
}

/** Discoverable agents advertising a given user-skill id, ranked by reputation. */
export async function discoverAgentsForSkill(skillId: string): Promise<DiscoveryEntry[]> {
  const skill = await getUserSkill(skillId);
  if (!skill || skill.visibility !== "discoverable") return [];

  const agentIds = await getAgentsForSkill(skillId);
  const entries = await Promise.all(agentIds.map((id) => buildEntry(id, skill)));
  return entries
    .filter((e): e is DiscoveryEntry => Boolean(e))
    .sort((a, b) => (b.reputationScore ?? 0) - (a.reputationScore ?? 0));
}

/** Full manifest of every discoverable skill and the agents offering it. */
export async function listCapabilities(): Promise<CapabilityManifestEntry[]> {
  const skills = await listDiscoverableSkills();
  const manifest = await Promise.all(
    skills.map(async (skill) => ({
      skill: { id: skill.id, title: skill.title, summary: skill.summary },
      agents: await discoverAgentsForSkill(skill.id),
    })),
  );
  // Only surface skills that actually have a live, discoverable agent behind them.
  return manifest.filter((m) => m.agents.length > 0);
}
