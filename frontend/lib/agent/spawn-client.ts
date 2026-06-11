"use client";

import type { WebAuthnKey } from "@zerodev/webauthn-key";

import type { AgentProductRef, AgentSkill } from "canhav-agent-service";

/** Mint config returned by GET /api/agent/spawn/preflight (session-gated). */
export interface SpawnMintConfig {
  zerodevRpc: string;
  rpcUrl: string;
  identityRegistry: `0x${string}`;
  securityRegistry: `0x${string}`;
}

export interface SpawnPreflightResponse {
  configured: boolean;
  reused?: boolean;
  agentId?: string;
  agentAddress?: string | null;
  agentURI?: string | null;
  arbiscanUrl?: string | null;
  tokenUrl?: string | null;
  accountIndex?: number;
  skill?: AgentSkill;
  entitySlug?: string;
  associatedProducts?: AgentProductRef[];
  mintConfig?: SpawnMintConfig;
  baseUrl?: string;
  error?: string;
}

export interface ClientMintResult {
  agentId: string;
  agentAddress: `0x${string}`;
  agentURI: string;
  agentWallet: `0x${string}` | null;
  walletVerified: boolean;
  arbiscanUrl: string;
  tokenUrl: string | null;
}

/**
 * Mint an ERC-8004 identity in the browser. Passkey userOp signatures require
 * WebAuthn (`window`); this must NOT run on the Vercel server.
 */
export async function mintAgentOnClient(params: {
  skill: AgentSkill;
  webAuthnKey: WebAuthnKey;
  accountIndex: number;
  entitySlug: string;
  associatedProducts: AgentProductRef[];
  mintConfig: SpawnMintConfig;
  baseUrl: string;
}): Promise<ClientMintResult> {
  const svc = await import("canhav-agent-service");
  const cfg = svc.createConfig({
    zerodevRpc: params.mintConfig.zerodevRpc,
    rpcUrl: params.mintConfig.rpcUrl,
    identityRegistry: params.mintConfig.identityRegistry,
    securityRegistry: params.mintConfig.securityRegistry,
  });

  const result = await svc.spawnAgentFromSkill({
    cfg,
    skill: params.skill,
    webAuthnKey: params.webAuthnKey,
    index: BigInt(params.accountIndex),
    entity: params.entitySlug,
    associatedProducts: params.associatedProducts,
    baseUrl: params.baseUrl,
  });

  const agentId = result.agentId.toString();
  const registry = params.mintConfig.identityRegistry;
  return {
    agentId,
    agentAddress: result.agentAddress,
    agentURI: result.agentURI,
    agentWallet: result.walletVerified ? result.agentWallet : null,
    walletVerified: result.walletVerified,
    arbiscanUrl: `https://sepolia.arbiscan.io/address/${result.agentAddress}`,
    tokenUrl: `https://sepolia.arbiscan.io/token/${registry}?a=${agentId}`,
  };
}
