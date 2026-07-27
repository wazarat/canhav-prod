import {
  buildCompetitorsTabModel,
  competitorTagOf,
  resolveAxesParam,
  resolveCompetitorsView,
  resolvePeersParam,
} from "@/lib/networks/competitorsTab";
import {
  COMPETITOR_EDGES,
  COMPETITOR_NODES,
  CREDIT_TAGGED_TOTAL,
  RISK_COHORTS,
  TAG_COHORTS,
  TIER_B_ROWS,
} from "@/lib/networks/creditCompetitorModel";
import { CREDIT_COMPARABLES } from "@/lib/networks/creditComparables";
import type { NetworkProfile, TypedRisk } from "@/lib/types";

/**
 * Unit tests for the M8 Competitors-tab view model and the generated
 * competitor model invariants (reciprocity is additionally store-asserted by
 * scripts/verify-m8-reciprocity.mjs).
 */

const profile = (slug: string, extra?: Partial<NetworkProfile>): NetworkProfile =>
  ({
    slug,
    name: slug,
    description: "",
    competitors: [],
    currentScale: { tvlUsd: null },
    ...extra,
  }) as NetworkProfile;

const risk = (severity: TypedRisk["severity"]): TypedRisk =>
  ({ category: "Market", severity, description: "d" }) as TypedRisk;

const ALL = Object.values(TAG_COHORTS)
  .flat()
  .map((slug) => profile(slug));

describe("generated model invariants", () => {
  it("has the committed cohort sizes (12 / 9 / 11 = 32)", () => {
    expect(TAG_COHORTS.Lending).toHaveLength(12);
    expect(TAG_COHORTS["Leveraged Yield"]).toHaveLength(9);
    expect(TAG_COHORTS["Fixed Income"]).toHaveLength(11);
    expect(new Set(Object.values(TAG_COHORTS).flat()).size).toBe(CREDIT_TAGGED_TOTAL);
  });

  it("keeps the risk cohorts at the M7 5/4/5 rated entities", () => {
    expect(RISK_COHORTS.Lending).toHaveLength(5);
    expect(RISK_COHORTS["Leveraged Yield"]).toHaveLength(4);
    expect(RISK_COHORTS["Fixed Income"]).toHaveLength(5);
  });

  it("edges are sorted unique pairs without self-loops", () => {
    const seen = new Set<string>();
    for (const e of COMPETITOR_EDGES) {
      expect(e.a < e.b).toBe(true);
      const key = `${e.a}|${e.b}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("boros carries the pendle parent link and the sharedParent edge", () => {
    expect(COMPETITOR_NODES.boros.parentSlug).toBe("pendle");
    const edge = COMPETITOR_EDGES.find((e) => e.a === "boros" && e.b === "pendle");
    expect(edge?.sharedParent).toBe(true);
  });

  it("steakhouse is a risk curator with not-applicable audit status", () => {
    expect(COMPETITOR_NODES["steakhouse-financial"].entityType).toBe("risk-curator");
    expect(COMPETITOR_NODES["steakhouse-financial"].auditStatus).toBe("not-applicable");
  });

  it("every tagged slug has a comparables snapshot with an asOf", () => {
    for (const slug of Object.values(TAG_COHORTS).flat()) {
      expect(CREDIT_COMPARABLES[slug]).toBeDefined();
      expect(CREDIT_COMPARABLES[slug].asOf).toBeTruthy();
      // utilisation is never derived (CAN-87): protocol-reported only, null this pass
      expect(CREDIT_COMPARABLES[slug].utilizationPct).toBeNull();
    }
  });

  it("fira's borrowed figure is withheld (data-quality flag)", () => {
    expect(CREDIT_COMPARABLES.fira.totalBorrowedUsd).toBeNull();
  });
});

describe("param resolution", () => {
  it("resolves views with list fallback", () => {
    expect(resolveCompetitorsView(undefined)).toBe("list");
    expect(resolveCompetitorsView("compare")).toBe("compare");
    expect(resolveCompetitorsView("map")).toBe("map");
    expect(resolveCompetitorsView("garbage")).toBe("list");
  });

  it("resolves axes with tvl-borrowed fallback", () => {
    expect(resolveAxesParam("tvl-risk")).toBe("tvl-risk");
    expect(resolveAxesParam("nope")).toBe("tvl-borrowed");
  });

  it("caps peers at 3, drops invalid and self, dedupes", () => {
    const cohort = TAG_COHORTS.Lending;
    expect(
      resolvePeersParam("morpho,spark,aave,compound,euler", cohort, "aave"),
    ).toEqual(["morpho", "spark", "compound"]);
    expect(resolvePeersParam("morpho,morpho,garbage", cohort, "aave")).toEqual(["morpho"]);
    expect(resolvePeersParam(undefined, cohort, "aave")).toEqual([]);
  });
});

describe("buildCompetitorsTabModel", () => {
  it("builds the full same-tag cohort for a Lending entity", () => {
    const model = buildCompetitorsTabModel(profile("aave"), ALL);
    expect(model.tag).toBe("Lending");
    expect(model.tierA.sameTag).toHaveLength(11);
    const slugs = model.tierA.sameTag.map((r) => r.slug);
    expect(slugs).toContain("steakhouse-financial");
    expect(slugs).toContain("liquity");
    expect(slugs).not.toContain("aave");
  });

  it("marks direct rows ahead of plain cohort peers", () => {
    const model = buildCompetitorsTabModel(profile("aave"), ALL);
    const firstNonDirect = model.tierA.sameTag.findIndex((r) => !r.direct);
    const lastDirect = model.tierA.sameTag.map((r) => r.direct).lastIndexOf(true);
    if (firstNonDirect !== -1) expect(lastDirect).toBeLessThan(firstNonDirect);
  });

  it("never shows boros and pendle as plain rivals", () => {
    const fromBoros = buildCompetitorsTabModel(profile("boros"), ALL);
    const pendleRow = fromBoros.tierA.sameTag.find((r) => r.slug === "pendle");
    expect(pendleRow?.sharedParentLabel).toBe("Parent protocol (same team and brand)");

    const fromPendle = buildCompetitorsTabModel(profile("pendle"), ALL);
    const borosRow = fromPendle.tierA.sameTag.find((r) => r.slug === "boros");
    expect(borosRow?.sharedParentLabel).toContain("is a Pendle Finance product");
  });

  it("filters Tier B rows to the entity's tag", () => {
    const lending = buildCompetitorsTabModel(profile("aave"), ALL);
    expect(lending.tierB.length).toBeGreaterThan(0);
    for (const row of lending.tierB) expect(row.competesWithTags).toContain("Lending");
    const fi = buildCompetitorsTabModel(profile("pendle"), ALL);
    for (const row of fi.tierB) expect(row.competesWithTags).toContain("Fixed Income");
    expect(TIER_B_ROWS.length).toBe(15);
  });

  it("renders percentile rows with rank-of-reporting denominators", () => {
    const model = buildCompetitorsTabModel(profile("aave"), ALL);
    expect(model.percentiles).not.toBeNull();
    const tvl = model.percentiles!.find((r) => r.metricId === "tvl")!;
    expect(tvl.rank).toBe(1); // aave is the largest Lending entity by TVL
    expect(tvl.of).toBeLessThanOrEqual(model.cohortSize);
    expect(tvl.percentile).toBe(100);
    const audits = model.percentiles!.find((r) => r.metricId === "audits")!;
    // unverified entities are excluded from the denominator, not counted as zero
    expect(audits.of).toBeLessThan(model.cohortSize);
  });

  it("adds the CAN-73 risk-composite row only for rated entities, rated cohort only", () => {
    const rated = ALL.map((p) =>
      RISK_COHORTS.Lending.includes(p.slug)
        ? profile(p.slug, { typedRisks: [risk("critical"), risk("low")] })
        : p,
    );
    const model = buildCompetitorsTabModel(
      rated.find((p) => p.slug === "aave")!,
      rated,
    );
    const row = model.percentiles!.find((r) => r.metricId === "risk-composite");
    expect(row).toBeDefined();
    expect(row!.of).toBe(5); // Lending rated cohort, never the full cohort of 12

    const unrated = buildCompetitorsTabModel(profile("steakhouse-financial"), ALL);
    expect(unrated.percentiles!.some((r) => r.metricId === "risk-composite")).toBe(false);
  });

  it("risk composite ranks lower-is-better", () => {
    const rated = ALL.map((p) => {
      if (p.slug === "aave") return profile(p.slug, { typedRisks: [risk("low")] });
      if (RISK_COHORTS.Lending.includes(p.slug)) {
        return profile(p.slug, { typedRisks: [risk("critical"), risk("critical")] });
      }
      return p;
    });
    const model = buildCompetitorsTabModel(rated.find((p) => p.slug === "aave")!, rated);
    const row = model.percentiles!.find((r) => r.metricId === "risk-composite")!;
    expect(row.rank).toBe(1);
  });

  it("quadrant risk axes plot only the rated subset and log axes are positive", () => {
    const rated = ALL.map((p) =>
      RISK_COHORTS.Lending.includes(p.slug)
        ? profile(p.slug, { typedRisks: [risk("high")] })
        : p,
    );
    const model = buildCompetitorsTabModel(rated.find((p) => p.slug === "aave")!, rated);
    const tvlRisk = model.quadrants!.find((q) => q.axes === "tvl-risk")!;
    expect(tvlRisk.points.length).toBeLessThanOrEqual(RISK_COHORTS.Lending.length);
    expect(tvlRisk.coverageNote).toContain("rated");
    for (const q of model.quadrants!) {
      for (const p of q.points) {
        expect(p.x).toBeGreaterThan(0);
        expect(p.y).toBeGreaterThan(0);
      }
    }
  });

  it("returns no cohort features for an untagged credit entity", () => {
    const model = buildCompetitorsTabModel(profile("venus"), ALL);
    expect(model.tag).toBeNull();
    expect(model.percentiles).toBeNull();
    expect(model.quadrants).toBeNull();
    expect(competitorTagOf("venus")).toBeNull();
  });
});
