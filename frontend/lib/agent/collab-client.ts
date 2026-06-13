"use client";

import type { Signer } from "@zerodev/sdk/types";

import type { SpawnMintConfig } from "@/lib/agent/spawn-client";

/**
 * Buyer-side x402 collaboration helpers (browser).
 *
 * Settlement is signed in the browser because the buyer agent's ZeroDev smart
 * account is driven by the user's Privy embedded signer (keys in Privy's TEE).
 * Flow: fetch the seller's 402 quote (canonical x402 v2 `accepts[]`) -> sign a
 * gas-sponsored USDC `transfer` to the seller's wallet -> hand the tx hash to
 * /api/collab/request, which wraps it in the canonical x402 v2 `X-PAYMENT`
 * payload for the seller's facilitator to verify + settle.
 *
 * Deviation from the reference x402 implementation: the canonical EVM `exact`
 * scheme settles via EIP-3009 `transferWithAuthorization` through a CDP
 * facilitator on Arbitrum One. A ZeroDev Kernel (ERC-4337) smart account cannot
 * produce that authorization signature, so we keep the wire format but settle
 * with a smart-account `transfer` on Arbitrum Sepolia (see lib/server/x402.ts).
 */

const erc20Abi = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export interface SellerQuote {
  payTo: `0x${string}`;
  asset: `0x${string}`;
  /** Required amount in base units (USDC = 6 decimals). */
  amount: string;
  humanAmount: string;
}

/** Ask the seller route for its 402 challenge (no payment) to learn payTo + amount. */
export async function getSellerQuote(params: {
  toAgentId: string;
  fromAgentId?: string;
}): Promise<SellerQuote> {
  const res = await fetch("/api/collab/strategy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      toAgentId: params.toAgentId,
      fromAgentId: params.fromAgentId,
    }),
  });
  // Expect HTTP 402 with the challenge body.
  const data = (await res.json()) as {
    accepts?: {
      payTo: string;
      asset: string;
      maxAmountRequired: string;
      humanAmount: string;
    }[];
    error?: string;
  };
  const accept = data.accepts?.[0];
  if (!accept) {
    throw new Error(data.error ?? "Seller did not return a payment quote.");
  }
  return {
    payTo: accept.payTo as `0x${string}`,
    asset: accept.asset as `0x${string}`,
    amount: accept.maxAmountRequired,
    humanAmount: accept.humanAmount,
  };
}

/**
 * Sign + send a gas-sponsored USDC transfer from the buyer agent's smart account
 * to the seller's wallet. Returns the settling on-chain tx hash (the x402
 * payment reference).
 */
export async function payStrategy(params: {
  signer: Signer;
  accountIndex: number;
  mintConfig: SpawnMintConfig;
  quote: SellerQuote;
}): Promise<{ txHash: `0x${string}`; userOpHash: string }> {
  const svc = await import("canhav-agent-service");
  const { encodeFunctionData } = await import("viem");

  const cfg = svc.createConfig({
    zerodevRpc: params.mintConfig.zerodevRpc,
    rpcUrl: params.mintConfig.rpcUrl,
    identityRegistry: params.mintConfig.identityRegistry,
    securityRegistry: params.mintConfig.securityRegistry,
  });

  const account = await svc.createEcdsaKernelAccount(
    cfg,
    params.signer,
    BigInt(params.accountIndex),
  );

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [params.quote.payTo, BigInt(params.quote.amount)],
  });

  const userOpHash = await account.kernelClient.sendUserOperation({
    account: account.account,
    calls: [{ to: params.quote.asset, data }],
  });
  const receipt = await account.kernelClient.waitForUserOperationReceipt({ hash: userOpHash });
  return { txHash: receipt.receipt.transactionHash, userOpHash };
}

const faucetAbi = [
  { type: "function", name: "faucet", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

/**
 * Claim testnet credits (tCNHV) for the buyer agent by sending a gas-sponsored
 * `faucet()` userOp from the agent's own kernel account — so the credits land in
 * the same smart account that spends them in settlement (no popup, no gas). The
 * token's faucet mint is always allowed regardless of the transfer allowlist.
 */
export async function claimCredits(params: {
  signer: Signer;
  accountIndex: number;
  mintConfig: SpawnMintConfig;
  token: `0x${string}`;
}): Promise<{ txHash: `0x${string}`; userOpHash: string }> {
  const svc = await import("canhav-agent-service");
  const { encodeFunctionData } = await import("viem");

  const cfg = svc.createConfig({
    zerodevRpc: params.mintConfig.zerodevRpc,
    rpcUrl: params.mintConfig.rpcUrl,
    identityRegistry: params.mintConfig.identityRegistry,
    securityRegistry: params.mintConfig.securityRegistry,
  });

  const account = await svc.createEcdsaKernelAccount(cfg, params.signer, BigInt(params.accountIndex));
  const data = encodeFunctionData({ abi: faucetAbi, functionName: "faucet", args: [] });

  const userOpHash = await account.kernelClient.sendUserOperation({
    account: account.account,
    calls: [{ to: params.token, data }],
  });
  const receipt = await account.kernelClient.waitForUserOperationReceipt({ hash: userOpHash });
  return { txHash: receipt.receipt.transactionHash, userOpHash };
}

const collabRegistryAbi = [
  {
    type: "function",
    name: "recordCollab",
    stateMutability: "nonpayable",
    inputs: [
      { name: "fromAgentId", type: "uint256" },
      { name: "toAgentId", type: "uint256" },
      { name: "skillHash", type: "bytes32" },
      { name: "paymentRef", type: "bytes32" },
      { name: "agreementId", type: "bytes32" },
      { name: "units", type: "uint32" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/** Params returned by POST /api/collab/request for the on-chain attestation. */
export interface RecordParams {
  collabRegistry: `0x${string}`;
  fromAgentId: string;
  toAgentId: string;
  skillHash: `0x${string}`;
  paymentRef: `0x${string}`;
  /** Agreement this interaction belongs to (bytes32(0) for a one-off). */
  agreementId: `0x${string}`;
  /** Interaction magnitude recorded on-chain (data slices); must be > 0. */
  units: number;
  accountIndex: number;
  mintConfig: SpawnMintConfig;
}

/**
 * Attest a completed exchange on-chain via CollabRegistry.recordCollab, signed by
 * the buyer agent's kernel account. Routed through the SecurityRegistry gate
 * (`assertTargetAllowed`) so a non-allowlisted registry is refused — matching
 * every other on-chain write in the platform.
 */
export async function recordCollabOnChain(params: {
  signer: Signer;
  record: RecordParams;
}): Promise<{ userOpHash: string; txHash: string }> {
  const { signer, record } = params;
  const svc = await import("canhav-agent-service");
  const { encodeFunctionData } = await import("viem");

  const cfg = svc.createConfig({
    zerodevRpc: record.mintConfig.zerodevRpc,
    rpcUrl: record.mintConfig.rpcUrl,
    identityRegistry: record.mintConfig.identityRegistry,
    securityRegistry: record.mintConfig.securityRegistry,
  });

  // Gate: refuse to write to a registry that isn't on the SecurityRegistry allowlist.
  await svc.assertTargetAllowed(cfg, record.collabRegistry);

  const account = await svc.createEcdsaKernelAccount(cfg, signer, BigInt(record.accountIndex));
  const data = encodeFunctionData({
    abi: collabRegistryAbi,
    functionName: "recordCollab",
    args: [
      BigInt(record.fromAgentId),
      BigInt(record.toAgentId),
      record.skillHash,
      record.paymentRef,
      record.agreementId,
      Math.max(1, Math.min(0xffffffff, Math.floor(record.units))),
    ],
  });

  const userOpHash = await account.kernelClient.sendUserOperation({
    account: account.account,
    calls: [{ to: record.collabRegistry, data }],
  });
  const receipt = await account.kernelClient.waitForUserOperationReceipt({ hash: userOpHash });
  return { userOpHash, txHash: receipt.receipt.transactionHash };
}

const reputationAbi = [
  {
    type: "function",
    name: "giveFeedback",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "value", type: "int128" },
      { name: "valueDecimals", type: "uint8" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
      { name: "endpoint", type: "string" },
      { name: "feedbackURI", type: "string" },
      { name: "feedbackHash", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;

/** Params returned by POST /api/collab/feedback when the on-chain hook is enabled. */
export interface FeedbackParams {
  reputationRegistry: `0x${string}`;
  toAgentId: string;
  value: number;
  valueDecimals: number;
  accountIndex: number;
  mintConfig: SpawnMintConfig;
}

/**
 * Submit signed feedback on-chain via ReputationRegistry.giveFeedback (flag-off
 * by default; only invoked when the server returns FeedbackParams). Routed
 * through the SecurityRegistry gate like every other on-chain write.
 */
export async function submitFeedbackOnChain(params: {
  signer: Signer;
  feedback: FeedbackParams;
}): Promise<{ userOpHash: string }> {
  const { signer, feedback } = params;
  const svc = await import("canhav-agent-service");
  const { encodeFunctionData } = await import("viem");

  const cfg = svc.createConfig({
    zerodevRpc: feedback.mintConfig.zerodevRpc,
    rpcUrl: feedback.mintConfig.rpcUrl,
    identityRegistry: feedback.mintConfig.identityRegistry,
    securityRegistry: feedback.mintConfig.securityRegistry,
  });

  await svc.assertTargetAllowed(cfg, feedback.reputationRegistry);

  const account = await svc.createEcdsaKernelAccount(cfg, signer, BigInt(feedback.accountIndex));
  const data = encodeFunctionData({
    abi: reputationAbi,
    functionName: "giveFeedback",
    args: [
      BigInt(feedback.toAgentId),
      BigInt(feedback.value),
      feedback.valueDecimals,
      "collab",
      "",
      "",
      "",
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    ],
  });

  const userOpHash = await account.kernelClient.sendUserOperation({
    account: account.account,
    calls: [{ to: feedback.reputationRegistry, data }],
  });
  await account.kernelClient.waitForUserOperationReceipt({ hash: userOpHash });
  return { userOpHash };
}
