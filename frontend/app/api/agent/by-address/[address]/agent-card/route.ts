import { NextResponse } from "next/server";

import { ARBITRUM_SEPOLIA_CHAIN_ID } from "@/lib/agent/config";
import { resolveEntityBinding } from "@/lib/agent/entity-binding";
import { getAgentByAddress } from "@/lib/agent/memory";
import { readSecret } from "@/lib/server/env";

/**
 * Standard ERC-8004 "agent card" served at a stable, address-based URL.
 *
 * The address is known before the ERC-8004 tokenId is minted, so the mint can
 * point `tokenURI` here (see agent-service `toAgentURI`). Indexers and other
 * agents discover a CanHav agent by reading `tokenURI(agentId)` and fetching
 * this card — it carries the conventional keys ecosystem tooling expects:
 * `registrations` with a CAIP-10 `agentRegistry` (`eip155:421614:<registry>`),
 * `endpoints`, `capabilities`, `entity`, `associatedProducts`, and `trustModels`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function capabilitiesFor(categories: Set<string>): string[] {
  const caps = ["research:entity"];
  if (categories.has("Stablecoin")) caps.push("research:stablecoins");
  if (categories.has("Token")) caps.push("research:tokens");
  if (categories.has("RWA")) caps.push("research:rwa");
  return caps;
}

export async function GET(req: Request, { params }: { params: { address: string } }) {
  const address = decodeURIComponent(params.address);
  const profile = await getAgentByAddress(address);
  if (!profile) {
    return NextResponse.json(
      { error: `No CanHav agent found for address ${address}.` },
      { status: 404 },
    );
  }

  const origin = new URL(req.url).origin;
  const registry = readSecret("IDENTITY_REGISTRY_ADDRESS");
  const isMinted = profile.onChain && /^\d+$/.test(profile.agentId);

  const binding = profile.entitySlug ? await resolveEntityBinding(profile.entitySlug) : null;
  const entityName = binding?.entityName ?? "General research";
  const categories = new Set(profile.associatedProducts.map((p) => p.category));

  const card = {
    name: `CanHav · ${entityName} Research Agent`,
    description: profile.entitySlug
      ? `Research-only ERC-8004 agent bound to the ${entityName} entity on the CanHav platform (Arbitrum ecosystem intelligence).`
      : "Research-only ERC-8004 agent on the CanHav platform (Arbitrum ecosystem intelligence).",
    // CAIP-10 registry reference — what indexers/other agents read for portability.
    registrations:
      isMinted && registry
        ? [
            {
              agentId: profile.agentId,
              agentRegistry: `eip155:${ARBITRUM_SEPOLIA_CHAIN_ID}:${registry}`,
            },
          ]
        : [],
    endpoints: [
      { name: "web", uri: `${origin}/agents/${profile.agentId}` },
      { name: "verify", uri: `${origin}/api/agent/${profile.agentId}/verify` },
    ],
    capabilities: capabilitiesFor(categories),
    entity: profile.entitySlug,
    associatedProducts: profile.associatedProducts,
    smartAccount: profile.agentAddress,
    chain: { caip2: `eip155:${ARBITRUM_SEPOLIA_CHAIN_ID}`, name: "arbitrum-sepolia" },
    trustModels: ["reputation"],
    x402: { supported: false },
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };

  return NextResponse.json(card, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  });
}
