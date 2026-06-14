import "server-only";

import { agentOfferSkillId } from "@/lib/agent/agentOffer";
import {
  collabSettlement,
  defaultCollabPriceUsdc,
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
import { readAgentLedger, readAgentWallet } from "@/lib/agent/onchain";
import { listCollabExchanges } from "@/lib/server/collabLog";
import { getCreatorInfo, type SellerCreator } from "@/lib/server/sellerDetail";
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

/** Objective, behavior-derived merit from the on-chain ledger (null = none yet). */
export interface AgentMerit {
  collabCount: number;
  netProducer: boolean;
  /** Repeat-partner share in basis points (0-10000). */
  repeatRateBps: number;
  /** Unix seconds of last recorded activity (0 = none). */
  lastActive: number;
}

export interface AgentDiscoveryEntry {
  agentId: string;
  agentName: string;
  ownerHandle: string;
  /** Owner-authored marketplace bio (null = none yet). */
  description: string | null;
  /** Creator identity + account age, for buyer trust. */
  creator: SellerCreator | null;
  agentWallet: string | null;
  walletVerified: boolean;
  offerHash: string;
  attachedSkillIds: string[];
  attachedSkillTitles: string[];
  /** Settlement asset label + price (tCNHV credits, or USDC fallback). */
  x402: { price: string; asset: string; decimals: number; assetName: string };
  reputationScore: number | null;
  reputationCount: number;
  /** On-chain track record (null until the agent has a ledger with activity). */
  merit: AgentMerit | null;
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

  const onChainWallet = await readAgentWallet(agentId);
  const payWallet =
    onChainWallet ??
    (profile.agentWallet && /^0x[0-9a-fA-F]{40}$/.test(profile.agentWallet)
      ? profile.agentWallet
      : null);

  const [reputation, memory, studied, frames, docs, tools, creator, ledger] =
    await Promise.all([
      readAgentReputation(agentId),
      getMemory(agentId),
      getStudiedSkills(agentId),
      listDataFrames(agentId),
      listKnowledgeDocs(agentId),
      listCustomTools(agentId),
      getCreatorInfo(profile.ownerUserId),
      readAgentLedger(agentId),
    ]);

  const corrections = memory.filter((f) => f.source === OWNER_CORRECTION_SOURCE).length;
  const level = agentLevel(memory.length, studied.length, {
    frames: frames.length,
    knowledgeDocs: docs.length,
    customTools: tools.length,
    corrections,
  });

  const settlement = collabSettlement();

  return {
    agentId,
    agentName: profile.name,
    ownerHandle: profile.name.replace(/ — Research Skill$/, ""),
    description: profile.description,
    creator,
    agentWallet: payWallet,
    walletVerified: Boolean(payWallet),
    offerHash: offer.hash,
    attachedSkillIds: offer.attachedSkillIds,
    attachedSkillTitles: offer.attachedSkillTitles,
    x402: {
      price: profile.collabPriceUsdc ?? defaultCollabPriceUsdc(),
      asset: settlement.asset,
      decimals: settlement.decimals,
      assetName: settlement.name,
    },
    reputationScore: reputation?.score ?? null,
    reputationCount: reputation?.count ?? 0,
    merit:
      ledger && ledger.collabCount > 0
        ? {
            collabCount: ledger.collabCount,
            netProducer: ledger.netProducer,
            repeatRateBps: ledger.repeatRateBps,
            lastActive: ledger.lastActive,
          }
        : null,
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

export interface DiscoveryFilter {
  /** Restrict to a single research category/tag (case-insensitive). */
  category?: string | null;
  /** Free-text search over name, description, expertise, focus areas, creator. */
  q?: string | null;
}

function matchesFilter(entry: AgentDiscoveryEntry, filter: DiscoveryFilter): boolean {
  if (filter.category) {
    if ((entry.specialization.category ?? "").toLowerCase() !== filter.category.toLowerCase()) {
      return false;
    }
  }
  const q = filter.q?.trim().toLowerCase();
  if (q) {
    const haystack = [
      entry.agentName,
      entry.description ?? "",
      entry.creator?.displayName ?? "",
      entry.specialization.entitySlug ?? "",
      ...entry.attachedSkillTitles,
      ...entry.specialization.focusAreas,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

/** All discoverable agents with bundled attached skills, ranked by reputation then level. */
export async function listDiscoverableAgents(
  filter: DiscoveryFilter = {},
): Promise<AgentDiscoveryEntry[]> {
  const exchangeCounts = await sellerExchangeCounts();
  const profiles = await listAgents();
  const entries = await Promise.all(
    profiles.filter((p) => p.discoverable).map((p) => buildAgentEntry(p.agentId, exchangeCounts)),
  );
  return entries
    .filter((e): e is AgentDiscoveryEntry => Boolean(e))
    .filter((e) => matchesFilter(e, filter))
    .sort(
      (a, b) =>
        (b.reputationScore ?? 0) - (a.reputationScore ?? 0) ||
        (b.merit?.collabCount ?? 0) - (a.merit?.collabCount ?? 0) ||
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
