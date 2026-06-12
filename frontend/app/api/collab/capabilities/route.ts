import { NextResponse } from "next/server";

import { collabUsdcAsset, USDC_DECIMALS } from "@/lib/agent/collab-config";
import { listDiscoverableAgents } from "@/lib/server/collabDiscovery";

/**
 * Public capability manifest of discoverable agents and their bundled expertise.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const agents = await listDiscoverableAgents();
  return NextResponse.json({
    network: "arbitrum-sepolia",
    asset: collabUsdcAsset(),
    assetDecimals: USDC_DECIMALS,
    agents: agents.map((a) => ({
      agentId: a.agentId,
      agentName: a.agentName,
      ownerHandle: a.ownerHandle,
      agentWallet: a.agentWallet,
      walletVerified: a.walletVerified,
      offerHash: a.offerHash,
      attachedSkillTitles: a.attachedSkillTitles,
      x402: a.x402,
      reputationScore: a.reputationScore,
      specialization: a.specialization,
    })),
  });
}
