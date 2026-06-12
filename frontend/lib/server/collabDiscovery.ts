import "server-only";

import {
  collabUsdcAsset,
  defaultCollabPriceUsdc,
  USDC_DECIMALS,
} from "@/lib/agent/collab-config";
import { listCustomTools } from "@/lib/agent/customTools";
import { listKnowledgeDocs } from "@/lib/agent/knowledge";
import {
  agentLevel,
  getAgentProfile,
  getAgentsForSkill,
  getMemory,
  getStudiedSkills,
  listDataFrames,
} from "@/lib/agent/memory";
import { OWNER_CORRECTION_SOURCE } from "@/lib/agent/prompt";
import { readAgentReputation } from "@/lib/agent/reputation";
import { readAgentWallet } from "@/lib/agent/onchain";
import { listCollabExchanges } from "@/lib/server/collabLog";
import { listDiscoverableSkills, getUserSkill } from "@/lib/server/userSkills";

/**
 * Skill-indexed collaboration discovery.
 *
 * A seller appears only when BOTH opt-ins are set: the agent owner toggled the
 * agent discoverable AND the skill's visibility is "discoverable". Results are
 * re-queried live before every collaboration (routes are force-dynamic) so a
 * just-flipped opt-out is honored immediately.
 */

/**
 * What makes this seller different: the owner's training surfaces (focus areas,
 * knowledge, frames, tools), the agent's level, and its real exchange history.
 * Buyers pick on substance, not just price.
 */
export interface DiscoverySpecialization {
  focusAreas: string[];
  riskLens: string | null;
  entitySlug: string | null;
  level: number;
  knowledgeDocs: number;
  dataFrames: number;
  customTools: number;
  /** Settled exchanges where this agent was the seller (collab:log). */
  exchangeCount: number;
}

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
  specialization: DiscoverySpecialization;
}

export interface CapabilityManifestEntry {
  skill: { id: string; title: string; summary: string };
  agents: DiscoveryEntry[];
}

async function buildEntry(
  agentId: string,
  skill: { id: string; title: string },
  exchangeCounts: Map<string, number>,
): Promise<DiscoveryEntry | null> {
  const profile = await getAgentProfile(agentId);
  if (!profile || !profile.discoverable) return null;

  const [wallet, reputation, memory, studied, frames, docs, tools] = await Promise.all([
    readAgentWallet(agentId),
    readAgentReputation(agentId),
    getMemory(agentId),
    getStudiedSkills(agentId),
    listDataFrames(agentId),
    listKnowledgeDocs(agentId),
    listCustomTools(agentId),
  ]);

  const corrections = memory.filter((f) => f.source === OWNER_CORRECTION_SOURCE).length;
  const level = agentLevel(memory.length, studied.length, {
    frames: frames.length,
    knowledgeDocs: docs.length,
    customTools: tools.length,
    corrections,
  });

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
    specialization: {
      focusAreas: profile.config?.focusAreas ?? [],
      riskLens: profile.config?.riskLens ?? null,
      entitySlug: profile.entitySlug,
      level,
      knowledgeDocs: docs.length,
      dataFrames: frames.length,
      customTools: tools.filter((t) => t.enabled).length,
      exchangeCount: exchangeCounts.get(agentId) ?? 0,
    },
  };
}

/** Settled-exchange counts per SELLER agent, from the off-chain collab log. */
async function sellerExchangeCounts(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  try {
    for (const e of await listCollabExchanges(200)) {
      counts.set(e.toAgentId, (counts.get(e.toAgentId) ?? 0) + 1);
    }
  } catch {
    // discovery must work even if the log is unavailable
  }
  return counts;
}

/** Discoverable agents for a user-skill id, ranked by reputation then level. */
export async function discoverAgentsForSkill(skillId: string): Promise<DiscoveryEntry[]> {
  const skill = await getUserSkill(skillId);
  if (!skill || skill.visibility !== "discoverable") return [];

  const agentIds = await getAgentsForSkill(skillId);
  const exchangeCounts = await sellerExchangeCounts();
  const entries = await Promise.all(agentIds.map((id) => buildEntry(id, skill, exchangeCounts)));
  return entries
    .filter((e): e is DiscoveryEntry => Boolean(e))
    .sort(
      (a, b) =>
        (b.reputationScore ?? 0) - (a.reputationScore ?? 0) ||
        b.specialization.level - a.specialization.level,
    );
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
