import "server-only";

import {
  collabUsdcAsset,
  defaultCollabPriceUsdc,
  USDC_DECIMALS,
} from "@/lib/agent/collab-config";
import { getAgentProfile } from "@/lib/agent/memory";
import { readAgentReputation } from "@/lib/agent/reputation";
import { readAgentWallet, verifyAgentOnChain } from "@/lib/agent/onchain";
import { listReviews, type AgentReview } from "@/lib/agent/reviews";
import { getUserProfile, listUserAgentIds } from "@/lib/auth/users";

/**
 * Seller marketplace detail — the "look into reviews → description → who
 * created this and how long they've been here" trust surface a buyer needs
 * before transacting. Aggregates the agent profile, exchange-verified reviews,
 * the creator's identity + account age, and on-chain verification links in one
 * read.
 */

export interface SellerCreator {
  /** Display name (or a derived handle); null when the creator is unknown. */
  displayName: string | null;
  /** ISO timestamp the creator joined the platform. */
  memberSince: string | null;
  /** How long they have been on the platform, in whole days. */
  accountAgeDays: number | null;
  /** How many agents this creator has launched (a thin trust signal). */
  agentCount: number;
}

export interface SellerDetail {
  agentId: string;
  agentName: string;
  description: string | null;
  category: string | null;
  entitySlug: string | null;
  attachedSkillTitles: string[];
  price: string;
  asset: string;
  decimals: number;
  collabMaxUnits: number | null;
  reputationScore: number | null;
  reputationCount: number;
  reviews: AgentReview[];
  creator: SellerCreator | null;
  onChain: boolean;
  verifiedOnChain: boolean;
  agentWallet: string | null;
  walletVerified: boolean;
  arbiscanAddressUrl: string | null;
  arbiscanTokenUrl: string | null;
  verifyUrl: string | null;
}

export async function getCreatorInfo(ownerUserId: string | null): Promise<SellerCreator | null> {
  if (!ownerUserId) return null;
  const user = await getUserProfile(ownerUserId);
  if (!user) return null;
  const agentCount = (await listUserAgentIds(ownerUserId)).length;
  const memberSince = user.createdAt ?? null;
  const accountAgeDays = memberSince
    ? Math.max(0, Math.floor((Date.now() - Date.parse(memberSince)) / 86_400_000))
    : null;
  const displayName =
    user.displayName ?? (user.email ? user.email.split("@")[0] : null);
  return { displayName, memberSince, accountAgeDays, agentCount };
}

/** Build the full seller trust view for a discoverable agent, or null if unknown. */
export async function getSellerDetail(agentId: string): Promise<SellerDetail | null> {
  const profile = await getAgentProfile(agentId);
  if (!profile) return null;

  const [reputation, reviews, wallet, creator] = await Promise.all([
    readAgentReputation(agentId),
    listReviews(agentId, 50),
    readAgentWallet(agentId),
    getCreatorInfo(profile.ownerUserId),
  ]);

  // Bundled attached-skill titles (best-effort; discovery dedupes the heavier
  // offer resolution, so we resolve titles directly here).
  let attachedSkillTitles: string[] = [];
  try {
    const { resolveAgentOffer } = await import("@/lib/agent/agentOffer");
    const offer = await resolveAgentOffer(agentId);
    attachedSkillTitles = offer?.attachedSkillTitles ?? [];
  } catch {
    /* offer optional */
  }

  // Live on-chain verification for numeric (minted) ids only.
  const isNumeric = /^\d+$/.test(profile.agentId);
  const verification =
    isNumeric && (profile.onChain || profile.pendingVerification)
      ? await verifyAgentOnChain(agentId, profile.agentAddress)
      : null;
  const verifiedOnChain = verification ? verification.verified : profile.onChain;
  const registry = verification?.registry ?? null;

  return {
    agentId: profile.agentId,
    agentName: profile.name,
    description: profile.description,
    category: profile.category,
    entitySlug: profile.entitySlug,
    attachedSkillTitles,
    price: profile.collabPriceUsdc ?? defaultCollabPriceUsdc(),
    asset: collabUsdcAsset(),
    decimals: USDC_DECIMALS,
    collabMaxUnits: profile.collabMaxUnits,
    reputationScore: reputation?.score ?? null,
    reputationCount: reputation?.count ?? 0,
    reviews,
    creator,
    onChain: profile.onChain,
    verifiedOnChain,
    agentWallet: wallet ?? profile.agentWallet ?? null,
    walletVerified: Boolean(wallet),
    arbiscanAddressUrl: profile.agentAddress
      ? `https://sepolia.arbiscan.io/address/${profile.agentAddress}`
      : null,
    arbiscanTokenUrl:
      registry && isNumeric
        ? `https://sepolia.arbiscan.io/token/${registry}?a=${profile.agentId}`
        : null,
    verifyUrl: isNumeric ? `/api/agent/${encodeURIComponent(agentId)}/verify` : null,
  };
}
