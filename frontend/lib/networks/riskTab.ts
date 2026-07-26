import type { NetworkProfile, RiskSeverity, TypedRisk } from "@/lib/types";
import { CORE_RISK_CATEGORIES, type CoverageSegmentId } from "@/lib/networks/assetRisk";
import {
  deriveRiskCategoryScores,
  type RiskCategoryScore,
} from "@/lib/networks/riskScore";
import {
  SHARED_RISK_DRIVERS,
  SHARED_DRIVER_ENTITY_TOTAL,
  type SharedRiskDriver,
} from "@/lib/networks/sharedRiskDrivers";

/**
 * M7 Risks-tab view model (Credits completion CAN-73/79/78).
 *
 * Consumes the SAME objects as the Asset coverage tab — riskScore.ts weights
 * and derivations, assetRisk.ts categories/segments — so the two tabs stay two
 * views of one object (the M6 handoff's non-negotiable interface). Everything
 * is recomputed from the stored TypedRisks at render time; nothing is
 * hand-assigned and no composite renders without its per-category inputs.
 *
 * Index-based serialization (M6 precedent): each TypedRisk crosses the RSC
 * boundary exactly once in `risks`; every other structure carries indices.
 */

/** Display order: the LlamaRisk four, then Regulatory (never folded in). */
export const RISK_TAB_CATEGORIES = [...CORE_RISK_CATEGORIES, "Regulatory"] as const;

/** 3-point axes of the dataset's likelihood/impact assessments. */
export const AXIS_LEVELS = ["low", "medium", "high"] as const;
export type AxisLevel = (typeof AXIS_LEVELS)[number];

/** Severity display order (worst first), shared by filters and legends. */
export const SEVERITY_ORDER: RiskSeverity[] = ["critical", "high", "medium", "low"];

export interface RiskScorecardModel {
  /** Sum of severity weights across ALL categories — never render without `categories`. */
  composite: number;
  totalRisks: number;
  criticalCount: number;
  /** The four core categories, zero rows synthesized, in RISK_TAB_CATEGORIES order. */
  categories: RiskCategoryScore[];
  /** Regulatory sub-score, or null when the dataset genuinely has no rows (a finding). */
  regulatory: RiskCategoryScore | null;
  /** Highest per-category weighted score — scales the gauges within the entity. */
  maxCategoryWeighted: number;
  /** Latest `asOf` month across the risk rows (e.g. "Apr 2026"). */
  lastReviewed: string | null;
}

export interface RiskMatrixModel {
  /** riskIdx per likelihood x impact cell. */
  cells: Record<AxisLevel, Record<AxisLevel, number[]>>;
  /** Risks missing likelihood or impact — surfaced under the grid, never dropped. */
  unplacedIdx: number[];
}

export interface RiskAssetLink {
  label: string;
  /** Asset coverage segment the linked asset row lives in (?tab=asset-coverage&seg=). */
  seg: CoverageSegmentId;
}

export interface RiskDriverBadge {
  label: string;
  kind: SharedRiskDriver["kind"];
  entityCount: number;
  /** Audit/bounty firm — weaker signal, render in a secondary group. */
  audit: boolean;
}

export interface RiskTabModel {
  entitySlug: string;
  /** Every TypedRisk, serialized once; all other structures carry indices. */
  risks: TypedRisk[];
  scorecard: RiskScorecardModel;
  matrix: RiskMatrixModel;
  /** Filter option domains — only values present in the data. */
  filterDomain: { categories: string[]; severities: RiskSeverity[] };
  /** Per riskIdx: linked assets resolved to their coverage segment (cross-links). */
  assetLinks: Record<number, RiskAssetLink[]>;
  /** Per riskIdx: shared-driver badges ("affects N of 14 Credit entities"). */
  sharedDriverBadges: Record<number, RiskDriverBadge[]>;
  /** Denominator for the driver badges. */
  driverEntityTotal: number;
}

/* ----------------------------- view resolution ---------------------------- */

export type RiskViewId = "list" | "matrix";

/** Mirrors resolveCoverageSegment: unknown/absent -> the default list view. */
export function resolveRiskView(raw: string | undefined): RiskViewId {
  return raw === "matrix" ? "matrix" : "list";
}

/* ------------------------ incident classification ------------------------- */

/**
 * Static eventType -> risk-category PRESENTATION map for the incident rail
 * (CAN-78 asks for root causes mapped to the CAN-73 categories; the dataset
 * carries only `eventType`). This is a documented classification, not
 * per-incident data — the UI must label it "categorised by event type".
 * Also cited verbatim in docs/credit/risk-taxonomy.md.
 */
export const INCIDENT_TYPE_CATEGORY: Record<string, (typeof RISK_TAB_CATEGORIES)[number]> = {
  exploit: "Technological",
  "oracle failure": "Technological",
  "oracle incident": "Technological",
  outage: "Technological",
  "bad debt": "Counterparty",
  default: "Counterparty",
  insolvency: "Counterparty",
  depeg: "Market",
  liquidation: "Market",
  "liquidation cascade": "Market",
  "governance attack": "Governance",
  "governance incident": "Governance",
  "regulatory action": "Regulatory",
};

export function incidentCategory(eventType: string | null | undefined): string | null {
  if (!eventType) return null;
  return INCIDENT_TYPE_CATEGORY[eventType.trim().toLowerCase()] ?? null;
}

/* ------------------------------ asOf parsing ------------------------------ */

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** "Apr 2026" -> 202604; unparseable -> null (never guessed). */
function asOfRank(asOf: string | null | undefined): number | null {
  if (!asOf) return null;
  const m = asOf.trim().match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
  if (!m) return null;
  const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
  if (!month) return null;
  return Number(m[2]) * 100 + month;
}

/**
 * Chronological rank for the dataset's human incident dates ("Jun 2022",
 * "18 Apr 2026") -> 20220600 / 20260418. Unparseable -> null; callers keep
 * such rows in their original position at the end, never drop them.
 */
export function incidentDateRank(date: string): number | null {
  const m = date.trim().match(/^(?:(\d{1,2})\s+)?([A-Za-z]{3,9})\s+(\d{4})$/);
  if (!m) return null;
  const month = MONTHS[m[2].slice(0, 3).toLowerCase()];
  if (!month) return null;
  return Number(m[3]) * 10000 + month * 100 + Number(m[1] ?? 0);
}

/* -------------------------------- builder -------------------------------- */

const keyOf = (name: string) => name.trim().toUpperCase();

const emptyCells = (): RiskMatrixModel["cells"] => ({
  low: { low: [], medium: [], high: [] },
  medium: { low: [], medium: [], high: [] },
  high: { low: [], medium: [], high: [] },
});

const isAxisLevel = (v: unknown): v is AxisLevel =>
  v === "low" || v === "medium" || v === "high";

/**
 * Build the Risks-tab model, or null when the profile's typedRisks are not the
 * rich M5/M6 dataset shape (no likelihood/impact anywhere) — callers fall back
 * to the legacy tab composition. Pure; safe in server components.
 */
export function buildRiskTabModel(profile: NetworkProfile): RiskTabModel | null {
  const risks = profile.typedRisks;
  if (!risks?.length) return null;
  if (!risks.some((r) => isAxisLevel(r.likelihood) && isAxisLevel(r.impact))) return null;

  /* Scorecard — same derivation the M5 RiskScoreChip consumes. */
  const derived = deriveRiskCategoryScores(risks);
  const byCategory = new Map(derived.map((s) => [s.category, s]));
  const categories = CORE_RISK_CATEGORIES.map(
    (category) =>
      byCategory.get(category) ?? { category, count: 0, weighted: 0, criticalCount: 0 },
  );
  const regulatory = byCategory.get("Regulatory") ?? null;
  const composite = derived.reduce((sum, s) => sum + s.weighted, 0);
  const totalRisks = derived.reduce((sum, s) => sum + s.count, 0);
  const criticalCount = derived.reduce((sum, s) => sum + s.criticalCount, 0);
  const maxCategoryWeighted = Math.max(
    ...categories.map((c) => c.weighted),
    regulatory?.weighted ?? 0,
  );

  let lastReviewed: string | null = null;
  let lastRank = -1;
  for (const r of risks) {
    const rank = asOfRank(r.asOf);
    if (rank != null && rank > lastRank) {
      lastRank = rank;
      lastReviewed = r.asOf!.trim();
    }
  }

  /* Matrix — rebinned from the stored rows (the dataset's pre-binned
   * likelihood_impact_matrix is the verification oracle, not the source). */
  const cells = emptyCells();
  const unplacedIdx: number[] = [];
  risks.forEach((r, idx) => {
    if (isAxisLevel(r.likelihood) && isAxisLevel(r.impact)) {
      cells[r.likelihood][r.impact].push(idx);
    } else {
      unplacedIdx.push(idx);
    }
  });

  /* Filter domains — data-present values in stable display order. */
  const presentCategories = new Set(risks.map((r) => r.category));
  const orderedKnown = RISK_TAB_CATEGORIES.filter((c) => presentCategories.has(c));
  const extras = [...presentCategories].filter(
    (c) => !(RISK_TAB_CATEGORIES as readonly string[]).includes(c),
  );
  const presentSeverities = new Set(risks.map((r) => r.severity));
  const filterDomain = {
    categories: [...orderedKnown, ...extras.sort()],
    severities: SEVERITY_ORDER.filter((s) => presentSeverities.has(s)),
  };

  /* Cross-links: linked assets -> their coverage segment (exact-key join on
   * the precomputed names; unmatched links stay drill-down text elsewhere). */
  const segByAsset = new Map<string, CoverageSegmentId>();
  for (const asset of profile.assetCoverage?.assets ?? []) {
    const seg: CoverageSegmentId =
      asset.roleKind === "loan"
        ? "loan"
        : asset.roleKind === "other"
          ? "instruments"
          : "collateral";
    segByAsset.set(keyOf(asset.asset), seg);
  }
  const assetLinks: Record<number, RiskAssetLink[]> = {};
  risks.forEach((r, idx) => {
    const links: RiskAssetLink[] = [];
    for (const name of r.linkedAssets ?? []) {
      const seg = segByAsset.get(keyOf(name));
      if (seg) links.push({ label: name, seg });
    }
    if (links.length) assetLinks[idx] = links;
  });

  /* Shared-driver badges: exact-key join across linked assets + partners. */
  const sharedDriverBadges: Record<number, RiskDriverBadge[]> = {};
  risks.forEach((r, idx) => {
    const seen = new Set<string>();
    const badges: RiskDriverBadge[] = [];
    const names = [
      ...(r.linkedAssets ?? []),
      ...(r.linkedAssetsUnmatched ?? []),
      ...(r.linkedPartners ?? []),
      ...(r.linkedPartnersUnmatched ?? []),
    ];
    for (const name of names) {
      const key = keyOf(name);
      if (seen.has(key)) continue;
      seen.add(key);
      const driver = SHARED_RISK_DRIVERS[key];
      if (driver) {
        badges.push({
          label: driver.label,
          kind: driver.kind,
          entityCount: driver.entityCount,
          audit: driver.audit,
        });
      }
    }
    if (badges.length) {
      badges.sort((a, b) => Number(a.audit) - Number(b.audit) || b.entityCount - a.entityCount);
      sharedDriverBadges[idx] = badges;
    }
  });

  return {
    entitySlug: profile.slug,
    risks,
    scorecard: {
      composite,
      totalRisks,
      criticalCount,
      categories,
      regulatory,
      maxCategoryWeighted,
      lastReviewed,
    },
    matrix: { cells, unplacedIdx },
    filterDomain,
    assetLinks,
    sharedDriverBadges,
    driverEntityTotal: SHARED_DRIVER_ENTITY_TOTAL,
  };
}
