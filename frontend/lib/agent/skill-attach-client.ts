"use client";

import type { Signer } from "@/lib/agent/privy-signer";

/** Advertise params returned by POST /api/collab/skills/[id]/attach. */
export interface AdvertiseParams {
  agentId: string;
  skillsCsv: string;
  newSkill: { id: string; hash: `0x${string}` };
  identityRegistry: `0x${string}`;
  rpcUrl: string;
}

const setMetadataAbi = [
  {
    type: "function",
    name: "setMetadata",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "metadataKey", type: "string" },
      { name: "metadataValue", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

/**
 * Advertise the agent's attached skills on-chain (best-effort).
 *
 * Signs two `setMetadata` calls from the user's Privy wallet (the token owner
 * for Privy-direct mints): the `skills` key (CSV of advertised skill ids) and a
 * `skillHash:<id>` key for the just-attached skill, so a buyer can later verify
 * a StrategyPacket against the advertised hash. Runs in the browser because the
 * wallet signer lives client-side (same as the mint flow).
 */
export async function advertiseSkillsOnChain(params: {
  signer: Signer;
  advertise: AdvertiseParams;
}): Promise<{ txHash: `0x${string}` }> {
  const { signer, advertise } = params;
  const { createPublicClient, http, stringToHex } = await import("viem");
  const { arbitrumSepolia } = await import("viem/chains");

  const agentId = BigInt(advertise.agentId);
  const registry = advertise.identityRegistry;

  const skillsHash = await signer.writeContract({
    abi: setMetadataAbi,
    address: registry,
    functionName: "setMetadata",
    args: [agentId, "skills", stringToHex(advertise.skillsCsv)],
  });
  const hashKeyTx = await signer.writeContract({
    abi: setMetadataAbi,
    address: registry,
    functionName: "setMetadata",
    args: [agentId, `skillHash:${advertise.newSkill.id}`, advertise.newSkill.hash],
  });

  const client = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(advertise.rpcUrl),
  });
  await client.waitForTransactionReceipt({ hash: skillsHash });
  const receipt = await client.waitForTransactionReceipt({ hash: hashKeyTx });
  return { txHash: receipt.transactionHash };
}
