"use client";

import type { ConnectedWallet } from "@privy-io/react-auth";
import type { Signer } from "@zerodev/sdk/types";

import { sendErc20Transfer } from "@/lib/agent/privy-signer";
import type { SpawnMintConfig } from "@/lib/agent/spawn-client";

/**
 * Buyer-side x402 collaboration helpers (browser).
 *
 * Settlement is signed in the browser from the user's Privy wallet. Flow: fetch
 * the seller's 402 quote -> sign a USDC `transfer` to the seller's wallet ->
 * hand the tx hash to /api/collab/request for verification + settle.
 *
 * When USE_ZERODEV=true, legacy gas-sponsored userOps from agent kernel accounts
 * remain available for agent-scoped flows.
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
 * Sign + send a USDC transfer from the buyer's Privy wallet to the seller.
 * Returns the settling on-chain tx hash (the x402 payment reference).
 */
export async function payStrategy(params: {
  wallet: ConnectedWallet;
  quote: SellerQuote;
  rpcUrl?: string;
  /** Legacy ZeroDev path — only when mintConfig is provided. */
  signer?: Signer;
  accountIndex?: number;
  mintConfig?: SpawnMintConfig;
}): Promise<{ txHash: `0x${string}`; userOpHash?: string }> {
  if (params.mintConfig && params.signer != null && params.accountIndex != null) {
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

  const { txHash } = await sendErc20Transfer({
    wallet: params.wallet,
    token: params.quote.asset,
    to: params.quote.payTo,
    amount: BigInt(params.quote.amount),
    rpcUrl: params.rpcUrl,
  });
  return { txHash };
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

/**
 * Transfer tCNHV credits from the user's Privy treasury wallet to any recipient.
 * Default path: plain ERC-20 transfer signed by the embedded wallet.
 * Legacy path (mintConfig provided): gas-sponsored userOp from a ZeroDev kernel.
 */
export async function transferCredits(params: {
  wallet: ConnectedWallet;
  token: `0x${string}`;
  payTo: `0x${string}`;
  /** Amount in base units (tCNHV = 18 decimals). */
  amount: string;
  rpcUrl?: string;
  /** Legacy ZeroDev path — only when mintConfig is provided. */
  signer?: Signer;
  accountIndex?: number;
  mintConfig?: SpawnMintConfig;
}): Promise<{ txHash: `0x${string}`; userOpHash?: string }> {
  if (params.mintConfig && params.signer != null && params.accountIndex != null) {
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
      args: [params.payTo, BigInt(params.amount)],
    });

    const userOpHash = await account.kernelClient.sendUserOperation({
      account: account.account,
      calls: [{ to: params.token, data }],
    });
    const receipt = await account.kernelClient.waitForUserOperationReceipt({ hash: userOpHash });
    return { txHash: receipt.receipt.transactionHash, userOpHash };
  }

  const { txHash } = await sendErc20Transfer({
    wallet: params.wallet,
    token: params.token,
    to: params.payTo,
    amount: BigInt(params.amount),
    rpcUrl: params.rpcUrl,
  });
  return { txHash };
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

const collabAgreementAbi = [
  {
    type: "function",
    name: "establish",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "p",
        type: "tuple",
        components: [
          { name: "buyerAgentId", type: "uint256" },
          { name: "sellerAgentId", type: "uint256" },
          { name: "maxUnitsPerInteraction", type: "uint32" },
          { name: "installments", type: "uint32" },
          { name: "pricePerInstallment", type: "uint256" },
          { name: "minInteractionInterval", type: "uint64" },
          { name: "expiry", type: "uint64" },
          { name: "mode", type: "uint8" },
          { name: "cadence", type: "uint8" },
          { name: "callBudgetPerPeriod", type: "uint32" },
          { name: "tokenBudgetPerPeriod", type: "uint256" },
          { name: "updatesPerPeriod", type: "uint32" },
          { name: "duneLinked", type: "bool" },
          { name: "termsHash", type: "bytes32" },
        ],
      },
    ],
    outputs: [{ name: "agreementId", type: "bytes32" }],
  },
  {
    type: "function",
    name: "recordInteraction",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agreementId", type: "bytes32" },
      { name: "units", type: "uint32" },
      { name: "tokens", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "AgreementEstablished",
    inputs: [
      { name: "agreementId", type: "bytes32", indexed: true },
      { name: "buyerAgentId", type: "uint256", indexed: true },
      { name: "sellerAgentId", type: "uint256", indexed: true },
      { name: "maxUnitsPerInteraction", type: "uint32", indexed: false },
      { name: "installments", type: "uint32", indexed: false },
      { name: "pricePerInstallment", type: "uint256", indexed: false },
      { name: "minInteractionInterval", type: "uint64", indexed: false },
      { name: "expiry", type: "uint64", indexed: false },
      { name: "establisher", type: "address", indexed: false },
      { name: "mode", type: "uint8", indexed: false },
      { name: "cadence", type: "uint8", indexed: false },
      { name: "callBudgetPerPeriod", type: "uint32", indexed: false },
      { name: "tokenBudgetPerPeriod", type: "uint256", indexed: false },
      { name: "updatesPerPeriod", type: "uint32", indexed: false },
      { name: "duneLinked", type: "bool", indexed: false },
      { name: "termsHash", type: "bytes32", indexed: false },
    ],
  },
] as const;

/** Params returned by the agreement anchor preflight for CollabAgreement.establish. */
export interface EstablishParams {
  collabAgreement: `0x${string}`;
  /** Numeric ERC-8004 agent ids (on-chain establish takes uint256). */
  buyerAgentId: string;
  sellerAgentId: string;
  maxUnitsPerInteraction: number;
  installments: number;
  /** Price per installment in settlement-asset base units. */
  pricePerInstallment: string;
  /** Cooldown between interactions, seconds (the cadence-derived interval). */
  minInteractionInterval: number;
  /** Unix seconds; 0 for no expiry. */
  expiry: number;
  /** Mode enum: 0 = OneTime, 1 = Recurring. */
  mode: number;
  /** Cadence enum: 0 = None, 1 = Daily, 2 = Weekly, 3 = Monthly. */
  cadence: number;
  /** Max calls per period (0 = one call per period, cooldown-gated). */
  callBudgetPerPeriod: number;
  /** Max tokens/credits per period in base units (0 = unlimited). */
  tokenBudgetPerPeriod: string;
  /** Updates the seller delivers per period (informational). */
  updatesPerPeriod: number;
  /** Whether the deliverable links to a Dune dashboard. */
  duneLinked: boolean;
  /** keccak of the canonical off-chain terms (bytes32 hex). */
  termsHash: `0x${string}`;
  accountIndex: number;
  mintConfig: SpawnMintConfig;
}

/**
 * Anchor a human-approved agreement on-chain via CollabAgreement.establish,
 * signed by the buyer agent's kernel account. Decodes the deterministic
 * agreementId from the AgreementEstablished event so the off-chain record can be
 * linked to its on-chain twin. Gated through the SecurityRegistry allowlist.
 */
export async function establishAgreementOnChain(params: {
  signer: Signer;
  establish: EstablishParams;
}): Promise<{ onChainAgreementId: `0x${string}`; txHash: string; userOpHash: string }> {
  const { signer, establish } = params;
  const svc = await import("canhav-agent-service");
  const { encodeFunctionData, decodeEventLog } = await import("viem");

  const cfg = svc.createConfig({
    zerodevRpc: establish.mintConfig.zerodevRpc,
    rpcUrl: establish.mintConfig.rpcUrl,
    identityRegistry: establish.mintConfig.identityRegistry,
    securityRegistry: establish.mintConfig.securityRegistry,
  });

  await svc.assertTargetAllowed(cfg, establish.collabAgreement);

  const account = await svc.createEcdsaKernelAccount(cfg, signer, BigInt(establish.accountIndex));
  const data = encodeFunctionData({
    abi: collabAgreementAbi,
    functionName: "establish",
    args: [
      {
        buyerAgentId: BigInt(establish.buyerAgentId),
        sellerAgentId: BigInt(establish.sellerAgentId),
        maxUnitsPerInteraction: Math.max(
          1,
          Math.min(0xffffffff, Math.floor(establish.maxUnitsPerInteraction)),
        ),
        installments: Math.max(1, Math.min(0xffffffff, Math.floor(establish.installments))),
        pricePerInstallment: BigInt(establish.pricePerInstallment),
        minInteractionInterval: BigInt(Math.max(0, Math.floor(establish.minInteractionInterval))),
        expiry: BigInt(Math.max(0, Math.floor(establish.expiry))),
        mode: Math.max(0, Math.min(255, Math.floor(establish.mode))),
        cadence: Math.max(0, Math.min(255, Math.floor(establish.cadence))),
        callBudgetPerPeriod: Math.max(
          0,
          Math.min(0xffffffff, Math.floor(establish.callBudgetPerPeriod)),
        ),
        tokenBudgetPerPeriod: BigInt(establish.tokenBudgetPerPeriod),
        updatesPerPeriod: Math.max(0, Math.min(0xffffffff, Math.floor(establish.updatesPerPeriod))),
        duneLinked: Boolean(establish.duneLinked),
        termsHash: establish.termsHash,
      },
    ],
  });

  const userOpHash = await account.kernelClient.sendUserOperation({
    account: account.account,
    calls: [{ to: establish.collabAgreement, data }],
  });
  const receipt = await account.kernelClient.waitForUserOperationReceipt({ hash: userOpHash });

  // Recover the agreementId from the AgreementEstablished event in the receipt.
  let onChainAgreementId: `0x${string}` | null = null;
  const logs = receipt.receipt.logs ?? [];
  for (const log of logs) {
    if (log.address.toLowerCase() !== establish.collabAgreement.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({
        abi: collabAgreementAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "AgreementEstablished") {
        onChainAgreementId = (decoded.args as { agreementId: `0x${string}` }).agreementId;
        break;
      }
    } catch {
      /* not our event — skip */
    }
  }
  if (!onChainAgreementId) {
    throw new Error("Anchored, but could not read the on-chain agreement id from the receipt.");
  }
  return { onChainAgreementId, txHash: receipt.receipt.transactionHash, userOpHash };
}

/** Params returned by POST /api/collab/request for the per-period agreement write. */
export interface AgreementInteractionParams {
  collabAgreement: `0x${string}`;
  onChainAgreementId: `0x${string}`;
  units: number;
  /** Tokens/credits drawn this call, base units (checked vs the per-period budget). */
  tokens: string;
  accountIndex: number;
  mintConfig: SpawnMintConfig;
}

/**
 * Record one period's interaction on the CollabAgreement contract, enforcing the
 * agreed unit cap + cadence cooldown on-chain. Runs in addition to the
 * CollabRegistry attestation so every period lands two on-chain writes.
 */
export async function recordInteractionOnChain(params: {
  signer: Signer;
  interaction: AgreementInteractionParams;
}): Promise<{ userOpHash: string; txHash: string }> {
  const { signer, interaction } = params;
  const svc = await import("canhav-agent-service");
  const { encodeFunctionData } = await import("viem");

  const cfg = svc.createConfig({
    zerodevRpc: interaction.mintConfig.zerodevRpc,
    rpcUrl: interaction.mintConfig.rpcUrl,
    identityRegistry: interaction.mintConfig.identityRegistry,
    securityRegistry: interaction.mintConfig.securityRegistry,
  });

  await svc.assertTargetAllowed(cfg, interaction.collabAgreement);

  const account = await svc.createEcdsaKernelAccount(
    cfg,
    signer,
    BigInt(interaction.accountIndex),
  );
  const data = encodeFunctionData({
    abi: collabAgreementAbi,
    functionName: "recordInteraction",
    args: [
      interaction.onChainAgreementId,
      Math.max(1, Math.min(0xffffffff, Math.floor(interaction.units))),
      BigInt(interaction.tokens || "0"),
    ],
  });

  const userOpHash = await account.kernelClient.sendUserOperation({
    account: account.account,
    calls: [{ to: interaction.collabAgreement, data }],
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
