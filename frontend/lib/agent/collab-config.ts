import "server-only";

import { readSecret } from "@/lib/server/env";

/**
 * Agent-to-agent collaboration (x402) configuration probes.
 *
 * Like the rest of the agent layer, every path degrades gracefully until
 * provisioned. Testnet USDC on Arbitrum Sepolia is the settlement asset; the
 * CollabRegistry is the on-chain attestation log. Both are optional — discovery
 * + the typed exchange still work off Redis when the chain pieces are unset.
 */

/** Circle testnet USDC on Arbitrum Sepolia (6 decimals). */
export const DEFAULT_ARBITRUM_SEPOLIA_USDC =
  "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" as const;

export const USDC_DECIMALS = 6;
/** tCNHV ("CanHav Test Credits") decimals — OZ ERC20 default. */
export const TCNHV_DECIMALS = 18;

/** Default StrategyPacket price (human units) when an agent hasn't set one. */
export function defaultCollabPriceUsdc(): string {
  return readSecret("COLLAB_PRICE_DEFAULT_USDC") ?? "0.05";
}

/** The testnet USDC settlement asset address. */
export function collabUsdcAsset(): string {
  return readSecret("USDC_ASSET_ADDRESS") ?? DEFAULT_ARBITRUM_SEPOLIA_USDC;
}

/** The deployed tCNHV token address, or null when unconfigured. */
export function tcnhvAssetAddress(): string | null {
  return readSecret("TCNHV_TOKEN_ADDRESS");
}

/** Whether tCNHV is provisioned as the settlement credit. */
export function hasTcnhv(): boolean {
  return Boolean(tcnhvAssetAddress());
}

export interface CollabSettlementAsset {
  /** Settlement token contract address. */
  asset: string;
  decimals: number;
  /** x402 `extra.name` + UI label. */
  name: string;
  /** Discriminator for labels / fallbacks. */
  kind: "tcnhv" | "usdc";
}

/**
 * Resolve the active settlement asset: tCNHV ("merit credits") when
 * `TCNHV_TOKEN_ADDRESS` is configured, otherwise the legacy testnet USDC path.
 * Single source of truth so x402, the seller route, and discovery agree.
 */
export function collabSettlement(): CollabSettlementAsset {
  const tcnhv = tcnhvAssetAddress();
  if (tcnhv) {
    return { asset: tcnhv, decimals: TCNHV_DECIMALS, name: "tCNHV", kind: "tcnhv" };
  }
  return { asset: collabUsdcAsset(), decimals: USDC_DECIMALS, name: "USDC", kind: "usdc" };
}

export function collabRegistryAddress(): string | null {
  return readSecret("COLLAB_REGISTRY_ADDRESS");
}

/**
 * The deployed CollabAgreement contract address, or null when unconfigured.
 * When set, agreements are anchored on-chain at seller approval and each period
 * records its interaction on-chain; when unset, off-chain enforcement stands in.
 */
export function collabAgreementAddress(): string | null {
  return readSecret("COLLAB_AGREEMENT_ADDRESS");
}

/** Whether the on-chain CollabAgreement contract is provisioned. */
export function hasCollabAgreement(): boolean {
  return Boolean(collabAgreementAddress());
}

export function reputationRegistryAddress(): string | null {
  return readSecret("REPUTATION_REGISTRY_ADDRESS");
}

/** Reputation feedback is wired but stays disabled unless explicitly enabled. */
export function reputationEnabled(): boolean {
  return readSecret("COLLAB_REPUTATION_ENABLED") === "1";
}

/** Whether the collaboration layer is provisioned enough to transact on-chain. */
export function hasCollab(): boolean {
  return Boolean(readSecret("IDENTITY_REGISTRY_ADDRESS") && collabUsdcAsset());
}

/** Parse a human amount ("0.05") into base units for an asset's decimals. */
export function parseAmountToBaseUnits(human: string, decimals: number): bigint {
  const cleaned = (human || "0").trim();
  if (!/^\d*(\.\d*)?$/.test(cleaned)) {
    throw new Error(`Invalid amount: ${human}`);
  }
  const [whole, frac = ""] = cleaned.split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(fracPadded || "0");
}

/** Format base units back into a human string for an asset's decimals. */
export function formatAmount(base: bigint, decimals: number): string {
  const negative = base < 0n;
  const abs = negative ? -base : base;
  const whole = abs / 10n ** BigInt(decimals);
  const frac = (abs % 10n ** BigInt(decimals)).toString().padStart(decimals, "0");
  const trimmed = frac.replace(/0+$/, "");
  const out = trimmed ? `${whole}.${trimmed}` : `${whole}`;
  return negative ? `-${out}` : out;
}

/** Parse a human USDC string ("0.05") into base units (bigint, 6 decimals). */
export function parseUsdcToBaseUnits(human: string): bigint {
  return parseAmountToBaseUnits(human, USDC_DECIMALS);
}

/** Format base units (6 decimals) back into a human USDC string. */
export function formatUsdc(base: bigint): string {
  return formatAmount(base, USDC_DECIMALS);
}
