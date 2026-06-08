import type { AssetSubtype, Freshness, PegMechanism } from "@/lib/types";
import type { BadgeTone } from "@/components/ui/Badge";

/**
 * Presentational helpers for the additive economic classification + off-chain
 * freshness (playbook §1.3 / §3). Pure, framework-agnostic, and null-safe so it
 * can be shared by server and client components and degrade gracefully on old
 * records that predate these fields.
 */

const ASSET_SUBTYPE_LABEL: Record<AssetSubtype, string> = {
  "fiat-stablecoin": "Fiat-backed stable",
  "synthetic-dollar": "Synthetic dollar",
  "e-money": "E-money",
  "yield-bearing-stable": "Yield-bearing stable",
  "rwa-backed-stable": "RWA-backed stable",
  governance: "Governance",
  "staked-governance": "Staked governance",
  "insurance-firstloss": "First-loss insurance",
  "lp-receipt": "LP receipt",
  lst: "Liquid staking",
  "institutional-gated": "Institutional / gated",
  "tokenized-commodity": "Tokenized commodity",
  "tokenized-equity": "Tokenized equity",
  "tokenized-treasury": "Tokenized treasury",
  legacy: "Legacy",
  conceptual: "Conceptual",
};

const PEG_MECHANISM_LABEL: Record<PegMechanism, string> = {
  "fiat-reserve": "Fiat reserve (1:1)",
  overcollateralized: "Overcollateralized",
  "delta-neutral-hedge": "Delta-neutral hedge",
  "rwa-collateral": "RWA collateral",
  "algorithmic-rebase": "Algorithmic rebase",
  none: "No peg",
};

const FRESHNESS_META: Record<Freshness, { label: string; tone: BadgeTone }> = {
  live: { label: "Live", tone: "positive" },
  "semi-live": { label: "Updated periodically", tone: "signal" },
  static: { label: "Curated", tone: "neutral" },
};

export function assetSubtypeLabel(value: AssetSubtype | null | undefined): string | null {
  if (!value) return null;
  return ASSET_SUBTYPE_LABEL[value] ?? value;
}

export function pegMechanismLabel(value: PegMechanism | null | undefined): string | null {
  if (!value) return null;
  return PEG_MECHANISM_LABEL[value] ?? value;
}

export function freshnessMeta(value: Freshness): { label: string; tone: BadgeTone } {
  return FRESHNESS_META[value] ?? { label: value, tone: "neutral" };
}

/** Humanize a camelCase fact key into a readable label (regulatoryStatus -> "Regulatory status"). */
export function humanizeFactKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
