import {
  createPublicClient,
  decodeEventLog,
  encodeFunctionData,
  getAddress,
  http,
  stringToHex,
  type Address,
  type Hex,
  type Log,
} from "viem";
import type { WebAuthnKey } from "@zerodev/webauthn-key";

import { chain, type AgentServiceConfig } from "../config";
import type { AgentProductRef, AgentSkill } from "../types";
import { identityRegistryAbi } from "../abi/registries";
import { createPasskeyKernelAccount, type AgentKernelAccount } from "../zerodev/account";
import { buildAgentRegistrationFile, toAgentURI } from "./registration";

/** EIP-712 domain name/version of the ERC-8004 IdentityRegistry (reference impl). */
const WALLET_BINDING_DOMAIN_NAME = "ERC8004IdentityRegistry";
const WALLET_BINDING_DOMAIN_VERSION = "1";
/** Seconds added to the chain timestamp for the wallet-binding deadline (< 5 min). */
const WALLET_BINDING_TTL_SECONDS = 240n;

const agentWalletSetTypes = {
  AgentWalletSet: [
    { name: "agentId", type: "uint256" },
    { name: "newWallet", type: "address" },
    { name: "owner", type: "address" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

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
  /** The verified ERC-8004 `agentWallet` (== `agentAddress` on success), else null. */
  agentWallet: Address | null;
  /** Whether the signed wallet binding (setAgentWallet) landed on-chain. */
  walletVerified: boolean;
}

/**
 * Spin up an agent from a CanHav skill:
 *   1. create the agent's ZeroDev kernel account (passkey root, no seed phrase),
 *   2. build the ERC-8004 registration file from the skill,
 *   3. mint the on-chain identity via `IdentityRegistry.register(agentURI)`
 *      (gas sponsored by the ZeroDev paymaster),
 *   4. cryptographically bind the smart account to the identity via a signed
 *      `setAgentWallet` (ERC-1271), proving the account controls the identity,
 *   5. return the minted `agentId` and verified wallet.
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

  // The first userOp deploys the smart account, so its ERC-1271 isValidSignature
  // is live for the wallet-binding proof. Best-effort: a successful mint is kept
  // even if the binding userOp fails (e.g. transient paymaster issue).
  const walletVerified = await bindAgentWallet(cfg, account, agentId);

  return {
    agentId,
    agentAddress: account.address,
    agentURI,
    account,
    agentWallet: walletVerified ? account.address : null,
    walletVerified,
  };
}

/**
 * Bind the agent's ZeroDev smart account to its identity by signing the
 * ERC-8004 `AgentWalletSet` typed data (ERC-1271 via the kernel account) and
 * submitting `setAgentWallet`. Returns whether the binding landed on-chain.
 */
async function bindAgentWallet(
  cfg: AgentServiceConfig,
  account: AgentKernelAccount,
  agentId: bigint,
): Promise<boolean> {
  try {
    const publicClient = createPublicClient({ chain, transport: http(cfg.rpcUrl) });
    const block = await publicClient.getBlock();
    const deadline = block.timestamp + WALLET_BINDING_TTL_SECONDS;
    const wallet = account.address;

    const signature = (await account.account.signTypedData({
      domain: {
        name: WALLET_BINDING_DOMAIN_NAME,
        version: WALLET_BINDING_DOMAIN_VERSION,
        chainId: cfg.chainId,
        verifyingContract: cfg.identityRegistry,
      },
      types: agentWalletSetTypes,
      primaryType: "AgentWalletSet",
      message: { agentId, newWallet: wallet, owner: wallet, deadline },
    })) as Hex;

    const data = encodeFunctionData({
      abi: identityRegistryAbi,
      functionName: "setAgentWallet",
      args: [agentId, wallet, deadline, signature],
    });

    const opHash = await account.kernelClient.sendUserOperation({
      account: account.account,
      calls: [{ to: cfg.identityRegistry, data }],
    });
    await account.kernelClient.waitForUserOperationReceipt({ hash: opHash });
    return true;
  } catch (e) {
    // Non-fatal: the identity is minted; the wallet can be re-verified later.
    console.error(
      "[spawn] setAgentWallet binding failed:",
      e instanceof Error ? e.message : e,
    );
    return false;
  }
}

/** Build ERC-8004 MetadataEntry[] (key/bytes) for the agent's project binding. */
function buildMetadataEntries(
  entity: string | undefined,
  associatedProducts: AgentProductRef[] | undefined,
): { metadataKey: string; metadataValue: `0x${string}` }[] {
  const entries: { metadataKey: string; metadataValue: `0x${string}` }[] = [];
  if (entity) {
    entries.push({ metadataKey: "entity", metadataValue: stringToHex(entity) });
  }
  if (associatedProducts && associatedProducts.length > 0) {
    const csv = associatedProducts.map((p) => p.symbol).join(",");
    entries.push({ metadataKey: "products", metadataValue: stringToHex(csv) });
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
