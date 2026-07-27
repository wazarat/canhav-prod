/**
 * M8 Competitors tab view model (CAN-84 / CAN-87 / CAN-89).
 *
 * Consumes the GENERATED creditCompetitorModel + creditComparables modules
 * (committed cohorts: dev and prod always agree, maple's tag divergence
 * included) and the live profiles for TVL overrides and risk composites.
 * Never forks riskScore.ts: deriveRiskCategoryScores is the only sanctioned
 * derivation, and risk comparisons stay inside RISK_COHORTS per tag
 * (docs/credit/risk-taxonomy.md: composites are never comparable across tags).
 */

import {
  COMPETITOR_EDGES,
  COMPETITOR_NODES,
  RISK_COHORTS,
  TAG_COHORTS,
  TIER_B_ROWS,
  type CompetitorEdge,
  type CompetitorNode,
  type CreditCompetitorTag,
  type TierBRow,
} from "@/lib/networks/creditCompetitorModel";
import { CREDIT_COMPARABLES, type CreditComparable } from "@/lib/networks/creditComparables";
import { deriveRiskCategoryScores } from "@/lib/networks/riskScore";
import { SHARED_RISK_DRIVERS } from "@/lib/networks/sharedRiskDrivers";
import { networkHeadlineTvlUsd } from "@/lib/networks/marketHeadlines";
import { ENTITY_STATUS_OVERRIDES } from "@/components/networks/research/entityStatus";
import type { NetworkProfile } from "@/lib/types";

/* --------------------------------- params --------------------------------- */

export type CompetitorsViewId = "list" | "compare" | "map";

export function resolveCompetitorsView(raw: string | undefined): CompetitorsViewId {
  return raw === "compare" ? "compare" : raw === "map" ? "map" : "list";
}

export const QUADRANT_AXES = [
  { id: "tvl-borrowed", xLabel: "TVL (log)", yLabel: "Total borrowed (log)" },
  { id: "tvl-chains", xLabel: "TVL (log)", yLabel: "Chain count" },
  { id: "tvl-risk", xLabel: "TVL (log)", yLabel: "Risk composite" },
  { id: "borrowed-risk", xLabel: "Total borrowed (log)", yLabel: "Risk composite" },
] as const;
export type QuadrantAxesId = (typeof QUADRANT_AXES)[number]["id"];

export function resolveAxesParam(raw: string | undefined): QuadrantAxesId {
  return (QUADRANT_AXES.some((a) => a.id === raw) ? raw : "tvl-borrowed") as QuadrantAxesId;
}

/** Comparison picker selection: valid same-tag cohort slugs only, cap 3. */
export function resolvePeersParam(
  raw: string | undefined,
  cohort: string[],
  selfSlug: string,
): string[] {
  if (!raw) return [];
  const valid = new Set(cohort.filter((s) => s !== selfSlug));
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const slug = part.trim();
    if (valid.has(slug) && !out.includes(slug)) out.push(slug);
    if (out.length === 3) break;
  }
  return out;
}

/* ------------------------------- cohort math ------------------------------ */

/** Committed primary tag (cohort membership), NOT profile.tags. */
export function competitorTagOf(slug: string): CreditCompetitorTag | null {
  for (const [tag, cohort] of Object.entries(TAG_COHORTS)) {
    if (cohort.includes(slug)) return tag as CreditCompetitorTag;
  }
  return null;
}

/** Credit-secondary entities render in the "adjacent sectors" group. */
const CREDIT_SECONDARY = new Set(["sky", "centrifuge", "clearpool", "goldfinch"]);
const ADJACENT_SECTOR_LABEL: Record<string, string> = {
  sky: "Stablecoin",
  centrifuge: "RWA / Private Credit",
  clearpool: "RWA / Private Credit",
  goldfinch: "RWA / Private Credit",
};

function edgesOf(slug: string): CompetitorEdge[] {
  return COMPETITOR_EDGES.filter((e) => e.a === slug || e.b === slug);
}

/* --------------------------------- tier A -------------------------------- */

export interface SharedDriverChip {
  label: string;
  entityCount: number;
  audit: boolean;
}

export interface TierARow {
  slug: string;
  name: string;
  tagline: string | null;
  tag: CreditCompetitorTag | null;
  /** Curated/direct relationship (edge) vs plain cohort membership. */
  direct: boolean;
  entityType: CompetitorNode["entityType"] | "unknown";
  auditStatus: CompetitorNode["auditStatus"] | null;
  tagFit?: "partial";
  /** "Same parent: Pendle" label; never render the pair as plain rivals. */
  sharedParentLabel: string | null;
  alsoPartner: boolean;
  nonSteadyStateLabel: string | null;
  dataQualityFlags: string[];
  adjacentSectorLabel: string | null;
  tvlUsd: number | null;
  /** "live" = universalMetrics headline; "snapshot" = committed comparable. */
  tvlSource: "live" | "snapshot" | null;
  totalBorrowedUsd: number | null;
  chainCount: number | null;
  asOf: string | null;
  /** Shared risk drivers with the current entity; audit firms flagged. */
  sharedDrivers: SharedDriverChip[];
}

function sharedDriversBetween(a: string, b: string): SharedDriverChip[] {
  const out: SharedDriverChip[] = [];
  for (const driver of Object.values(SHARED_RISK_DRIVERS)) {
    if (driver.entities.includes(a) && driver.entities.includes(b)) {
      out.push({ label: driver.label, entityCount: driver.entityCount, audit: driver.audit });
    }
  }
  // Real dependencies first, audit firms last (dataset: weaker signal).
  return out.sort((x, y) => Number(x.audit) - Number(y.audit) || y.entityCount - x.entityCount);
}

function tierARow(
  selfSlug: string,
  peerSlug: string,
  profileBySlug: Map<string, NetworkProfile>,
  edge: CompetitorEdge | undefined,
): TierARow {
  const node = COMPETITOR_NODES[peerSlug] as CompetitorNode | undefined;
  const peerProfile = profileBySlug.get(peerSlug);
  const comparable: CreditComparable | undefined = CREDIT_COMPARABLES[peerSlug];
  const liveTvl = peerProfile ? networkHeadlineTvlUsd(peerProfile) : null;
  const status = ENTITY_STATUS_OVERRIDES[peerSlug];
  // Shared-parent labeling (boros <-> pendle): the pair must never read as
  // plain rivals, and boros carries its parent label everywhere it appears.
  const selfNode = COMPETITOR_NODES[selfSlug] as CompetitorNode | undefined;
  const peerParent = node?.parentSlug ?? null;
  const peerParentName = peerParent ? (COMPETITOR_NODES[peerParent]?.name ?? peerParent) : null;
  let sharedParentLabel: string | null = null;
  if (peerParent === selfSlug) {
    sharedParentLabel = `${node?.name ?? peerSlug} is a ${COMPETITOR_NODES[selfSlug]?.name ?? selfSlug} product, not an independent rival`;
  } else if (selfNode?.parentSlug === peerSlug) {
    sharedParentLabel = "Parent protocol (same team and brand)";
  } else if (peerParentName) {
    sharedParentLabel = `${peerParentName} product (same team)`;
  }

  return {
    slug: peerSlug,
    name: node?.name ?? peerProfile?.name ?? peerSlug,
    tagline: peerProfile?.tagline ?? null,
    tag: node?.tag ?? null,
    direct: Boolean(edge),
    entityType: node?.entityType ?? "unknown",
    auditStatus: node?.auditStatus ?? null,
    ...(node?.tagFit === "partial" ? { tagFit: "partial" as const } : {}),
    sharedParentLabel,
    alsoPartner: Boolean(edge?.alsoPartner),
    nonSteadyStateLabel: status?.label ?? null,
    dataQualityFlags: node?.dataQualityFlags ?? [],
    adjacentSectorLabel: ADJACENT_SECTOR_LABEL[peerSlug] ?? null,
    tvlUsd: liveTvl ?? comparable?.tvlUsd ?? null,
    tvlSource: liveTvl != null ? "live" : comparable?.tvlUsd != null ? "snapshot" : null,
    totalBorrowedUsd: comparable?.totalBorrowedUsd ?? null,
    chainCount: comparable?.chainCount ?? null,
    asOf: liveTvl != null ? null : (comparable?.asOf ?? null),
    sharedDrivers: sharedDriversBetween(selfSlug, peerSlug),
  };
}

/* ------------------------------- percentiles ------------------------------ */

export interface PercentileRow {
  metricId: string;
  label: string;
  /** Raw value for the current entity; null renders a placeholder. */
  value: number | null;
  display: string;
  /** Competition rank, 1 = best within the cohort's non-null values. */
  rank: number | null;
  /** Cohort members with a non-null value (the honest denominator). */
  of: number;
  cohortSize: number;
  /** 0-100, bar width; 100 = best. Null when value or cohort is missing. */
  percentile: number | null;
  asOf: string | null;
  placeholderReason: string | null;
  /** Direction note rendered beside the label (e.g. risk: lower = better). */
  note: string | null;
}

function fmtUsd(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}bn`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}m`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}k`;
  return `$${v.toFixed(0)}`;
}

interface MetricSpec {
  metricId: string;
  label: string;
  note: string | null;
  /** true = larger raw value ranks better. */
  higherIsBetter: boolean;
  read: (slug: string) => number | null;
  display: (v: number) => string;
  asOf: (slug: string) => string | null;
  placeholderReason: string;
}

function comparableOf(slug: string): CreditComparable | undefined {
  return CREDIT_COMPARABLES[slug];
}

function percentileRow(spec: MetricSpec, selfSlug: string, cohort: string[]): PercentileRow {
  const values = cohort
    .map((slug) => ({ slug, v: spec.read(slug) }))
    .filter((r): r is { slug: string; v: number } => r.v != null);
  const value = spec.read(selfSlug);
  const of = values.length;
  let rank: number | null = null;
  let percentile: number | null = null;
  if (value != null && of > 1) {
    const better = values.filter(
      (r) => r.slug !== selfSlug && (spec.higherIsBetter ? r.v > value : r.v < value),
    ).length;
    rank = better + 1;
    percentile = Math.round(((of - rank) / (of - 1)) * 100);
  } else if (value != null) {
    rank = 1;
    percentile = 100;
  }
  return {
    metricId: spec.metricId,
    label: spec.label,
    value,
    display: value != null ? spec.display(value) : "-",
    rank,
    of,
    cohortSize: cohort.length,
    percentile,
    asOf: spec.asOf(selfSlug),
    placeholderReason: value == null ? spec.placeholderReason : null,
    note: spec.note,
  };
}

/** Risk composite via the sanctioned derivation; null when unrated. */
function riskCompositeOf(profile: NetworkProfile | undefined): number | null {
  if (!profile?.typedRisks?.length) return null;
  const scores = deriveRiskCategoryScores(profile.typedRisks);
  if (!scores.length) return null;
  return scores.reduce((sum, s) => sum + s.weighted, 0);
}

/* -------------------------------- quadrant -------------------------------- */

export interface QuadrantPoint {
  slug: string;
  name: string;
  x: number;
  y: number;
  self: boolean;
  nonSteadyState: boolean;
}

export interface QuadrantModel {
  axes: QuadrantAxesId;
  xLabel: string;
  yLabel: string;
  xLog: boolean;
  yLog: boolean;
  points: QuadrantPoint[];
  /** e.g. "Risk axes plot only the 5 of 12 rated entities." */
  coverageNote: string | null;
  asOf: string | null;
}

/* --------------------------- comparison columns --------------------------- */

/** Serializable column for the capped comparison matrix (self + up to 3). */
export interface CompareColumn {
  slug: string;
  name: string;
  tag: CreditCompetitorTag | null;
  entityTypeLabel: string;
  statusLabel: string | null;
  sharedParentLabel: string | null;
  auditLabel: string;
  tvlUsd: number | null;
  totalBorrowedUsd: number | null;
  chainCount: number | null;
  launchDate: string | null;
  asOf: string | null;
  /** Shared drivers with the PAGE entity (self column shows "-"). */
  sharedDriverLabels: string[];
}

function compareColumnFor(selfSlug: string, slug: string): CompareColumn {
  const node = COMPETITOR_NODES[slug] as CompetitorNode | undefined;
  const comparable = comparableOf(slug);
  const status = ENTITY_STATUS_OVERRIDES[slug];
  const parent = node?.parentSlug ? (COMPETITOR_NODES[node.parentSlug]?.name ?? node.parentSlug) : null;
  return {
    slug,
    name: node?.name ?? slug,
    tag: node?.tag ?? null,
    entityTypeLabel: node?.entityType === "risk-curator" ? "Risk curator" : "Protocol",
    statusLabel: status?.label ?? null,
    sharedParentLabel: parent ? `${parent} product (same team)` : null,
    auditLabel:
      node?.auditStatus === "not-applicable"
        ? "n/a (no own contracts)"
        : node?.auditStatus === "unverified"
          ? "Unverified"
          : comparable?.auditCount != null
            ? `${comparable.auditCount} recorded`
            : "Unverified",
    tvlUsd: comparable?.tvlUsd ?? null,
    totalBorrowedUsd: comparable?.totalBorrowedUsd ?? null,
    chainCount: comparable?.chainCount ?? null,
    launchDate: comparable?.launchDate ?? null,
    asOf: comparable?.asOf ?? null,
    sharedDriverLabels:
      slug === selfSlug
        ? []
        : sharedDriversBetween(selfSlug, slug)
            .filter((d) => !d.audit)
            .map((d) => d.label),
  };
}

/* ------------------------------- tab model -------------------------------- */

export interface CompetitorsTabModel {
  slug: string;
  tag: CreditCompetitorTag | null;
  cohortSize: number;
  /** Entity's own status flags for the tab header area. */
  selfNode: CompetitorNode | null;
  tierA: {
    sameTag: TierARow[];
    otherCredit: TierARow[];
    adjacent: TierARow[];
  };
  tierB: TierBRow[];
  percentiles: PercentileRow[] | null;
  percentilesAsOf: string | null;
  /** Same-tag cohort candidates for the comparison picker (excl. self). */
  pickerCandidates: { slug: string; name: string }[];
  /** Comparison-matrix columns: self plus every cohort candidate. */
  compareSelf: CompareColumn | null;
  compareColumns: Record<string, CompareColumn>;
  quadrants: QuadrantModel[] | null;
}

export function buildCompetitorsTabModel(
  profile: NetworkProfile,
  allNetworks: NetworkProfile[],
): CompetitorsTabModel {
  const slug = profile.slug;
  const tag = competitorTagOf(slug);
  const profileBySlug = new Map(allNetworks.map((n) => [n.slug, n]));
  const edges = edgesOf(slug);
  const edgeByPeer = new Map<string, CompetitorEdge>(
    edges.map((e) => [e.a === slug ? e.b : e.a, e]),
  );

  const cohort = tag ? TAG_COHORTS[tag] : [];
  const sameTagSlugs = cohort.filter((s) => s !== slug);
  const edgePeers = [...edgeByPeer.keys()];
  const otherCreditSlugs = edgePeers.filter(
    (p) => !sameTagSlugs.includes(p) && !CREDIT_SECONDARY.has(p),
  );
  const adjacentSlugs = edgePeers.filter((p) => CREDIT_SECONDARY.has(p));

  const byTvl = (a: TierARow, b: TierARow) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0);
  const rows = (slugs: string[]) =>
    slugs.map((p) => tierARow(slug, p, profileBySlug, edgeByPeer.get(p))).sort(byTvl);
  // Direct (curated) competitors ahead of plain cohort peers, then TVL.
  const sameTag = rows(sameTagSlugs).sort(
    (a, b) => Number(b.direct) - Number(a.direct) || byTvl(a, b),
  );

  const tierB = tag
    ? TIER_B_ROWS.filter((r) => r.competesWithTags.includes(tag))
    : TIER_B_ROWS;

  // Percentiles: committed snapshot + the CAN-73 risk row (rated cohort only).
  let percentiles: PercentileRow[] | null = null;
  let percentilesAsOf: string | null = null;
  if (tag && cohort.includes(slug)) {
    const specs: MetricSpec[] = [
      {
        metricId: "tvl",
        label: "TVL",
        note: null,
        higherIsBetter: true,
        read: (s) => comparableOf(s)?.tvlUsd ?? null,
        display: fmtUsd,
        asOf: (s) => comparableOf(s)?.asOf ?? null,
        placeholderReason: "Not reported",
      },
      {
        metricId: "borrowed",
        label: "Total borrowed",
        note: "DefiLlama borrowed notional; can exceed TVL where supplied nets out borrowed collateral",
        higherIsBetter: true,
        read: (s) => comparableOf(s)?.totalBorrowedUsd ?? null,
        display: fmtUsd,
        asOf: (s) => comparableOf(s)?.asOf ?? null,
        placeholderReason: "Not reported by DefiLlama for this protocol",
      },
      {
        metricId: "chains",
        label: "Chain count",
        note: null,
        higherIsBetter: true,
        read: (s) => comparableOf(s)?.chainCount ?? null,
        display: (v) => String(v),
        asOf: (s) => comparableOf(s)?.asOf ?? null,
        placeholderReason: "Not reported",
      },
      {
        metricId: "track-record",
        label: "Track record",
        note: "DefiLlama listing date; earlier = longer",
        higherIsBetter: false, // earlier timestamp ranks better
        read: (s) => {
          const d = comparableOf(s)?.launchDate;
          return d ? Date.parse(d) : null;
        },
        display: (v) => `Listed ${new Date(v).toISOString().slice(0, 10)}`,
        asOf: (s) => comparableOf(s)?.asOf ?? null,
        placeholderReason: "Listing date unavailable",
      },
      {
        metricId: "audits",
        label: "Known audits",
        note: "count of recorded audits; blank = unverified, not zero",
        higherIsBetter: true,
        read: (s) => comparableOf(s)?.auditCount ?? null,
        display: (v) => String(v),
        asOf: (s) => comparableOf(s)?.asOf ?? null,
        placeholderReason: "Unverified (no structured audit metadata)",
      },
    ];
    percentiles = specs.map((spec) => percentileRow(spec, slug, cohort));

    // CAN-73 deferred peer comparison: per-tag RATED cohort only, never
    // cross-tag, sanctioned derivation only. Lower composite ranks better.
    const ratedCohort = RISK_COHORTS[tag];
    if (ratedCohort.includes(slug)) {
      const riskSpec: MetricSpec = {
        metricId: "risk-composite",
        label: "Risk composite",
        note: "documented-risk load vs rated tag peers; lower = fewer/lighter documented risks, not a safety score",
        higherIsBetter: false,
        read: (s) => riskCompositeOf(profileBySlug.get(s)),
        display: (v) => String(v),
        asOf: () => null,
        placeholderReason: "Not rated",
      };
      const row = percentileRow(riskSpec, slug, ratedCohort);
      row.of = ratedCohort.filter((s) => riskCompositeOf(profileBySlug.get(s)) != null).length;
      percentiles.push(row);
    }
    percentilesAsOf = comparableOf(slug)?.asOf ?? null;
  }

  // Quadrants (CAN-89): precomputed for all axis pairs; log-scale TVL/borrowed.
  let quadrants: QuadrantModel[] | null = null;
  if (tag && cohort.includes(slug)) {
    const ratedCohort = RISK_COHORTS[tag];
    quadrants = QUADRANT_AXES.map((axes) => {
      const [xId, yId] = axes.id.split("-") as [string, string];
      const readAxis = (s: string, id: string): number | null => {
        if (id === "tvl") return comparableOf(s)?.tvlUsd ?? null;
        if (id === "borrowed") return comparableOf(s)?.totalBorrowedUsd ?? null;
        if (id === "chains") return comparableOf(s)?.chainCount ?? null;
        return riskCompositeOf(profileBySlug.get(s));
      };
      const usesRisk = xId === "risk" || yId === "risk";
      const domain = usesRisk ? cohort.filter((s) => ratedCohort.includes(s)) : cohort;
      const points: QuadrantPoint[] = domain
        .map((s) => {
          const x = readAxis(s, xId);
          const y = readAxis(s, yId);
          if (x == null || y == null || x <= 0 || y <= 0) return null;
          return {
            slug: s,
            name: COMPETITOR_NODES[s]?.name ?? s,
            x,
            y,
            self: s === slug,
            nonSteadyState: Boolean(COMPETITOR_NODES[s]?.nonSteadyState),
          };
        })
        .filter((p): p is QuadrantPoint => p != null);
      return {
        axes: axes.id,
        xLabel: axes.xLabel,
        yLabel: axes.yLabel,
        xLog: xId === "tvl" || xId === "borrowed",
        yLog: yId === "tvl" || yId === "borrowed",
        points,
        coverageNote: usesRisk
          ? `Risk axes plot only the ${points.length} of ${cohort.length} rated entities in this cohort.`
          : points.length < cohort.length
            ? `${points.length} of ${cohort.length} cohort entities report both axes.`
            : null,
        asOf: comparableOf(slug)?.asOf ?? null,
      };
    });
  }

  return {
    slug,
    tag,
    cohortSize: cohort.length,
    selfNode: (COMPETITOR_NODES[slug] as CompetitorNode | undefined) ?? null,
    tierA: {
      sameTag,
      otherCredit: rows(otherCreditSlugs),
      adjacent: rows(adjacentSlugs),
    },
    tierB,
    percentiles,
    percentilesAsOf,
    pickerCandidates: sameTagSlugs.map((s) => ({
      slug: s,
      name: COMPETITOR_NODES[s]?.name ?? s,
    })),
    compareSelf: tag ? compareColumnFor(slug, slug) : null,
    compareColumns: Object.fromEntries(
      sameTagSlugs.map((s) => [s, compareColumnFor(slug, s)]),
    ),
    quadrants,
  };
}
