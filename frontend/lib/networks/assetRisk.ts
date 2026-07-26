import type {
  AssetCoverage,
  CoverageAsset,
  FlaggedAsset,
  NetworkProfile,
  RiskSeverity,
  TypedRisk,
} from "@/lib/types";
import { RISK_SEVERITY_WEIGHTS } from "@/lib/networks/riskScore";

/**
 * M6/M7 shared asset-risk join (Credits completion CAN-77).
 *
 * The join keys are PRECOMPUTED: `TypedRisk.linkedAssets` values are exact
 * `CoverageAsset.asset` names, matched by the dataset compiler against each
 * entity's own asset table. Everything here is an exact-key hash join — no
 * fuzzy matching, no re-derivation (the dataset's explicit rule). Risks whose
 * links match no rendered row (protocol-wide risks, bridged deployments) are
 * surfaced separately, never silently dropped or fuzzily attached.
 *
 * M7's scorecard/severity-matrix must consume these same types + functions so
 * the Asset coverage and Risks tabs stay two views of one object.
 */

/** The LlamaRisk four-category taxonomy the CAN-77 table scores per asset. */
export const CORE_RISK_CATEGORIES = [
  "Market",
  "Technological",
  "Counterparty",
  "Governance",
] as const;
export type CoreRiskCategory = (typeof CORE_RISK_CATEGORIES)[number];

export interface AssetSubScore {
  category: CoreRiskCategory;
  count: number;
  weighted: number;
  maxSeverity: RiskSeverity | null;
  /** The contributing risks — the methodology is never a black box. */
  risks: TypedRisk[];
}

export interface AssetRiskRow {
  asset: CoverageAsset;
  /** Risks whose precomputed linkedAssets include this asset row. */
  risks: TypedRisk[];
  /** Four core-category sub-scores (always all four, zeroes included). */
  subScores: AssetSubScore[];
  /** Regulatory risks linked to this asset — badged, never folded into the four. */
  regulatoryRisks: TypedRisk[];
  /** Sum of severity weights across all linked risks (bar-scale input). */
  totalWeighted: number;
  /** The entity's flagged-asset entry for this exact asset name, if any. */
  flagged: FlaggedAsset | null;
}

export interface AssetRiskJoin {
  rows: AssetRiskRow[];
  /** Risks with no linked asset row: protocol-wide or outside the curated table. */
  protocolWideRisks: TypedRisk[];
  /** Matched link keys that found no asset row (should be empty; never dropped). */
  unmatchedRiskLinks: string[];
  /** Highest totalWeighted across rows — normalises bar lengths within the entity. */
  maxRowWeighted: number;
}

const keyOf = (name: string) => name.trim().toUpperCase();

function severityRank(s: RiskSeverity): number {
  return RISK_SEVERITY_WEIGHTS[s] ?? 0;
}

function deriveSubScores(risks: TypedRisk[]): {
  subScores: AssetSubScore[];
  regulatory: TypedRisk[];
} {
  const buckets = new Map<CoreRiskCategory, TypedRisk[]>(
    CORE_RISK_CATEGORIES.map((c) => [c, []]),
  );
  const regulatory: TypedRisk[] = [];
  for (const risk of risks) {
    const core = CORE_RISK_CATEGORIES.find((c) => c === risk.category);
    if (core) buckets.get(core)!.push(risk);
    else regulatory.push(risk);
  }
  const subScores = CORE_RISK_CATEGORIES.map((category) => {
    const catRisks = buckets.get(category)!;
    let weighted = 0;
    let maxSeverity: RiskSeverity | null = null;
    for (const r of catRisks) {
      weighted += severityRank(r.severity);
      if (!maxSeverity || severityRank(r.severity) > severityRank(maxSeverity)) {
        maxSeverity = r.severity;
      }
    }
    return { category, count: catRisks.length, weighted, maxSeverity, risks: catRisks };
  });
  return { subScores, regulatory };
}

/**
 * The CAN-77 join: one row per curated asset carrying parameters + attached
 * risks. Pure and deterministic; safe to call from server components.
 */
export function buildAssetRiskRows(
  coverage: AssetCoverage,
  typedRisks: TypedRisk[] | undefined | null,
): AssetRiskJoin {
  const risksByAsset = new Map<string, TypedRisk[]>();
  const linkedAnywhere = new Set<TypedRisk>();
  const rowKeys = new Set(coverage.assets.map((a) => keyOf(a.asset)));
  const unmatched = new Set<string>();

  for (const risk of typedRisks ?? []) {
    for (const link of risk.linkedAssets ?? []) {
      const key = keyOf(link);
      if (rowKeys.has(key)) {
        const list = risksByAsset.get(key) ?? [];
        list.push(risk);
        risksByAsset.set(key, list);
        linkedAnywhere.add(risk);
      } else {
        unmatched.add(link);
      }
    }
  }

  const flaggedByAsset = new Map(coverage.flaggedAssets.map((f) => [keyOf(f.asset), f]));

  let maxRowWeighted = 0;
  const rows: AssetRiskRow[] = coverage.assets.map((asset) => {
    const risks = risksByAsset.get(keyOf(asset.asset)) ?? [];
    const { subScores, regulatory } = deriveSubScores(risks);
    const totalWeighted = risks.reduce((sum, r) => sum + severityRank(r.severity), 0);
    if (totalWeighted > maxRowWeighted) maxRowWeighted = totalWeighted;
    return {
      asset,
      risks,
      subScores,
      regulatoryRisks: regulatory,
      totalWeighted,
      flagged: flaggedByAsset.get(keyOf(asset.asset)) ?? null,
    };
  });

  const protocolWideRisks = (typedRisks ?? []).filter((r) => !linkedAnywhere.has(r));

  return { rows, protocolWideRisks, unmatchedRiskLinks: [...unmatched], maxRowWeighted };
}

/* --------------------------- client table model --------------------------- */

/**
 * Index-based serialization of the join for the client AssetRiskTable: each
 * TypedRisk crosses the RSC boundary exactly once, rows reference risks by
 * index (a risk linked to five assets would otherwise serialize five times).
 */
export interface AssetSubScoreModel {
  category: CoreRiskCategory;
  count: number;
  weighted: number;
  maxSeverity: RiskSeverity | null;
  riskIdx: number[];
}

export interface AssetRiskRowModel {
  asset: CoverageAsset;
  riskIdx: number[];
  subScores: AssetSubScoreModel[];
  regulatoryIdx: number[];
  totalWeighted: number;
  flagged: FlaggedAsset | null;
}

export interface AssetRiskTableModel {
  entitySlug: string;
  shape: AssetCoverage["shape"];
  risks: TypedRisk[];
  rows: AssetRiskRowModel[];
  protocolWideIdx: number[];
  /** Highest single sub-score weighted value — normalises bar lengths. */
  maxSubScoreWeighted: number;
  /** True when at least one row carries a parameter value (stella has none —
   *  dormant entities render an asset list, never an empty parameter grid). */
  hasParams: boolean;
  riskLinkNote: string | null;
}

export function buildAssetRiskTableModel(
  coverage: AssetCoverage,
  typedRisks: TypedRisk[] | undefined | null,
  entitySlug: string,
): AssetRiskTableModel {
  const join = buildAssetRiskRows(coverage, typedRisks);
  const risks = typedRisks ?? [];
  const indexOf = new Map(risks.map((r, i) => [r, i]));
  let maxSubScoreWeighted = 0;

  const rows: AssetRiskRowModel[] = join.rows.map((row) => ({
    asset: row.asset,
    riskIdx: row.risks.map((r) => indexOf.get(r)!),
    subScores: row.subScores.map((s) => {
      if (s.weighted > maxSubScoreWeighted) maxSubScoreWeighted = s.weighted;
      return {
        category: s.category,
        count: s.count,
        weighted: s.weighted,
        maxSeverity: s.maxSeverity,
        riskIdx: s.risks.map((r) => indexOf.get(r)!),
      };
    }),
    regulatoryIdx: row.regulatoryRisks.map((r) => indexOf.get(r)!),
    totalWeighted: row.totalWeighted,
    flagged: row.flagged,
  }));

  const hasParams = coverage.assets.some(
    (a) =>
      a.maxLtvPct != null ||
      a.maxLtvText != null ||
      a.liqThresholdPct != null ||
      a.liqThresholdText != null ||
      a.supplyCapDisplay != null ||
      a.borrowCapDisplay != null ||
      a.fixedImpliedApy != null ||
      a.maturityOrTerm != null,
  );

  return {
    entitySlug,
    shape: coverage.shape,
    risks,
    rows,
    protocolWideIdx: join.protocolWideRisks.map((r) => indexOf.get(r)!),
    maxSubScoreWeighted,
    hasParams,
    riskLinkNote: coverage.riskLinkNote ?? null,
  };
}

/* ------------------------------ composition ------------------------------- */

export interface CompositionSlice {
  label: string;
  value: number;
}

export interface CollateralComposition {
  slices: CompositionSlice[];
  /** Honest basis statement rendered as the chart caption. */
  basis: string;
}

const ROLE_LABELS: Record<CoverageAsset["roleKind"], string> = {
  collateral: "Collateral only",
  loan: "Loan only",
  both: "Collateral + loan",
  other: "Other instruments",
};

/**
 * Donut input for CAN-72. Counts only — supply caps are native-unit amounts
 * that must never be summed as if USD. Basis: chains when the coverage spans
 * more than one, else role mix.
 */
export function buildCollateralComposition(coverage: AssetCoverage): CollateralComposition | null {
  if (!coverage.assets.length) return null;
  const chains = new Map<string, number>();
  for (const a of coverage.assets) {
    const chain = a.chain ?? "Unspecified";
    chains.set(chain, (chains.get(chain) ?? 0) + 1);
  }
  if (chains.size > 1) {
    return {
      slices: [...chains.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({ label, value })),
      basis: "Share of curated asset listings by chain (count, not value).",
    };
  }
  const roles = new Map<string, number>();
  for (const a of coverage.assets) {
    const label = ROLE_LABELS[a.roleKind];
    roles.set(label, (roles.get(label) ?? 0) + 1);
  }
  return {
    slices: [...roles.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value })),
    basis: "Share of curated asset listings by role (count, not value).",
  };
}

/* -------------------------------- segments -------------------------------- */

export type CoverageSegmentId =
  | "collateral"
  | "loan"
  | "instruments"
  | "oracles"
  | "risk-parameters"
  | "governance"
  | "deployment";

export interface CoverageSegment {
  id: CoverageSegmentId;
  label: string;
  count: number | null;
}

/**
 * Data-driven segment list (CAN-72's six segments; fixed-income entities whose
 * rows are neither side of a lending market get one "Instruments" segment in
 * place of the Collateral/Loan pair). Only segments with content render.
 */
export function buildCoverageSegments(
  coverage: AssetCoverage,
  lending: NetworkProfile["lending"],
): CoverageSegment[] {
  const segments: CoverageSegment[] = [];
  const collateral = coverage.assets.filter(
    (a) => a.roleKind === "collateral" || a.roleKind === "both",
  );
  const loan = coverage.assets.filter((a) => a.roleKind === "loan" || a.roleKind === "both");
  const instruments = coverage.assets.filter((a) => a.roleKind === "other");

  if (collateral.length) segments.push({ id: "collateral", label: "Collateral", count: collateral.length });
  if (loan.length) segments.push({ id: "loan", label: "Loan assets", count: loan.length });
  if (instruments.length) {
    segments.push({ id: "instruments", label: "Instruments", count: instruments.length });
  }
  if (coverage.oracles.length) {
    segments.push({ id: "oracles", label: "Oracles", count: coverage.oracles.length });
  }
  if (coverage.shape === "lending" || coverage.flaggedAssets.length) {
    segments.push({
      id: "risk-parameters",
      label: "Risk parameters",
      count: coverage.flaggedAssets.length || null,
    });
  }
  if (lending?.governanceDetail || lending?.governanceActivity) {
    segments.push({ id: "governance", label: "Governance", count: null });
  }
  if (lending?.deployment || lending?.auditHistory) {
    segments.push({ id: "deployment", label: "Deployment", count: null });
  }
  return segments;
}

export function resolveCoverageSegment(
  raw: string | undefined,
  segments: CoverageSegment[],
): CoverageSegmentId | null {
  if (!segments.length) return null;
  const hit = segments.find((s) => s.id === raw);
  return (hit ?? segments[0]).id;
}

/* ------------------------------- cross-links ------------------------------ */

/**
 * Exact-symbol -> platform entity slug map for clickable asset references
 * (CAN-72). Every slug verified present in the store 2026-07-26; issue-text
 * correction recorded on CAN-72: Chainlink / Chronicle / Pyth are NOT store
 * entities, so oracle providers render as text + source links instead.
 */
const ASSET_ENTITY_SLUGS: Record<string, string> = {
  WSTETH: "lido",
  STETH: "lido",
  WEETH: "ether-fi",
  RETH: "rocket-pool",
  USDE: "ethena",
  SUSDE: "ethena",
  USDS: "sky",
  SUSDS: "sky",
  DAI: "sky",
  GHO: "aave",
  AAVE: "aave",
  COMP: "compound",
  MORPHO: "morpho",
  SYRUP: "maple",
  PENDLE: "pendle",
};

/** Entity page for an asset symbol, or null. Never links a page to itself. */
export function assetEntityHref(assetName: string, currentSlug: string): string | null {
  const slug = ASSET_ENTITY_SLUGS[keyOf(assetName)];
  if (!slug || slug === currentSlug) return null;
  return `/networks/${slug}`;
}
