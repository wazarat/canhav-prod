"use client";

import type { Signer } from "@zerodev/sdk/types";

import type { SpawnMintConfig } from "@/lib/agent/spawn-client";

/** Advertise params returned by POST /api/collab/skills/[id]/attach. */
export interface AdvertiseParams {
  agentId: string;
  accountIndex: number;
  skillsCsv: string;
  newSkill: { id: string; hash: `0x${string}` };
  mintConfig: SpawnMintConfig;
}

/**
 * Advertise the agent's attached skills on-chain (best-effort).
 *
 * Signs two `setMetadata` calls from the agent's own ZeroDev kernel account (the
 * token owner): the `skills` key (CSV of advertised skill ids) and a
 * `skillHash:<id>` key for the just-attached skill, so a buyer can later verify
 * a StrategyPacket against the advertised hash. Runs in the browser because the
 * embedded-wallet signer lives client-side (same as the mint flow).
 */
export async function advertiseSkillsOnChain(params: {
  signer: Signer;
  advertise: AdvertiseParams;
}): Promise<{ userOpHash: string }> {
  const { signer, advertise } = params;
  const svc = await import("canhav-agent-service");
  const { encodeFunctionData, stringToHex } = await import("viem");

  const cfg = svc.createConfig({
    zerodevRpc: advertise.mintConfig.zerodevRpc,
    rpcUrl: advertise.mintConfig.rpcUrl,
    identityRegistry: advertise.mintConfig.identityRegistry,
    securityRegistry: advertise.mintConfig.securityRegistry,
  });

  const account = await svc.createEcdsaKernelAccount(cfg, signer, BigInt(advertise.accountIndex));
  const agentId = BigInt(advertise.agentId);

  const calls = [
    {
      to: cfg.identityRegistry,
      data: encodeFunctionData({
        abi: svc.identityRegistryAbi,
        functionName: "setMetadata",
        args: [agentId, "skills", stringToHex(advertise.skillsCsv)],
      }),
    },
    {
      to: cfg.identityRegistry,
      data: encodeFunctionData({
        abi: svc.identityRegistryAbi,
        functionName: "setMetadata",
        args: [agentId, `skillHash:${advertise.newSkill.id}`, advertise.newSkill.hash],
      }),
    },
  ];

  const userOpHash = await account.kernelClient.sendUserOperation({
    account: account.account,
    calls,
  });
  await account.kernelClient.waitForUserOperationReceipt({ hash: userOpHash });
  return { userOpHash };
}
