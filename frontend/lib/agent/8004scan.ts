import { ARBITRUM_SEPOLIA_CHAIN_ID } from "@/lib/agent/chain";

/** Whether `agentId` is a minted ERC-721 tokenId (numeric). */
export function isOnChainTokenId(agentId: string): boolean {
  return /^\d+$/.test(agentId);
}

/** 8004scan agent page for Arbitrum Sepolia mints. */
export function scan8004AgentUrl(agentId: string): string | null {
  if (!isOnChainTokenId(agentId)) return null;
  return `https://8004scan.io/agents/${ARBITRUM_SEPOLIA_CHAIN_ID}/${agentId}`;
}
