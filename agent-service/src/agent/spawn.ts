import { decodeEventLog, encodeFunctionData, getAddress, type Address, type Log } from "viem";
import type { WebAuthnKey } from "@zerodev/webauthn-key";

import type { AgentServiceConfig } from "../config";
import type { AgentSkill } from "../types";
import { identityRegistryAbi } from "../abi/registries";
import { createPasskeyKernelAccount, type AgentKernelAccount } from "../zerodev/account";
import { buildAgentRegistrationFile, toAgentURI } from "./registration";

export interface SpawnParams {
  cfg: AgentServiceConfig;
  /** The CanHav skill the agent is spun up from. */
  skill: AgentSkill;
  /** Passkey public key from the client-side WebAuthn ceremony (no seed phrase). */
  webAuthnKey: WebAuthnKey;
}

export interface SpawnResult {
  agentId: bigint;
  agentAddress: Address;
  agentURI: string;
  account: AgentKernelAccount;
}

/**
 * Spin up an agent from a CanHav skill:
 *   1. create the agent's ZeroDev kernel account (passkey root, no seed phrase),
 *   2. build the ERC-8004 registration file from the skill,
 *   3. mint the on-chain identity via `IdentityRegistry.register(agentURI)`
 *      (gas sponsored by the ZeroDev paymaster),
 *   4. return the minted `agentId`.
 */
export async function spawnAgentFromSkill(params: SpawnParams): Promise<SpawnResult> {
  const { cfg, skill, webAuthnKey } = params;

  const account = await createPasskeyKernelAccount(cfg, webAuthnKey);

  const registrationFile = buildAgentRegistrationFile(skill);
  const agentURI = toAgentURI(registrationFile);

  const data = encodeFunctionData({
    abi: identityRegistryAbi,
    functionName: "register",
    args: [agentURI],
  });

  const userOpHash = await account.kernelClient.sendUserOperation({
    account: account.account,
    calls: [{ to: cfg.identityRegistry, data }],
  });
  const receipt = await account.kernelClient.waitForUserOperationReceipt({ hash: userOpHash });

  const agentId = parseRegisteredAgentId(receipt.logs, cfg.identityRegistry);
  return { agentId, agentAddress: account.address, agentURI, account };
}

/** Extract the minted agentId from the IdentityRegistry `Registered` event. */
function parseRegisteredAgentId(logs: readonly Log[], identityRegistry: Address): bigint {
  const registry = getAddress(identityRegistry);
  for (const log of logs) {
    if (getAddress(log.address) !== registry) continue;
    try {
      const decoded = decodeEventLog({
        abi: identityRegistryAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "Registered") {
        return decoded.args.agentId;
      }
    } catch {
      // Not a Registered event from our ABI — skip.
    }
  }
  throw new Error("Registered event not found in user-operation receipt logs.");
}
