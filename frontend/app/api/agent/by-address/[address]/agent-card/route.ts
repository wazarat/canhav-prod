import { NextResponse } from "next/server";

import { buildAgentCard } from "@/lib/agent/agentCard";
import { getAgentByAddress } from "@/lib/agent/memory";

/**
 * Standard ERC-8004 "agent card" served at a stable, address-based URL.
 *
 * The address is known before the ERC-8004 tokenId is minted, so the mint can
 * point `tokenURI` here (see agent-service `toAgentURI`). Indexers and other
 * agents discover a CanHav agent by reading `tokenURI(agentId)` and fetching
 * this card — it carries the canonical ERC-8004 keys ecosystem tooling expects:
 * `type`, `services`, `registrations` with a CAIP-10 `agentRegistry`
 * (`eip155:421614:<registry>`), `supportedTrust`, and `x402Support`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { address: string } }) {
  const address = decodeURIComponent(params.address);
  const profile = await getAgentByAddress(address);
  if (!profile) {
    return NextResponse.json(
      { error: `No CanHav agent found for address ${address}.` },
      { status: 404 },
    );
  }

  const card = await buildAgentCard(profile, new URL(req.url).origin);

  return NextResponse.json(card, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  });
}
