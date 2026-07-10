/**
 * Single doorway for trade "money numbers" — Pathway C encrypts here.
 * Do not introduce alternate size/collateral types outside this module.
 *
 * FHE Phase 1 (roadmap D1): a proposal's sizeUsd at rest is an EncryptedUsd —
 * either plaintext (flag off / legacy rows) or a CoFHE euint64 ciphertext
 * envelope. TradeIntent.sizeUsd stays a plaintext bigint: the signing path
 * (gate → cap check → GMX order build → Privy signature) always runs on
 * plaintext, which legitimately exists only client-side after an owner
 * reveal and inside /api/agent/trade at execution time.
 */

export type TradeSide = "long" | "short";

export type TradeProposalStatus =
  | "proposed"
  | "approved"
  | "rejected"
  | "executed"
  | "blocked";

export interface TradeIntent {
  asset: string;
  side: TradeSide;
  /** Money number — change only here. USD with 30 decimals. */
  sizeUsd: bigint;
  /** Fixed/capped in v1. */
  leverage: number;
  collateralToken: `0x${string}`;
  verdictRef: string;
  createdAt: string;
}

/**
 * CoFHE ciphertext envelope for a proposal size, stored/transmitted as JSON.
 * The value is euint64 micro-USD (6 decimals): 30-dec USD sizes are whole
 * dollars by construction, so usd30 / 10^24 is lossless (see usd30ToMicro).
 */
export interface EncryptedUsdCipherJson {
  v: 1;
  alg: "cofhe-euint64-micro";
  /** Ciphertext handle (decimal bigint string), registered with CoFHE. */
  ctHash: string;
  securityZone: number;
  /** FheTypes numeric for Uint64. */
  utype: number;
  /** CoFHE verifier signature over the encrypted input (spent on register). */
  signature: string;
  /** EncryptedIntents.register() tx that granted the owner ACL access. */
  registerTxHash?: `0x${string}`;
  /**
   * FHE Phase 2: ebool handle from registerAndCheck() — decrypts (owner-only)
   * to "size is within the on-chain encrypted caps".
   */
  capOkHandle?: string;
}

/** At-rest money number: plaintext 30-dec USD or a CoFHE ciphertext handle. */
export type EncryptedUsd =
  | { kind: "plain"; usd30: bigint }
  | {
      kind: "encrypted";
      ctHash: bigint;
      securityZone: number;
      utype: number;
      signature: string;
      registerTxHash?: `0x${string}`;
      capOkHandle?: bigint;
    };

export function plainUsd(usd30: bigint): EncryptedUsd {
  return { kind: "plain", usd30 };
}

/** Fail closed: throw rather than treat ciphertext as a number. */
export function requirePlainUsd(value: EncryptedUsd): bigint {
  if (value.kind !== "plain") {
    throw new Error("Trade size is encrypted — reveal it before using it as a number.");
  }
  return value.usd30;
}

export function plainUsdOrNull(value: EncryptedUsd): bigint | null {
  return value.kind === "plain" ? value.usd30 : null;
}

const MICRO_FACTOR = 10n ** 24n; // 30-dec USD → 6-dec micro-USD

/** Lossless 30-dec → 6-dec conversion; throws on sub-micro precision. */
export function usd30ToMicro(usd30: bigint): bigint {
  if (usd30 < 0n) throw new Error("Trade size must be non-negative.");
  if (usd30 % MICRO_FACTOR !== 0n) {
    throw new Error("Trade size has sub-micro-USD precision — cannot encrypt losslessly.");
  }
  const micro = usd30 / MICRO_FACTOR;
  if (micro > 2n ** 64n - 1n) throw new Error("Trade size exceeds euint64 range.");
  return micro;
}

export function microToUsd30(micro: bigint): bigint {
  return micro * MICRO_FACTOR;
}

export interface TradeProposal extends Omit<TradeIntent, "sizeUsd"> {
  sizeUsd: EncryptedUsd;
  id: string;
  status: TradeProposalStatus;
  gmxTarget: `0x${string}`;
  reason?: string;
  txHash?: `0x${string}`;
  /**
   * FHE Phase 2: server-verified result of the ON-CHAIN encrypted cap check
   * (threshold-network attestation over the registerAndCheck ebool). Display
   * + auto-approve gate only — the plaintext execute-time check is still the
   * enforcement backstop.
   */
  capCheckOnchain?: "within" | "over";
}

/** Serializable shape for API / storage (bigint as string). */
export interface TradeIntentJson {
  asset: string;
  side: TradeSide;
  sizeUsd: string;
  leverage: number;
  collateralToken: `0x${string}`;
  verdictRef: string;
  createdAt: string;
}

export interface TradeProposalJson extends TradeIntentJson {
  id: string;
  status: TradeProposalStatus;
  gmxTarget: `0x${string}`;
  reason?: string;
  txHash?: `0x${string}`;
  /**
   * When present, the size is ciphertext and sizeUsd holds the "0" sentinel —
   * never read the sentinel as money (plainUsdOrNull guards every consumer).
   */
  sizeUsdEnc?: EncryptedUsdCipherJson;
  /** See TradeProposal.capCheckOnchain. */
  capCheckOnchain?: "within" | "over";
}

export function tradeIntentToJson(intent: TradeIntent): TradeIntentJson {
  return {
    asset: intent.asset,
    side: intent.side,
    sizeUsd: intent.sizeUsd.toString(),
    leverage: intent.leverage,
    collateralToken: intent.collateralToken,
    verdictRef: intent.verdictRef,
    createdAt: intent.createdAt,
  };
}

export function tradeIntentFromJson(json: TradeIntentJson): TradeIntent {
  return {
    ...json,
    sizeUsd: BigInt(json.sizeUsd),
  };
}

function encryptedUsdToCipherJson(value: EncryptedUsd & { kind: "encrypted" }): EncryptedUsdCipherJson {
  return {
    v: 1,
    alg: "cofhe-euint64-micro",
    ctHash: value.ctHash.toString(),
    securityZone: value.securityZone,
    utype: value.utype,
    signature: value.signature,
    registerTxHash: value.registerTxHash,
    capOkHandle: value.capOkHandle?.toString(),
  };
}

export function encryptedUsdFromCipherJson(json: EncryptedUsdCipherJson): EncryptedUsd {
  return {
    kind: "encrypted",
    ctHash: BigInt(json.ctHash),
    securityZone: json.securityZone,
    utype: json.utype,
    signature: json.signature,
    registerTxHash: json.registerTxHash,
    capOkHandle: json.capOkHandle != null ? BigInt(json.capOkHandle) : undefined,
  };
}

export function tradeProposalToJson(proposal: TradeProposal): TradeProposalJson {
  const base = {
    asset: proposal.asset,
    side: proposal.side,
    leverage: proposal.leverage,
    collateralToken: proposal.collateralToken,
    verdictRef: proposal.verdictRef,
    createdAt: proposal.createdAt,
    id: proposal.id,
    status: proposal.status,
    gmxTarget: proposal.gmxTarget,
    reason: proposal.reason,
    txHash: proposal.txHash,
    capCheckOnchain: proposal.capCheckOnchain,
  };
  if (proposal.sizeUsd.kind === "encrypted") {
    return { ...base, sizeUsd: "0", sizeUsdEnc: encryptedUsdToCipherJson(proposal.sizeUsd) };
  }
  return { ...base, sizeUsd: proposal.sizeUsd.usd30.toString() };
}

export function tradeProposalFromJson(json: TradeProposalJson): TradeProposal {
  return {
    asset: json.asset,
    side: json.side,
    sizeUsd: json.sizeUsdEnc
      ? encryptedUsdFromCipherJson(json.sizeUsdEnc)
      : plainUsd(BigInt(json.sizeUsd)),
    leverage: json.leverage,
    collateralToken: json.collateralToken,
    verdictRef: json.verdictRef,
    createdAt: json.createdAt,
    id: json.id,
    status: json.status,
    gmxTarget: json.gmxTarget,
    reason: json.reason,
    txHash: json.txHash,
    capCheckOnchain: json.capCheckOnchain,
  };
}

/** Build the signing-path intent from a proposal + a plaintext size. */
export function proposalToIntent(proposal: TradeProposal, sizeUsd30: bigint): TradeIntent {
  return {
    asset: proposal.asset,
    side: proposal.side,
    sizeUsd: sizeUsd30,
    leverage: proposal.leverage,
    collateralToken: proposal.collateralToken,
    verdictRef: proposal.verdictRef,
    createdAt: proposal.createdAt,
  };
}
