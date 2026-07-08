import "server-only";

import type {
  DerivativesMetrics,
  DerivativesSubSector,
  LiquidityMetrics,
  LiquiditySubSector,
  OtherMetrics,
  OtherSubSector,
  RwaMetrics,
  RwaSubSector,
  StakingMetrics,
  StakingSubSector,
} from "@/lib/types";

/** Map Staking sub-sector label → StakingTagMetrics key. */
export const STAKING_TAG_TO_KEY = {
  "Liquid Staking": "liquidStaking",
  Restaking: "restaking",
  "Liquid Restaking": "liquidRestaking",
} as const satisfies Record<StakingSubSector, string>;

/** Map Liquidity sub-sector label → LiquidityTagMetrics key. */
export const LIQUIDITY_TAG_TO_KEY = {
  Pools: "pools",
  Vaults: "vaults",
} as const satisfies Record<LiquiditySubSector, string>;

/** Map Derivatives sub-sector label → DerivativesTagMetrics key. */
export const DERIVATIVES_TAG_TO_KEY = {
  "Perp DEX": "perpDex",
  "Option Vaults": "optionVaults",
  "Delta-Neutral": "deltaNeutral",
} as const satisfies Record<DerivativesSubSector, string>;

/** Map Other sub-sector label → OtherTagMetrics key. */
export const OTHER_TAG_TO_KEY = {
  Underwriting: "underwriting",
  Governance: "governance",
  Majors: "majors",
} as const satisfies Record<OtherSubSector, string>;

/** Map RWA sub-sector label → RwaTagMetrics key. */
export const RWA_SUBSECTOR_TO_KEY: Record<RwaSubSector, keyof import("@/lib/types").RwaTagMetrics> =
  {
    "Tokenized Treasuries": "treasuries",
    "Tokenized Equities": "tokenizedEquities",
    "Tokenized Commodities": "commodities",
    "Real Estate": "realEstate",
    "Private Credit": "privateCredit",
    "Carbon / ESG": "carbon",
    "Tokenization Infrastructure": "tokenizationInfra",
    "Structured Products": "structuredProducts",
    "Event Finance": "eventFinance",
    "Stablecoins & FX": "stablecoinsFx",
  };

export function overlayStakingTagMetrics(
  item: Record<string, unknown>,
  live: StakingMetrics,
  subSector: StakingSubSector | null | undefined,
): boolean {
  if (!subSector) return false;
  const key = STAKING_TAG_TO_KEY[subSector];
  if (!key) return false;
  const prior = (item.StakingTagMetrics as Record<string, unknown> | null | undefined) ?? {};
  item.StakingTagMetrics = {
    ...prior,
    [key]: { ...(prior[key] as object | undefined), ...live },
  };
  return true;
}

export function overlayLiquidityTagMetrics(
  item: Record<string, unknown>,
  live: LiquidityMetrics,
  subSector: LiquiditySubSector | null | undefined,
): boolean {
  if (!subSector) return false;
  const key = LIQUIDITY_TAG_TO_KEY[subSector];
  if (!key) return false;
  const prior = (item.LiquidityTagMetrics as Record<string, unknown> | null | undefined) ?? {};
  item.LiquidityTagMetrics = {
    ...prior,
    [key]: { ...(prior[key] as object | undefined), ...live },
  };
  return true;
}

export function overlayDerivativesTagMetrics(
  item: Record<string, unknown>,
  live: DerivativesMetrics,
  subSector: DerivativesSubSector | null | undefined,
  openInterest?: {
    longOpenInterestUsd?: number | null;
    shortOpenInterestUsd?: number | null;
  } | null,
): boolean {
  if (!subSector) return false;
  const key = DERIVATIVES_TAG_TO_KEY[subSector];
  if (!key) return false;
  const prior = (item.DerivativesTagMetrics as Record<string, unknown> | null | undefined) ?? {};
  const tagBlock: Record<string, unknown> = { ...(prior[key] as object | undefined), ...live };
  if (key === "perpDex" && openInterest) {
    if (openInterest.longOpenInterestUsd != null) {
      tagBlock.longOpenInterestUsd = {
        value: openInterest.longOpenInterestUsd,
        dataSource: "live",
        sourceLabel: "DeFi Llama",
      };
    }
    if (openInterest.shortOpenInterestUsd != null) {
      tagBlock.shortOpenInterestUsd = {
        value: openInterest.shortOpenInterestUsd,
        dataSource: "live",
        sourceLabel: "DeFi Llama",
      };
    }
  }
  item.DerivativesTagMetrics = { ...prior, [key]: tagBlock };
  return true;
}

export function overlayOtherTagMetrics(
  item: Record<string, unknown>,
  live: OtherMetrics,
  subSector: OtherSubSector | null | undefined,
): boolean {
  if (!subSector) return false;
  const key = OTHER_TAG_TO_KEY[subSector];
  if (!key) return false;
  const prior = (item.OtherTagMetrics as Record<string, unknown> | null | undefined) ?? {};
  item.OtherTagMetrics = {
    ...prior,
    [key]: { ...(prior[key] as object | undefined), ...live },
  };
  return true;
}

export function overlayRwaTagMetrics(
  item: Record<string, unknown>,
  live: RwaMetrics,
  subSector: RwaSubSector | null | undefined,
): boolean {
  if (!subSector) return false;
  const key = RWA_SUBSECTOR_TO_KEY[subSector];
  if (!key) return false;
  const prior = (item.RwaTagMetrics as Record<string, unknown> | null | undefined) ?? {};
  const existing = (prior[key] as Record<string, unknown> | undefined) ?? {};
  const subMetrics = live.subSectorMetrics;
  const tagBlock: Record<string, unknown> = {
    ...existing,
    ...(live.aumUsd != null ? { aumUsd: live.aumUsd } : {}),
    ...(subMetrics && "kind" in subMetrics ? subMetrics : {}),
  };
  item.RwaTagMetrics = { ...prior, [key]: tagBlock };
  return true;
}

/** Resolve staking sub-sector from store item + optional seed fallback. */
export function resolveStakingSubSector(
  item: Record<string, unknown>,
  seedSubSector?: StakingSubSector | null,
): StakingSubSector | null {
  return (
    (item.StakingSubSector as StakingSubSector | null | undefined) ??
    seedSubSector ??
    (String(item.Sector ?? "") === "Staking" && item.SubSector
      ? (String(item.SubSector) as StakingSubSector)
      : null)
  );
}

export function resolveLiquiditySubSector(
  item: Record<string, unknown>,
  seedSubSector?: LiquiditySubSector | null,
): LiquiditySubSector | null {
  return (
    (item.LiquiditySubSector as LiquiditySubSector | null | undefined) ??
    seedSubSector ??
    (String(item.Sector ?? "") === "Liquidity" && item.SubSector
      ? (String(item.SubSector) as LiquiditySubSector)
      : null)
  );
}

export function resolveDerivativesSubSector(
  item: Record<string, unknown>,
  seedSubSector?: DerivativesSubSector | null,
): DerivativesSubSector | null {
  return (
    (item.DerivativesSubSector as DerivativesSubSector | null | undefined) ??
    seedSubSector ??
    (String(item.Sector ?? "") === "Derivatives" && item.SubSector
      ? (String(item.SubSector) as DerivativesSubSector)
      : null)
  );
}

export function resolveOtherSubSector(
  item: Record<string, unknown>,
  seedSubSector?: OtherSubSector | null,
): OtherSubSector | null {
  return (
    (item.OtherSubSector as OtherSubSector | null | undefined) ??
    seedSubSector ??
    (String(item.Sector ?? "") === "Other" && item.SubSector
      ? (String(item.SubSector) as OtherSubSector)
      : null)
  );
}

export function resolveRwaSubSector(item: Record<string, unknown>): RwaSubSector | null {
  return (item.RwaSubSector as RwaSubSector | null | undefined) ?? null;
}
