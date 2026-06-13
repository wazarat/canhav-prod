import "server-only";

import { collabUsdcAsset, formatUsdc, USDC_DECIMALS } from "@/lib/agent/collab-config";
import { verifyUsdcTransfer, type VerifyTransferResult } from "@/lib/server/collabPayments";

/**
 * Canonical x402 v2 wire format on Arbitrum Sepolia.
 *
 * We adopt the canonical x402 shapes — the structured `accepts[]` /
 * `PaymentRequirements` in the 402 challenge, the base64 `X-PAYMENT` request
 * header, and the base64 `X-PAYMENT-RESPONSE` settlement header — but keep the
 * existing **smart-account USDC transfer** as the settlement primitive instead
 * of the reference's EIP-3009 `transferWithAuthorization` + CDP facilitator.
 *
 * Why the deviation: the buyer is a ZeroDev Kernel (ERC-4337) smart account,
 * which cannot produce a canonical EIP-3009 authorization signature. So the
 * buyer's smart account performs a gas-sponsored `transfer` and hands us the
 * settling tx hash inside the structured `X-PAYMENT` payload; our facilitator
 * `verify()` proves that transfer on-chain (decoding the ERC-20 `Transfer`
 * event) and `settle()` returns the confirmed settlement as `X-PAYMENT-RESPONSE`.
 *
 * This keeps the platform interoperable with x402 tooling at the wire level
 * while staying on Arbitrum Sepolia with our existing on-chain settlement.
 */

export const X402_VERSION = 1;
export const X402_SCHEME = "exact" as const;
/** CAIP-2 network id for Arbitrum Sepolia. */
export const X402_NETWORK = "eip155:421614" as const;
export const X402_NETWORK_NAME = "arbitrum-sepolia" as const;
/** Documents that settlement is a smart-account transfer, not EIP-3009. */
export const X402_SETTLEMENT = "smart-account-transfer" as const;

export interface PaymentRequirements {
  scheme: typeof X402_SCHEME;
  network: typeof X402_NETWORK;
  /** Amount required, in asset base units (USDC = 6 decimals), as a string. */
  maxAmountRequired: string;
  /** Human-readable amount (kept for back-compat with the buyer client). */
  humanAmount: string;
  /** Stable resource identifier the payment unlocks. */
  resource: string;
  description: string;
  mimeType: string;
  /** Seller wallet that must receive the funds. */
  payTo: string;
  /** Settlement asset (testnet USDC) address. */
  asset: string;
  maxTimeoutSeconds: number;
  /** Non-standard descriptors for this deployment. */
  extra: {
    name: string;
    decimals: number;
    chainId: number;
    networkName: string;
    settlement: typeof X402_SETTLEMENT;
  };
}

export interface PaymentChallenge {
  x402Version: number;
  error: string;
  accepts: PaymentRequirements[];
}

/** Structured X-PAYMENT payload (base64-encoded on the wire). */
export interface PaymentPayload {
  x402Version: number;
  scheme: typeof X402_SCHEME;
  network: typeof X402_NETWORK;
  payload: {
    /** Settling tx hash from the buyer smart account's USDC transfer. */
    txHash: string;
    /** Buyer wallet (smart account) that sent the funds, when known. */
    from?: string | null;
    settlement: typeof X402_SETTLEMENT;
  };
}

/** Structured X-PAYMENT-RESPONSE payload (base64-encoded on the wire). */
export interface PaymentSettlement {
  success: boolean;
  txHash: string;
  network: typeof X402_NETWORK;
  networkName: typeof X402_NETWORK_NAME;
  payer: string | null;
  payTo: string;
  asset: string;
  amount: string;
  humanAmount: string;
  settlement: typeof X402_SETTLEMENT;
}

export interface BuildRequirementsInput {
  payTo: string;
  amount: bigint;
  resource: string;
  description: string;
  asset?: string;
}

/** Build a single canonical x402 `PaymentRequirements` entry. */
export function buildPaymentRequirements(input: BuildRequirementsInput): PaymentRequirements {
  const asset = input.asset ?? collabUsdcAsset();
  return {
    scheme: X402_SCHEME,
    network: X402_NETWORK,
    maxAmountRequired: input.amount.toString(),
    humanAmount: formatUsdc(input.amount),
    resource: input.resource,
    description: input.description,
    mimeType: "application/json",
    payTo: input.payTo,
    asset,
    maxTimeoutSeconds: 1200,
    extra: {
      name: "USDC",
      decimals: USDC_DECIMALS,
      chainId: 421614,
      networkName: X402_NETWORK_NAME,
      settlement: X402_SETTLEMENT,
    },
  };
}

/** Build the full 402 challenge body. */
export function buildPaymentChallenge(
  requirements: PaymentRequirements | PaymentRequirements[],
  error = "Payment required.",
): PaymentChallenge {
  return {
    x402Version: X402_VERSION,
    error,
    accepts: Array.isArray(requirements) ? requirements : [requirements],
  };
}

/** Encode a structured X-PAYMENT payload to its base64 wire form. */
export function encodePaymentHeader(payload: PaymentPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

/**
 * Decode an X-PAYMENT header. Accepts both the canonical base64-JSON payload and
 * a bare `0x…` tx hash (legacy / direct callers), so the wire upgrade is
 * backward-compatible. Returns the settling tx hash + buyer wallet, or null.
 */
export function decodePaymentHeader(
  header: string | null | undefined,
): { txHash: string; from: string | null } | null {
  const raw = (header ?? "").trim();
  if (!raw) return null;

  // Bare tx hash (legacy callers).
  if (/^0x[0-9a-fA-F]{64}$/.test(raw)) {
    return { txHash: raw, from: null };
  }

  // Canonical base64-encoded JSON payload.
  try {
    const json = Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(json) as Partial<PaymentPayload>;
    const txHash = parsed?.payload?.txHash;
    if (typeof txHash === "string" && /^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      return { txHash, from: parsed.payload?.from ?? null };
    }
  } catch {
    /* fall through */
  }
  return null;
}

/** Encode an X-PAYMENT-RESPONSE settlement payload to its base64 wire form. */
export function encodePaymentResponseHeader(settlement: PaymentSettlement): string {
  return Buffer.from(JSON.stringify(settlement), "utf8").toString("base64");
}

/** Decode an X-PAYMENT-RESPONSE header (for the buyer/observer side). */
export function decodePaymentResponseHeader(
  header: string | null | undefined,
): PaymentSettlement | null {
  const raw = (header ?? "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as PaymentSettlement;
  } catch {
    return null;
  }
}

/**
 * Facilitator `verify()`: prove the settling transfer described by the
 * X-PAYMENT payload actually moved at least `maxAmountRequired` of the asset to
 * `payTo` on-chain. Wraps {@link verifyUsdcTransfer}.
 */
export async function verifyPayment(params: {
  payload: { txHash: string; from: string | null };
  requirements: PaymentRequirements;
  /** When set, also require the transfer's `from` to match the buyer wallet. */
  expectedFrom?: string | null;
}): Promise<VerifyTransferResult> {
  const { payload, requirements, expectedFrom } = params;
  return verifyUsdcTransfer({
    txHash: payload.txHash,
    asset: requirements.asset,
    payTo: requirements.payTo,
    minAmount: BigInt(requirements.maxAmountRequired),
    expectedFrom: expectedFrom ?? payload.from ?? null,
  });
}

/**
 * Facilitator `settle()`: settlement already happened on-chain (the buyer's
 * smart account broadcast the transfer), so this confirms the verified result
 * and produces the canonical X-PAYMENT-RESPONSE settlement payload.
 */
export function settlePayment(params: {
  txHash: string;
  verified: Extract<VerifyTransferResult, { ok: true }>;
  requirements: PaymentRequirements;
}): PaymentSettlement {
  const { txHash, verified, requirements } = params;
  return {
    success: true,
    txHash,
    network: X402_NETWORK,
    networkName: X402_NETWORK_NAME,
    payer: verified.from,
    payTo: requirements.payTo,
    asset: requirements.asset,
    amount: verified.value.toString(),
    humanAmount: formatUsdc(verified.value),
    settlement: X402_SETTLEMENT,
  };
}
