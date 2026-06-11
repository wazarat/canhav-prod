import { NextResponse } from "next/server";

import { collabUsdcAsset, USDC_DECIMALS } from "@/lib/agent/collab-config";
import { listCapabilities } from "@/lib/server/collabDiscovery";

/**
 * Public capability manifest of all discoverable agents and the skills they
 * offer for collaboration — a marketplace index any agent can read. Mirrors the
 * agent-card `services[]` idea: one entry per discoverable skill.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const capabilities = await listCapabilities();
  return NextResponse.json({
    network: "arbitrum-sepolia",
    asset: collabUsdcAsset(),
    assetDecimals: USDC_DECIMALS,
    services: capabilities.map((c) => ({
      skillId: c.skill.id,
      title: c.skill.title,
      summary: c.skill.summary,
      providers: c.agents.map((a) => ({
        agentId: a.agentId,
        ownerHandle: a.ownerHandle,
        agentWallet: a.agentWallet,
        walletVerified: a.walletVerified,
        x402: a.x402,
        reputationScore: a.reputationScore,
      })),
    })),
  });
}
