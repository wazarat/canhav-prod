import "server-only";

import { agentOfferSkillId } from "@/lib/agent/agentOffer";
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
  getAttachedSkillIds,
  getMemory,
  getStudiedSkills,
  listAgents,
  listDataFrames,
} from "@/lib/agent/memory";
import { OWNER_CORRECTION_SOURCE } from "@/lib/agent/prompt";
import { readAgentReputation } from "@/lib/agent/reputation";
import { readAgentWallet } from "@/lib/agent/onchain";
import { listCollabExchanges } from "@/lib/server/collabLog";
import { getUserSkill } from "@/lib/server/userSkills";

/**
 * Agent-indexed collaboration discovery.
 *
 * A seller appears when the agent owner toggled discoverable AND the agent has
 * at least one attached user skill (bundled into a single offer). Skill
 * visibility is not consulted — skills are private training artifacts.
 */

export interface DiscoverySpecialization {
  focusAreas: string[];
  riskLens: string | null;
  /** Owner-chosen agent research category (stablecoins / rwas / governance / yield / risks). */
  category: string | null;
  entitySlug: string | null;
  level: number;
  knowledgeDocs: number;
  dataFrames: number;
  customTools: number;
  exchangeCount: number;
}

export interface AgentDiscoveryEntry {
  agentId: string;
  agentName: string;
  ownerHandle: string;
  agentWallet: string | null;
  walletVerified: boolean;
  offerHash: string;
  attachedSkillIds: string[];
  attachedSkillTitles: string[];
  x402: { price: string; asset: string; decimals: number };
  reputationScore: number | null;
  reputationCount: number;
  specialization: DiscoverySpecialization;
}

async function sellerExchangeCounts(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  try {
    for (const e of await listCollabExchanges(200)) {
      counts.set(e.toAgentId, (counts.get(e.toAgentId) ?? 0) + 1);
    }
  } catch {
    /* discovery must work even if the log is unavailable */
  }
  return counts;
}

async function buildAgentEntry(
  agentId: string,
  exchangeCounts: Map<string, number>,
): Promise<AgentDiscoveryEntry | null> {
  const profile = await getAgentProfile(agentId);
  if (!profile || !profile.discoverable) return null;

  const attachedSkillIds = await getAttachedSkillIds(agentId);
  if (!attachedSkillIds.length) return null;

  const attachedSkills = (
    await Promise.all(attachedSkillIds.map((id) => getUserSkill(id)))
  ).filter((s): s is NonNullable<typeof s> => Boolean(s));
  if (!attachedSkills.length) return null;

  const { resolveAgentOffer } = await import("@/lib/agent/agentOffer");
  const offer = await resolveAgentOffer(agentId);
  if (!offer) return null;

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
    offerHash: offer.hash,
    attachedSkillIds: offer.attachedSkillIds,
    attachedSkillTitles: offer.attachedSkillTitles,
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
      category: profile.category,
      entitySlug: profile.entitySlug,
      level,
      knowledgeDocs: docs.length,
      dataFrames: frames.length,
      customTools: tools.filter((t) => t.enabled).length,
      exchangeCount: exchangeCounts.get(agentId) ?? 0,
    },
  };
}

/** All discoverable agents with bundled attached skills, ranked by reputation then level. */
export async function listDiscoverableAgents(): Promise<AgentDiscoveryEntry[]> {
  const exchangeCounts = await sellerExchangeCounts();
  const profiles = await listAgents();
  const entries = await Promise.all(
    profiles.filter((p) => p.discoverable).map((p) => buildAgentEntry(p.agentId, exchangeCounts)),
  );
  return entries
    .filter((e): e is AgentDiscoveryEntry => Boolean(e))
    .sort(
      (a, b) =>
        (b.reputationScore ?? 0) - (a.reputationScore ?? 0) ||
        b.specialization.level - a.specialization.level,
    );
}

/** @deprecated Skill-indexed discovery — use listDiscoverableAgents. */
export async function discoverAgentsForSkill(_skillId: string): Promise<AgentDiscoveryEntry[]> {
  return [];
}

/** @deprecated Skill-indexed manifest — use listDiscoverableAgents. */
export async function listCapabilities(): Promise<{ agents: AgentDiscoveryEntry[] }> {
  const agents = await listDiscoverableAgents();
  return { agents };
}

/** Offer skill id stored in collab logs for agent-centric exchanges. */
export { agentOfferSkillId };
