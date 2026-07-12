/**
 * Card rail definitions for the AAVE and ETH Trade Desks, from the Aave
 * card-rails guideline. A rail is a declarative rule: WATCH an input, WHEN a
 * threshold trips, SUGGEST an action with a severity, and emit the mapped
 * verdict signal. Rails only ever propose; the research gate and HITL approval stay
 * in front of anything that moves money. This module is pure data so the
 * client panel and the backtest engine can both import it.
 */

export type RailFamily = "dependency" | "protocol" | "market" | "governance";
export type RailSeverity = "low" | "medium" | "high";

/** Desks that carry the card-rails section. */
export type RailAsset = "AAVE" | "ETH";

/**
 * Which rails asset a desk gets from its skill, mirroring the slug parsing
 * in getTradeCoinsForAgent: entity skills use the bare slug, product skills
 * are namespaced `token:{slug}`. Majors/unmapped desks get no rails.
 */
export function railAssetForSkill(skillId: string | null | undefined): RailAsset | null {
  const raw = skillId?.trim().toLowerCase() ?? "";
  const slug = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw;
  if (slug === "aave") return "AAVE";
  if (slug === "ethereum") return "ETH";
  return null;
}

/** Metric keys shared between rail thresholds and backtest event fixtures. */
export type MetricKey =
  | "depegPct" // LRT/LST depeg vs ETH, positive %
  | "issuerTvlDropPct" // restaking issuer TVL drop over 24h, %
  | "utilizationPct" // Aave reserve utilization, %
  | "sustainedUtilizationPct" // utilization held for 6h+ (util-health rail)
  | "stableDepegPct" // stablecoin deviation from $1, %
  | "frozenMarket" // 1 = a held-coin reserve was frozen / bad debt
  | "supplyApyDropWowPct" // supply APY drop week over week, %
  | "revenueDropMomPct" // protocol revenue drop month over month, %
  | "tvlDrop7dPct" // protocol TVL drop over 7d, %
  | "change24hPct" // token 24h price change, signed %
  | "change7dPct" // token 7d price change, signed %
  | "volumeVs30dAvgX" // 24h volume as a multiple of the 30d average
  | "gainPct" // unrealized gain vs entry, %
  | "governanceEvent" // 1 = flagged high-impact governance proposal
  | "regulatoryEvent"; // 1 = material regulatory headline

export interface RailThreshold {
  key: MetricKey;
  /** Short label for the slider, e.g. "depeg vs ETH". */
  label: string;
  unit: "%" | "x";
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  /** Trip when observed >= threshold ("gte") or <= threshold ("lte"). */
  direction: "gte" | "lte";
}

export interface RailDef {
  id: string;
  family: RailFamily;
  name: string;
  /** What the rail watches, e.g. "rsETH / ezETH / weETH price vs ETH". */
  watch: string;
  /** Numeric trip condition; null for event-driven rails (see eventKey). */
  threshold: RailThreshold | null;
  /** Boolean metric an event-driven rail fires on (metric value 1). */
  eventKey?: MetricKey;
  /** Extra condition that must also hold, e.g. momentum flip needs 7d < 0. */
  secondary?: { key: MetricKey; direction: "lt" | "gt"; value: number; label: string };
  suggests: { action: "SELL" | "REDUCE" | "TRIM" | "PAUSE" | "HOLD" | "BUY"; detail: string };
  severity: RailSeverity;
  /** Verdict signal the rail emits into the existing gate; null = advisory. */
  emits: "peg_risk" | "supply_contraction" | null;
  /** Interactive rails get a threshold slider in the panel. */
  interactive: boolean;
  defaultEnabled: boolean;
  /** Static qualifier rendered next to the trip condition ("sustained 6h"). */
  note?: string;
}

export type RailState = Record<string, { enabled: boolean; value: number }>;

export function defaultRailState(rails: RailDef[]): RailState {
  const state: RailState = {};
  for (const rail of rails) {
    state[rail.id] = {
      enabled: rail.defaultEnabled,
      value: rail.threshold?.defaultValue ?? 1,
    };
  }
  return state;
}

/**
 * Observed depegs at or past this level escalate the LRT depeg guard to a
 * high-severity "hard" fire regardless of the softer intraday threshold.
 */
export const DEPEG_HARD_PCT = 2;

export const FAMILY_LABELS: Record<RailFamily, string> = {
  dependency: "Dependency and contagion",
  protocol: "Protocol health",
  market: "Market",
  governance: "Governance and regulatory",
};

export const RAILS: RailDef[] = [
  // A. Dependency / contagion rails: AAVE has repriced on events it didn't
  // cause. These watch the assets Aave depends on and fire on the cause,
  // before the AAVE price move.
  {
    id: "lrt_depeg_guard",
    family: "dependency",
    name: "LRT depeg guard",
    watch: "rsETH / ezETH / weETH price vs ETH",
    threshold: {
      key: "depegPct",
      label: "depeg vs ETH",
      unit: "%",
      defaultValue: 0.5,
      min: 0.25,
      max: 5,
      step: 0.25,
      direction: "gte",
    },
    suggests: { action: "SELL", detail: "de-risk exposure, freeze new LRT longs" },
    severity: "medium",
    emits: "peg_risk",
    interactive: true,
    defaultEnabled: true,
    note: `escalates to high at ${DEPEG_HARD_PCT}%`,
  },
  {
    id: "issuer_health",
    family: "dependency",
    name: "Restaking issuer health",
    watch: "Kelp / Renzo / ether.fi withdrawal queue and TVL",
    threshold: {
      key: "issuerTvlDropPct",
      label: "TVL drop 24h",
      unit: "%",
      defaultValue: 15,
      min: 5,
      max: 50,
      step: 1,
      direction: "gte",
    },
    suggests: { action: "REDUCE", detail: "issuer under stress, watch closely" },
    severity: "medium",
    emits: "supply_contraction",
    interactive: false,
    defaultEnabled: true,
  },
  {
    id: "util_spike",
    family: "dependency",
    name: "Collateral utilization spike",
    watch: "Aave reserve utilization (ETH and LRT markets)",
    threshold: {
      key: "utilizationPct",
      label: "utilization",
      unit: "%",
      defaultValue: 92,
      min: 80,
      max: 99,
      step: 0.5,
      direction: "gte",
    },
    suggests: { action: "TRIM", detail: "liquidity-crunch warning" },
    severity: "medium",
    emits: "peg_risk",
    interactive: true,
    defaultEnabled: true,
  },
  {
    id: "stable_peg",
    family: "dependency",
    name: "Stablecoin peg guard",
    watch: "USDC / USDT / USDe price vs $1",
    threshold: {
      key: "stableDepegPct",
      label: "deviation from $1",
      unit: "%",
      defaultValue: 0.5,
      min: 0.1,
      max: 5,
      step: 0.1,
      direction: "gte",
    },
    suggests: { action: "PAUSE", detail: "pause borrow-side calls" },
    severity: "medium",
    emits: "peg_risk",
    interactive: false,
    defaultEnabled: true,
  },
  {
    id: "bad_debt_frozen",
    family: "dependency",
    name: "Bad debt / frozen market",
    watch: "Aave bad-debt and frozen-reserve flags",
    threshold: null,
    eventKey: "frozenMarket",
    suggests: { action: "SELL", detail: "exit exposure on a frozen held-coin market" },
    severity: "high",
    emits: "supply_contraction",
    interactive: false,
    defaultEnabled: true,
  },

  // B. Aave protocol-health rails: native fundamentals from the live reserve
  // reads (supplyApyPct, utilizationPct) plus revenue/TVL trends.
  {
    id: "apy_collapse",
    family: "protocol",
    name: "Supply APY collapse",
    watch: "supplyApyPct on the GHO / ETH reserves",
    threshold: {
      key: "supplyApyDropWowPct",
      label: "APY drop WoW",
      unit: "%",
      defaultValue: 40,
      min: 10,
      max: 80,
      step: 5,
      direction: "gte",
    },
    suggests: { action: "TRIM", detail: "yield thesis weakening" },
    severity: "low",
    emits: null,
    interactive: false,
    defaultEnabled: true,
  },
  {
    id: "util_health",
    family: "protocol",
    name: "Utilization health",
    watch: "reserve utilization, sustained",
    // Keyed separately from the intraday utilizationPct so the 6h-sustained
    // rail doesn't double-count one-day spikes in the backtest.
    threshold: {
      key: "sustainedUtilizationPct",
      label: "utilization",
      unit: "%",
      defaultValue: 90,
      min: 80,
      max: 99,
      step: 0.5,
      direction: "gte",
    },
    suggests: { action: "REDUCE", detail: "exit-liquidity risk" },
    severity: "medium",
    emits: null,
    interactive: false,
    defaultEnabled: true,
    note: "sustained 6h",
  },
  {
    id: "revenue_buyback",
    family: "protocol",
    name: "Revenue / buyback signal",
    watch: "Aavenomics buyback pace and protocol revenue",
    threshold: {
      key: "revenueDropMomPct",
      label: "revenue drop MoM",
      unit: "%",
      defaultValue: 20,
      min: 5,
      max: 60,
      step: 5,
      direction: "gte",
    },
    suggests: { action: "HOLD", detail: "weaken conviction, don't add" },
    severity: "low",
    emits: null,
    interactive: false,
    defaultEnabled: true,
  },
  {
    id: "tvl_momentum",
    family: "protocol",
    name: "TVL momentum",
    watch: "protocol TVL trend",
    threshold: {
      key: "tvlDrop7dPct",
      label: "TVL drop 7d",
      unit: "%",
      defaultValue: 15,
      min: 5,
      max: 50,
      step: 1,
      direction: "gte",
    },
    suggests: { action: "REDUCE", detail: "reduce exposure" },
    severity: "low",
    emits: null,
    interactive: false,
    defaultEnabled: true,
  },

  // C. Token market rails: price and momentum on the desk's token itself.
  {
    id: "momentum_flip",
    family: "market",
    name: "Momentum flip",
    watch: "token 24h change with the 7d trend",
    threshold: {
      key: "change24hPct",
      label: "24h change",
      unit: "%",
      defaultValue: -8,
      // Floor sits below the Aug 2024 -21% print so the backtest can show
      // even that day going uncaught at an extreme setting.
      min: -25,
      max: -2,
      step: 0.5,
      direction: "lte",
    },
    secondary: { key: "change7dPct", direction: "lt", value: 0, label: "7d trend negative" },
    suggests: { action: "SELL", detail: "reduce on confirmed downtrend" },
    severity: "medium",
    emits: null,
    interactive: true,
    defaultEnabled: true,
  },
  {
    id: "volume_spike",
    family: "market",
    name: "Volume spike + drop",
    watch: "24h volume vs 30d average",
    threshold: {
      key: "volumeVs30dAvgX",
      label: "volume multiple",
      unit: "x",
      defaultValue: 3,
      min: 1.5,
      max: 10,
      step: 0.5,
      direction: "gte",
    },
    secondary: { key: "change24hPct", direction: "lt", value: 0, label: "price down" },
    suggests: { action: "REDUCE", detail: "distribution pattern, de-risk" },
    severity: "medium",
    emits: null,
    interactive: false,
    defaultEnabled: true,
  },
  {
    id: "take_profit",
    family: "market",
    name: "Take profit",
    watch: "entry price vs current",
    threshold: {
      key: "gainPct",
      label: "gain",
      unit: "%",
      defaultValue: 25,
      min: 10,
      max: 100,
      step: 5,
      direction: "gte",
    },
    suggests: { action: "SELL", detail: "suggest partial take-profit" },
    severity: "low",
    emits: null,
    interactive: false,
    defaultEnabled: true,
  },
  {
    id: "momentum_add",
    family: "market",
    name: "Momentum-positive add",
    watch: "fresh positive verdict plus a price base",
    threshold: {
      key: "change24hPct",
      label: "24h change",
      unit: "%",
      defaultValue: 5,
      min: 2,
      max: 15,
      step: 0.5,
      direction: "gte",
    },
    suggests: { action: "BUY", detail: "still research-gated: fresh positive verdict required" },
    severity: "low",
    emits: null,
    interactive: false,
    defaultEnabled: true,
  },

  // D. Governance / regulatory rails: event-driven, no numeric threshold.
  {
    id: "governance_risk",
    family: "governance",
    name: "Governance risk",
    watch: "protocol governance proposals (emissions, listings)",
    threshold: null,
    eventKey: "governanceEvent",
    suggests: { action: "HOLD", detail: "review before acting" },
    severity: "low",
    emits: null,
    interactive: false,
    defaultEnabled: true,
  },
  {
    id: "regulatory_event",
    family: "governance",
    name: "Regulatory event",
    watch: "SEC and regulatory headlines",
    threshold: null,
    eventKey: "regulatoryEvent",
    suggests: { action: "PAUSE", detail: "pause new calls, notify" },
    severity: "medium",
    emits: null,
    interactive: false,
    defaultEnabled: true,
  },
];
