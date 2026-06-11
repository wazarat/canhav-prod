import { createPublicClient, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import {
  createKernelAccount,
  createKernelAccountClient,
  type CreateKernelAccountReturnType,
} from "@zerodev/sdk";
import { getEntryPoint, KERNEL_V3_1 } from "@zerodev/sdk/constants";
import type { Signer } from "@zerodev/sdk/types";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { toPermissionValidator } from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";
import { CallPolicyVersion, toCallPolicy } from "@zerodev/permissions/policies";

import { chain, type AgentServiceConfig } from "../config";

const entryPoint = getEntryPoint("0.7");
const kernelVersion = KERNEL_V3_1;

function publicClient(cfg: AgentServiceConfig) {
  return createPublicClient({ chain, transport: http(cfg.rpcUrl) });
}

/**
 * Wraps a kernel smart account in a ZeroDev account client whose bundler +
 * paymaster both point at the ZeroDev unified RPC (gas-sponsored). The return
 * type is inferred and re-exported as {@link AgentKernelAccount}.
 */
function assembleAgentAccount(account: CreateKernelAccountReturnType, cfg: AgentServiceConfig) {
  const kernelClient = createKernelAccountClient({
    account,
    chain,
    bundlerTransport: http(cfg.zerodevRpc),
    paymaster: true,
  });
  return { account, kernelClient, address: account.address };
}

export type AgentKernelAccount = ReturnType<typeof assembleAgentAccount>;

/**
 * Create a kernel smart account whose ROOT authority is an **ECDSA signer** —
 * the user's self-custodial embedded wallet (e.g. a Privy social-login wallet),
 * passed in as a viem account / wallet client / EIP-1193 provider. No seed
 * phrase is ever handled by CanHav; the key stays in the wallet provider's TEE.
 *
 * Using the ECDSA validator (instead of the older passkey validator) also keeps
 * userOps sponsorable — ZeroDev's paymaster refuses to sponsor the unpatched
 * passkey validator contracts, which surfaced as `403 Unauthorized: wapk`.
 *
 * `index` salts the counterfactual address so a single login can own MANY
 * distinct agents — one per project (Entity) — each with its OWN address and
 * its own ERC-8004 tokenId. The caller derives `index` deterministically from
 * (userId, entitySlug), so re-spawning the same project agent is idempotent
 * (same address, no duplicate identity).
 */
export async function createEcdsaKernelAccount(
  cfg: AgentServiceConfig,
  signer: Signer,
  index?: bigint,
): Promise<AgentKernelAccount> {
  const client = publicClient(cfg);
  const ecdsaValidator = await signerToEcdsaValidator(client, {
    signer,
    entryPoint,
    kernelVersion,
  });

  const account = await createKernelAccount(client, {
    entryPoint,
    kernelVersion,
    plugins: { sudo: ecdsaValidator },
    ...(index !== undefined ? { index } : {}),
  });

  return assembleAgentAccount(account, cfg);
}

export interface ScopedSessionParams {
  /** Root authority (the user's embedded wallet) that approves the session. */
  signer: Signer;
  /** Session-key private key (the scoped, throwaway executor key). */
  sessionPrivateKey: Hex;
  /** Contracts the session key is permitted to call (on-chain scoping). */
  allowedTargets: Address[];
}

/**
 * Create a kernel smart account with the user's ECDSA signer as `sudo` (root)
 * and a **scoped session key** as the `regular` validator. The session key can
 * only call the `allowedTargets` (a `toCallPolicy` restriction), giving the
 * "owner-approved session" the agent executes under — still no seed phrase.
 * Used by `execute`.
 */
export async function createScopedSessionKernelAccount(
  cfg: AgentServiceConfig,
  params: ScopedSessionParams,
): Promise<AgentKernelAccount> {
  const client = publicClient(cfg);

  const sudoValidator = await signerToEcdsaValidator(client, {
    signer: params.signer,
    entryPoint,
    kernelVersion,
  });

  const sessionKeySigner = await toECDSASigner({
    signer: privateKeyToAccount(params.sessionPrivateKey),
  });

  // Restrict the session key to the allowlisted targets, value transfers off.
  const callPolicy = toCallPolicy({
    policyVersion: CallPolicyVersion.V0_0_4,
    permissions: params.allowedTargets.map((target) => ({ target, valueLimit: 0n })),
  });

  const sessionKeyValidator = await toPermissionValidator(client, {
    entryPoint,
    kernelVersion,
    signer: sessionKeySigner,
    policies: [callPolicy],
  });

  const account = await createKernelAccount(client, {
    entryPoint,
    kernelVersion,
    plugins: { sudo: sudoValidator, regular: sessionKeyValidator },
  });

  return assembleAgentAccount(account, cfg);
}
