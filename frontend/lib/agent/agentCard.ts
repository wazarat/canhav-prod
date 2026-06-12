import { ERC8004_REGISTRATION_TYPE, canhavPublicOrigin } from "@/lib/agent/public-url";
import { ARBITRUM_SEPOLIA_CHAIN_ID } from "@/lib/agent/config";
import { resolveEntityBinding } from "@/lib/agent/entity-binding";
import type { AgentProfile } from "@/lib/agent/memory";
import { readAgentWallet } from "@/lib/agent/onchain";
import { readSecret } from "@/lib/server/env";

export interface AgentCard {
  type: string;
  name: string;
  description: string;
  image: string;
  services: Array<{
    name: string;
    endpoint: string;
    skills?: string[];
  }>;
  x402Support: boolean;
  active: boolean;
  registrations: Array<{
    agentId: string;
    agentRegistry: string;
  }>;
  supportedTrust: string[];
  entity: string | null;
  associatedProducts: AgentProfile["associatedProducts"];
  smartAccount: string | null;
  agentWallet: string | null;
  walletVerified: boolean;
  chain: { caip2: string; name: string };
  createdAt: string;
  updatedAt: string;
}

function capabilitiesFor(categories: Set<string>): string[] {
  const caps = ["research:entity"];
  if (categories.has("Stablecoin")) caps.push("research:stablecoins");
  if (categories.has("Token")) caps.push("research:tokens");
  if (categories.has("RWA")) caps.push("research:rwa");
  return caps;
}

/** Build the ERC-8004 agent card JSON for a profile. */
export async function buildAgentCard(
  profile: AgentProfile,
  origin: string,
): Promise<AgentCard> {
  const baseOrigin = canhavPublicOrigin(origin);
  const registry = readSecret("IDENTITY_REGISTRY_ADDRESS");
  const isMinted = profile.onChain && /^\d+$/.test(profile.agentId);

  const binding = profile.entitySlug ? await resolveEntityBinding(profile.entitySlug) : null;
  const entityName = binding?.entityName ?? "General research";
  const categories = new Set(profile.associatedProducts.map((p) => p.category));

  const webUri = `${baseOrigin}/agents/${profile.agentId}`;
  const verifyUri = `${baseOrigin}/api/agent/${profile.agentId}/verify`;

  const verifiedWallet = isMinted ? await readAgentWallet(profile.agentId) : null;
  const walletVerified = Boolean(
    verifiedWallet &&
      profile.agentAddress &&
      verifiedWallet.toLowerCase() === profile.agentAddress.toLowerCase(),
  );

  const services = [
    { name: "web", endpoint: webUri },
    { name: "verify", endpoint: verifyUri },
    { name: "OASF", endpoint: webUri, skills: capabilitiesFor(categories) },
    ...(verifiedWallet
      ? [
          {
            name: "agentWallet",
            endpoint: `eip155:${ARBITRUM_SEPOLIA_CHAIN_ID}:${verifiedWallet}`,
          },
        ]
      : []),
  ];

  return {
    type: ERC8004_REGISTRATION_TYPE,
    name: `CanHav · ${entityName} Research Agent`,
    description: profile.entitySlug
      ? `Research-only ERC-8004 agent bound to the ${entityName} entity on the CanHav platform (Arbitrum ecosystem intelligence).`
      : "Research-only ERC-8004 agent on the CanHav platform (Arbitrum ecosystem intelligence).",
    image: `${baseOrigin}/logo.svg`,
    services,
    x402Support: profile.discoverable === true,
    active: true,
    registrations:
      isMinted && registry
        ? [
            {
              agentId: profile.agentId,
              agentRegistry: `eip155:${ARBITRUM_SEPOLIA_CHAIN_ID}:${registry}`,
            },
          ]
        : [],
    supportedTrust: ["reputation"],
    entity: profile.entitySlug,
    associatedProducts: profile.associatedProducts,
    smartAccount: profile.agentAddress,
    agentWallet: verifiedWallet,
    walletVerified,
    chain: { caip2: `eip155:${ARBITRUM_SEPOLIA_CHAIN_ID}`, name: "arbitrum-sepolia" },
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}
