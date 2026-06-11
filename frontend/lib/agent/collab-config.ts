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

/** Default StrategyPacket price (human USDC) when an agent hasn't set one. */
export function defaultCollabPriceUsdc(): string {
  return readSecret("COLLAB_PRICE_DEFAULT_USDC") ?? "0.05";
}

/** The settlement asset address (testnet USDC). */
export function collabUsdcAsset(): string {
  return readSecret("USDC_ASSET_ADDRESS") ?? DEFAULT_ARBITRUM_SEPOLIA_USDC;
}

export function collabRegistryAddress(): string | null {
  return readSecret("COLLAB_REGISTRY_ADDRESS");
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

/** Parse a human USDC string ("0.05") into base units (bigint, 6 decimals). */
export function parseUsdcToBaseUnits(human: string): bigint {
  const cleaned = (human || "0").trim();
  if (!/^\d*(\.\d*)?$/.test(cleaned)) {
    throw new Error(`Invalid USDC amount: ${human}`);
  }
  const [whole, frac = ""] = cleaned.split(".");
  const fracPadded = (frac + "0".repeat(USDC_DECIMALS)).slice(0, USDC_DECIMALS);
  return BigInt(whole || "0") * 10n ** BigInt(USDC_DECIMALS) + BigInt(fracPadded || "0");
}

/** Format base units (6 decimals) back into a human USDC string. */
export function formatUsdc(base: bigint): string {
  const negative = base < 0n;
  const abs = negative ? -base : base;
  const whole = abs / 10n ** BigInt(USDC_DECIMALS);
  const frac = (abs % 10n ** BigInt(USDC_DECIMALS)).toString().padStart(USDC_DECIMALS, "0");
  const trimmed = frac.replace(/0+$/, "");
  const out = trimmed ? `${whole}.${trimmed}` : `${whole}`;
  return negative ? `-${out}` : out;
}
