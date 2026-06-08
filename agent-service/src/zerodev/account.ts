import { createPublicClient, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import {
  createKernelAccount,
  createKernelAccountClient,
  type CreateKernelAccountReturnType,
} from "@zerodev/sdk";
import { getEntryPoint, KERNEL_V3_1 } from "@zerodev/sdk/constants";
import { PasskeyValidatorContractVersion, toPasskeyValidator } from "@zerodev/passkey-validator";
import type { WebAuthnKey } from "@zerodev/webauthn-key";
import { toPermissionValidator } from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";
import { CallPolicyVersion, toCallPolicy } from "@zerodev/permissions/policies";

import { chain, type AgentServiceConfig } from "../config";

const entryPoint = getEntryPoint("0.7");
const kernelVersion = KERNEL_V3_1;

// Passkey validator contract version compatible with Kernel v3.1.
const PASSKEY_CONTRACT_VERSION = PasskeyValidatorContractVersion.V0_0_2_UNPATCHED;

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
 * Create a kernel smart account whose ROOT authority is a **passkey** (WebAuthn)
 * validator — no seed phrase anywhere. The `webAuthnKey` is produced by the
 * client-side passkey ceremony and passed in. Used by `spawn` to mint the
 * ERC-8004 identity under the owner's passkey.
 */
export async function createPasskeyKernelAccount(
  cfg: AgentServiceConfig,
  webAuthnKey: WebAuthnKey,
): Promise<AgentKernelAccount> {
  const client = publicClient(cfg);
  const passkeyValidator = await toPasskeyValidator(client, {
    webAuthnKey,
    entryPoint,
    kernelVersion,
    validatorContractVersion: PASSKEY_CONTRACT_VERSION,
  });

  const account = await createKernelAccount(client, {
    entryPoint,
    kernelVersion,
    plugins: { sudo: passkeyValidator },
  });

  return assembleAgentAccount(account, cfg);
}

export interface ScopedSessionParams {
  /** Passkey public key (root authority that approves the session). */
  webAuthnKey: WebAuthnKey;
  /** Session-key private key (the scoped, throwaway executor key). */
  sessionPrivateKey: Hex;
  /** Contracts the session key is permitted to call (on-chain scoping). */
  allowedTargets: Address[];
}

/**
 * Create a kernel smart account with the passkey as `sudo` (root) and a **scoped
 * session key** as the `regular` validator. The session key can only call the
 * `allowedTargets` (a `toCallPolicy` restriction), giving the "passkey-approved
 * session" the user described — still no seed phrase. Used by `execute`.
 */
export async function createScopedSessionKernelAccount(
  cfg: AgentServiceConfig,
  params: ScopedSessionParams,
): Promise<AgentKernelAccount> {
  const client = publicClient(cfg);

  const passkeyValidator = await toPasskeyValidator(client, {
    webAuthnKey: params.webAuthnKey,
    entryPoint,
    kernelVersion,
    validatorContractVersion: PASSKEY_CONTRACT_VERSION,
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
    plugins: { sudo: passkeyValidator, regular: sessionKeyValidator },
  });

  return assembleAgentAccount(account, cfg);
}
