import { NextResponse } from "next/server";

import { buildAgentCard } from "@/lib/agent/agentCard";
import { getAgentProfile } from "@/lib/agent/memory";

/**
 * Standard ERC-8004 "agent card" served at a stable, agentId-based URL.
 *
 * Privy-direct mints point `tokenURI` here (set right after the mint, once the
 * agentId is known — see lib/agent/spawn-client.ts). The agentId is the only
 * key that stays unique when one wallet owns several agents; the legacy
 * address-based card (`/api/agent/by-address/[address]/agent-card`) remains for
 * kernel-era mints whose tokenURIs already reference it.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { agentId: string } }) {
  const agentId = decodeURIComponent(params.agentId).trim();
  const profile = await getAgentProfile(agentId);
  if (!profile) {
    return NextResponse.json({ error: `No CanHav agent found for id ${agentId}.` }, { status: 404 });
  }

  const card = await buildAgentCard(profile, new URL(req.url).origin);

  return NextResponse.json(card, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  });
}
