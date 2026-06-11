"use client";

import type { Signer } from "@zerodev/sdk/types";

import type { SpawnMintConfig } from "@/lib/agent/spawn-client";

/**
 * Buyer-side x402 collaboration helpers (browser).
 *
 * Settlement is signed in the browser because the buyer agent's ZeroDev smart
 * account is driven by the user's Privy embedded signer (keys in Privy's TEE).
 * Flow: fetch the seller's 402 quote -> sign a gas-sponsored USDC `transfer` to
 * the seller's wallet -> hand the tx hash to /api/collab/request as the payment
 * reference.
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
  skillId: string;
  toAgentId: string;
  fromAgentId: string;
}): Promise<SellerQuote> {
  const res = await fetch("/api/collab/strategy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skillId: params.skillId, toAgentId: params.toAgentId }),
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
}): Promise<{ userOpHash: string }> {
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
    ],
  });

  const userOpHash = await account.kernelClient.sendUserOperation({
    account: account.account,
    calls: [{ to: record.collabRegistry, data }],
  });
  await account.kernelClient.waitForUserOperationReceipt({ hash: userOpHash });
  return { userOpHash };
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
