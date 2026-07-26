import { buildRiskTabModel, incidentCategory, resolveRiskView } from "@/lib/networks/riskTab";
import type { NetworkProfile, TypedRisk } from "@/lib/types";

/**
 * Unit tests for the M7 Risks-tab view model (pure derivations; the
 * dataset-fidelity cross-check lives in scripts/verify-m7-risk-derivations.mjs).
 */

const risk = (partial: Partial<TypedRisk>): TypedRisk => ({
  category: "Market",
  severity: "medium",
  description: "d",
  ...partial,
});

const profileWith = (risks: TypedRisk[], extra?: Partial<NetworkProfile>): NetworkProfile =>
  ({
    slug: "aave",
    typedRisks: risks,
    ...extra,
  }) as NetworkProfile;

describe("buildRiskTabModel gate", () => {
  it("returns null without typedRisks", () => {
    expect(buildRiskTabModel(profileWith([]))).toBeNull();
  });

  it("returns null for legacy rows without likelihood/impact", () => {
    const model = buildRiskTabModel(
      profileWith([risk({ category: "Technological", severity: "high" })]),
    );
    expect(model).toBeNull();
  });

  it("builds when at least one row carries both axes", () => {
    const model = buildRiskTabModel(
      profileWith([risk({ likelihood: "high", impact: "high", severity: "critical" })]),
    );
    expect(model).not.toBeNull();
  });
});

describe("scorecard derivation", () => {
  const rows = [
    risk({ category: "Market", severity: "critical", likelihood: "high", impact: "high", asOf: "Apr 2026" }),
    risk({ category: "Market", severity: "low", likelihood: "low", impact: "low", asOf: "Mar 2026" }),
    risk({ category: "Counterparty", severity: "high", likelihood: "medium", impact: "high", asOf: "Nov 2025" }),
    risk({ category: "Regulatory", severity: "medium", likelihood: "medium", impact: "medium", asOf: "Apr 2026" }),
  ];

  it("synthesizes zero rows for absent core categories, in display order", () => {
    const model = buildRiskTabModel(profileWith(rows))!;
    expect(model.scorecard.categories.map((c) => c.category)).toEqual([
      "Market",
      "Technological",
      "Counterparty",
      "Governance",
    ]);
    const tech = model.scorecard.categories[1];
    expect(tech).toMatchObject({ count: 0, weighted: 0, criticalCount: 0 });
  });

  it("keeps Regulatory out of the four and sums the composite across all", () => {
    const model = buildRiskTabModel(profileWith(rows))!;
    expect(model.scorecard.regulatory).toMatchObject({ count: 1, weighted: 2 });
    // 4 (critical) + 1 (low) + 3 (high) + 2 (medium)
    expect(model.scorecard.composite).toBe(10);
    expect(model.scorecard.totalRisks).toBe(4);
    expect(model.scorecard.criticalCount).toBe(1);
  });

  it("reports genuine Regulatory absence as null, not zero", () => {
    const model = buildRiskTabModel(profileWith(rows.slice(0, 3)))!;
    expect(model.scorecard.regulatory).toBeNull();
  });

  it("picks lastReviewed by parsed month-year, not string order", () => {
    // Lexically "Nov 2025" > "Mar 2026" — the parser must not fall for it.
    const model = buildRiskTabModel(profileWith(rows))!;
    expect(model.scorecard.lastReviewed).toBe("Apr 2026");
  });
});

describe("matrix binning", () => {
  it("bins by likelihood x impact and surfaces unplaced rows", () => {
    const rows = [
      risk({ likelihood: "high", impact: "high" }),
      risk({ likelihood: "high", impact: "high", severity: "critical" }),
      risk({ likelihood: "low", impact: "medium" }),
      risk({ likelihood: null, impact: "high" }), // unplaced, never dropped
    ];
    const model = buildRiskTabModel(profileWith(rows))!;
    expect(model.matrix.cells.high.high).toEqual([0, 1]);
    expect(model.matrix.cells.low.medium).toEqual([2]);
    expect(model.matrix.unplacedIdx).toEqual([3]);
  });
});

describe("filter domain", () => {
  it("lists only present values, categories in taxonomy order, severities worst-first", () => {
    const rows = [
      risk({ category: "Governance", severity: "low", likelihood: "low", impact: "low" }),
      risk({ category: "Market", severity: "critical", likelihood: "high", impact: "high" }),
    ];
    const model = buildRiskTabModel(profileWith(rows))!;
    expect(model.filterDomain.categories).toEqual(["Market", "Governance"]);
    expect(model.filterDomain.severities).toEqual(["critical", "low"]);
  });
});

describe("cross-links and driver badges", () => {
  it("resolves linked assets to their coverage segment", () => {
    const coverage = {
      shape: "lending",
      assetStrategy: null,
      assets: [
        { asset: "WETH", roleKind: "both" },
        { asset: "GHO", roleKind: "loan" },
        { asset: "PT-x", roleKind: "other" },
      ],
      oracles: [],
      flaggedAssets: [],
      asOf: null,
    } as unknown as NetworkProfile["assetCoverage"];
    const rows = [
      risk({ likelihood: "high", impact: "high", linkedAssets: ["WETH", "GHO", "PT-x", "NOPE"] }),
    ];
    const model = buildRiskTabModel(profileWith(rows, { assetCoverage: coverage }))!;
    expect(model.assetLinks[0]).toEqual([
      { label: "WETH", seg: "collateral" },
      { label: "GHO", seg: "loan" },
      { label: "PT-x", seg: "instruments" },
    ]);
  });

  it("joins shared drivers across assets and partners, real dependencies first", () => {
    const rows = [
      risk({
        likelihood: "high",
        impact: "high",
        linkedAssets: ["USDC"],
        linkedPartnersUnmatched: ["Immunefi", "Nobody Inc"],
      }),
    ];
    const model = buildRiskTabModel(profileWith(rows))!;
    const badges = model.sharedDriverBadges[0];
    expect(badges.map((b) => b.label)).toEqual(["USDC", "Immunefi"]);
    expect(badges[0]).toMatchObject({ entityCount: 7, audit: false });
    expect(badges[1]).toMatchObject({ audit: true });
    expect(model.driverEntityTotal).toBe(14);
  });
});

describe("view + incident helpers", () => {
  it("incidentDateRank orders human dates chronologically", () => {
    const { incidentDateRank } = require("@/lib/networks/riskTab");
    const dates = ["18 Apr 2026", "Jun 2022", "Jul 2023", "Nov 2022", "Apr 2026"];
    const sorted = [...dates].sort((a, b) => incidentDateRank(a)! - incidentDateRank(b)!);
    expect(sorted).toEqual(["Jun 2022", "Nov 2022", "Jul 2023", "Apr 2026", "18 Apr 2026"]);
    expect(incidentDateRank("sometime later")).toBeNull();
  });

  it("resolveRiskView defaults to list", () => {
    expect(resolveRiskView(undefined)).toBe("list");
    expect(resolveRiskView("garbage")).toBe("list");
    expect(resolveRiskView("matrix")).toBe("matrix");
  });

  it("incidentCategory maps documented event types only", () => {
    expect(incidentCategory("exploit")).toBe("Technological");
    expect(incidentCategory("Bad debt")).toBe("Counterparty");
    expect(incidentCategory("depeg")).toBe("Market");
    expect(incidentCategory("something else")).toBeNull();
    expect(incidentCategory(null)).toBeNull();
  });
});
