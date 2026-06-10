import {
  decodeEventLog,
  encodeFunctionData,
  getAddress,
  stringToHex,
  type Address,
  type Log,
} from "viem";
import type { WebAuthnKey } from "@zerodev/webauthn-key";

import type { AgentServiceConfig } from "../config";
import type { AgentProductRef, AgentSkill } from "../types";
import { identityRegistryAbi } from "../abi/registries";
import { createPasskeyKernelAccount, type AgentKernelAccount } from "../zerodev/account";
import { buildAgentRegistrationFile, toAgentURI } from "./registration";

export interface SpawnParams {
  cfg: AgentServiceConfig;
  /** The CanHav skill the agent is spun up from. */
  skill: AgentSkill;
  /** Passkey public key from the client-side WebAuthn ceremony (no seed phrase). */
  webAuthnKey: WebAuthnKey;
  /** Salt for the agent's distinct smart-account address (one per project). */
  index?: bigint;
  /** The Entity ("project") slug this agent is bound to. */
  entity?: string;
  /** Member products the agent is scoped to (written on-chain as metadata). */
  associatedProducts?: AgentProductRef[];
  /**
   * Public base URL of the CanHav app. When set, the minted `tokenURI` points at
   * the hosted, discoverable agent card instead of the on-chain data URI.
   */
  baseUrl?: string;
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
  const { cfg, skill, webAuthnKey, index, entity, associatedProducts, baseUrl } = params;

  const account = await createPasskeyKernelAccount(cfg, webAuthnKey, index);

  const registrationFile = buildAgentRegistrationFile(skill, { entity, associatedProducts });
  // Prefer the hosted, discoverable agent card (address is known pre-mint); the
  // helper falls back to the on-chain data URI when no baseUrl is provided.
  const agentURI = toAgentURI(registrationFile, { baseUrl, address: account.address });

  // Write the project binding on-chain as ERC-8004 metadata when present, using
  // the register(agentURI, MetadataEntry[]) overload. Falls back to the plain
  // register(agentURI) when the agent is a general (unbound) research agent.
  const metadata = buildMetadataEntries(entity, associatedProducts);
  const data =
    metadata.length > 0
      ? encodeFunctionData({
          abi: identityRegistryAbi,
          functionName: "register",
          args: [agentURI, metadata],
        })
      : encodeFunctionData({
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

/** Build ERC-8004 MetadataEntry[] (key/bytes) for the agent's project binding. */
function buildMetadataEntries(
  entity: string | undefined,
  associatedProducts: AgentProductRef[] | undefined,
): { key: string; value: `0x${string}` }[] {
  const entries: { key: string; value: `0x${string}` }[] = [];
  if (entity) {
    entries.push({ key: "entity", value: stringToHex(entity) });
  }
  if (associatedProducts && associatedProducts.length > 0) {
    const csv = associatedProducts.map((p) => p.symbol).join(",");
    entries.push({ key: "products", value: stringToHex(csv) });
  }
  return entries;
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
