"use client";

import type { ConnectedWallet } from "@privy-io/react-auth";

import {
  buildPrivyWalletClient,
  sendErc20Transfer,
  type Signer,
} from "@/lib/agent/privy-signer";

/**
 * Buyer-side x402 collaboration helpers (browser).
 *
 * Everything is signed in the browser by the user's Privy wallet (embedded or
 * external), which pays its own Sepolia gas. Flow: fetch the seller's 402
 * quote -> sign a USDC `transfer` to the seller's wallet -> hand the tx hash
 * to /api/collab/request for verification + settle. On-chain attestations
 * (CollabRegistry / CollabAgreement / ReputationRegistry) are plain
 * wallet-signed transactions gated through the SecurityRegistry allowlist.
 */

const DEFAULT_RPC = "https://sepolia-rollup.arbitrum.io/rpc";

const securityRegistryAbi = [
  {
    type: "function",
    name: "isAllowed",
    stateMutability: "view",
    inputs: [{ name: "target", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

/** Registry addresses + RPC the server hands back for on-chain writes. */
export interface OnchainWriteConfig {
  rpcUrl: string;
  securityRegistry: `0x${string}`;
}

async function publicClient(rpcUrl: string) {
  const { createPublicClient, http } = await import("viem");
  const { arbitrumSepolia } = await import("viem/chains");
  return createPublicClient({ chain: arbitrumSepolia, transport: http(rpcUrl || DEFAULT_RPC) });
}

/**
 * Gate: refuse to write to a target that isn't on the SecurityRegistry
 * allowlist — matching every other on-chain write in the platform.
 */
async function assertTargetAllowed(
  cfg: OnchainWriteConfig,
  target: `0x${string}`,
): Promise<void> {
  const client = await publicClient(cfg.rpcUrl);
  const allowed = await client.readContract({
    address: cfg.securityRegistry,
    abi: securityRegistryAbi,
    functionName: "isAllowed",
    args: [target],
  });
  if (!allowed) {
    throw new Error(`Target ${target} is not allowlisted by the SecurityRegistry.`);
  }
}

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
}): Promise<{ txHash: `0x${string}` }> {
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
 * Claim testnet credits (tCNHV) by calling `faucet()` from the user's Privy
 * wallet — the credits land in the same treasury wallet that spends them in
 * settlement. The token's faucet mint is always allowed regardless of the
 * transfer allowlist. The wallet pays its own Sepolia gas.
 */
export async function claimCredits(params: {
  wallet: ConnectedWallet;
  token: `0x${string}`;
  rpcUrl?: string;
}): Promise<{ txHash: `0x${string}` }> {
  const walletClient = await buildPrivyWalletClient(params.wallet);
  const hash = await walletClient.writeContract({
    abi: faucetAbi,
    address: params.token,
    functionName: "faucet",
    args: [],
  });
  const client = await publicClient(params.rpcUrl ?? DEFAULT_RPC);
  const receipt = await client.waitForTransactionReceipt({ hash });
  return { txHash: receipt.transactionHash };
}

/**
 * Transfer tCNHV credits from the user's Privy treasury wallet to any recipient
 * (plain ERC-20 transfer signed by the connected wallet).
 */
export async function transferCredits(params: {
  wallet: ConnectedWallet;
  token: `0x${string}`;
  payTo: `0x${string}`;
  /** Amount in base units (tCNHV = 18 decimals). */
  amount: string;
  rpcUrl?: string;
}): Promise<{ txHash: `0x${string}` }> {
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
export interface RecordParams extends OnchainWriteConfig {
  collabRegistry: `0x${string}`;
  fromAgentId: string;
  toAgentId: string;
  skillHash: `0x${string}`;
  paymentRef: `0x${string}`;
  /** Agreement this interaction belongs to (bytes32(0) for a one-off). */
  agreementId: `0x${string}`;
  /** Interaction magnitude recorded on-chain (data slices); must be > 0. */
  units: number;
}

/**
 * Attest a completed exchange on-chain via CollabRegistry.recordCollab, signed
 * by the buyer's wallet. Routed through the SecurityRegistry gate so a
 * non-allowlisted registry is refused.
 */
export async function recordCollabOnChain(params: {
  signer: Signer;
  record: RecordParams;
}): Promise<{ txHash: `0x${string}` }> {
  const { signer, record } = params;
  await assertTargetAllowed(record, record.collabRegistry);

  const hash = await signer.writeContract({
    abi: collabRegistryAbi,
    address: record.collabRegistry,
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
  const client = await publicClient(record.rpcUrl);
  const receipt = await client.waitForTransactionReceipt({ hash });
  return { txHash: receipt.transactionHash };
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
export interface EstablishParams extends OnchainWriteConfig {
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
}

/**
 * Anchor a human-approved agreement on-chain via CollabAgreement.establish,
 * signed by the buyer's wallet. Decodes the deterministic agreementId from the
 * AgreementEstablished event so the off-chain record can be linked to its
 * on-chain twin. Gated through the SecurityRegistry allowlist.
 */
export async function establishAgreementOnChain(params: {
  signer: Signer;
  establish: EstablishParams;
}): Promise<{ onChainAgreementId: `0x${string}`; txHash: `0x${string}` }> {
  const { signer, establish } = params;
  const { decodeEventLog } = await import("viem");

  await assertTargetAllowed(establish, establish.collabAgreement);

  const hash = await signer.writeContract({
    abi: collabAgreementAbi,
    address: establish.collabAgreement,
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
  const client = await publicClient(establish.rpcUrl);
  const receipt = await client.waitForTransactionReceipt({ hash });

  // Recover the agreementId from the AgreementEstablished event in the receipt.
  let onChainAgreementId: `0x${string}` | null = null;
  for (const log of receipt.logs ?? []) {
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
  return { onChainAgreementId, txHash: receipt.transactionHash };
}

/** Params returned by POST /api/collab/request for the per-period agreement write. */
export interface AgreementInteractionParams extends OnchainWriteConfig {
  collabAgreement: `0x${string}`;
  onChainAgreementId: `0x${string}`;
  units: number;
  /** Tokens/credits drawn this call, base units (checked vs the per-period budget). */
  tokens: string;
}

/**
 * Record one period's interaction on the CollabAgreement contract, enforcing the
 * agreed unit cap + cadence cooldown on-chain. Runs in addition to the
 * CollabRegistry attestation so every period lands two on-chain writes.
 */
export async function recordInteractionOnChain(params: {
  signer: Signer;
  interaction: AgreementInteractionParams;
}): Promise<{ txHash: `0x${string}` }> {
  const { signer, interaction } = params;
  await assertTargetAllowed(interaction, interaction.collabAgreement);

  const hash = await signer.writeContract({
    abi: collabAgreementAbi,
    address: interaction.collabAgreement,
    functionName: "recordInteraction",
    args: [
      interaction.onChainAgreementId,
      Math.max(1, Math.min(0xffffffff, Math.floor(interaction.units))),
      BigInt(interaction.tokens || "0"),
    ],
  });
  const client = await publicClient(interaction.rpcUrl);
  const receipt = await client.waitForTransactionReceipt({ hash });
  return { txHash: receipt.transactionHash };
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
export interface FeedbackParams extends OnchainWriteConfig {
  reputationRegistry: `0x${string}`;
  toAgentId: string;
  value: number;
  valueDecimals: number;
}

/**
 * Submit signed feedback on-chain via ReputationRegistry.giveFeedback (flag-off
 * by default; only invoked when the server returns FeedbackParams). Routed
 * through the SecurityRegistry gate like every other on-chain write.
 */
export async function submitFeedbackOnChain(params: {
  signer: Signer;
  feedback: FeedbackParams;
}): Promise<{ txHash: `0x${string}` }> {
  const { signer, feedback } = params;
  await assertTargetAllowed(feedback, feedback.reputationRegistry);

  const hash = await signer.writeContract({
    abi: reputationAbi,
    address: feedback.reputationRegistry,
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
  const client = await publicClient(feedback.rpcUrl);
  const receipt = await client.waitForTransactionReceipt({ hash });
  return { txHash: receipt.transactionHash };
}
