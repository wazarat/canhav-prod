/**
 * Research Chat Phase 1 tool tests. Hermetic: the data/store layer is mocked
 * so these verify the executor logic the chat loop actually runs — ranking,
 * caps, tag filtering, and (critically) that every numeric output carries its
 * source and as-of provenance.
 */

import type { NetworkProfile } from "@/lib/types";

const mockNetworks: Partial<NetworkProfile>[] = [
  {
    slug: "aave",
    name: "Aave",
    sector: "Credit",
    tags: ["Lending"],
    currentScale: {
      tvlUsd: 20_000_000_000,
      users: null,
      aprPct: null,
      targetAprPct: null,
      marketCapUsd: null,
      loanPipelineUsd: null,
      partnerships: null,
    },
    creditTagMetrics: {
      lending: {
        totalSuppliedUsd: { value: 20_000_000_000, dataSource: "live", sourceLabel: "DeFi Llama", updatedAt: "2026-07-20" },
        supplyApyPct: { value: 4.2, dataSource: "live", sourceLabel: "DeFi Llama", updatedAt: "2026-07-20" },
        utilizationPct: { value: 71, dataSource: "derived", updatedAt: "2026-07-20" },
      },
    },
    typedRisks: [
      {
        name: "Oracle failure",
        category: "Oracle",
        severity: "high",
        likelihood: "low",
        impact: "high",
        description: "Bad price feed triggers wrongful liquidations.",
        mitigation: "Chainlink feeds with fallbacks.",
        monitoringSignal: "Feed deviation alerts.",
        asOf: "Apr 2026",
        sourceLabel: "Aave docs",
        sourceUrl: "https://docs.aave.com",
      },
      { category: "Governance", severity: "low", description: "Slow parameter updates." },
    ],
    riskPosture: "Conservative, battle-tested money market.",
    partnerships: Array.from({ length: 25 }, (_, i) => ({
      name: `Partner ${i + 1}`,
      date: "2026-01-01",
      amountLabel: i === 0 ? "$10m" : null,
      description: "Integration.",
      slug: i === 0 ? "gearbox" : null,
    })),
    competitors: [
      { name: "Morpho", slug: "morpho", rank: 2, positioning: "p", similarities: "s", differences: "d" },
      { name: "Compound", slug: "compound", rank: 1, positioning: "p", similarities: "s", differences: "d" },
    ],
    assetCoverage: {
      shape: "lending",
      assetStrategy: "Blue-chip collateral only.",
      assets: [
        {
          asset: "USDC",
          role: "collateral and loan",
          roleKind: "both",
          chain: "Ethereum",
          maxLtvPct: 77,
          maxLtvText: null,
          liqThresholdPct: 80,
          liqThresholdText: null,
          liqBonusPct: 5,
          liqBonusText: null,
          supplyCapValue: 3_000_000_000,
          supplyCapDisplay: "3B",
          borrowCapValue: null,
          borrowCapDisplay: null,
          borrowingDisabled: false,
          ltvWithdrawn: false,
          isolationEmode: null,
          underlyingYieldSource: null,
          maturityOrTerm: null,
          fixedImpliedApy: null,
          collateralOrCapParameters: null,
          oracle: "Chainlink",
          notes: null,
          sources: [{ label: "Aave params", url: "https://example.com" }],
        },
        {
          asset: "WETH",
          role: "collateral",
          roleKind: "collateral",
          chain: "Ethereum",
          maxLtvPct: 80,
          maxLtvText: null,
          liqThresholdPct: 82,
          liqThresholdText: null,
          liqBonusPct: 5,
          liqBonusText: null,
          supplyCapValue: null,
          supplyCapDisplay: null,
          borrowCapValue: 1,
          borrowCapDisplay: "1",
          borrowingDisabled: true,
          ltvWithdrawn: false,
          isolationEmode: null,
          underlyingYieldSource: null,
          maturityOrTerm: null,
          fixedImpliedApy: null,
          collateralOrCapParameters: null,
          oracle: "Chainlink",
          notes: null,
          sources: [],
        },
      ],
      oracles: [{ provider: "Chainlink", assetsCovered: ["USDC", "WETH"], feedType: null, sources: [] }],
      flaggedAssets: [{ asset: "renFIL", flag: "frozen", reason: "Bridge wind-down.", sources: [] }],
      asOf: "2026-04-01",
    },
  },
  {
    slug: "pendle",
    name: "Pendle",
    sector: "Credit",
    tags: ["Fixed Income"],
    currentScale: {
      tvlUsd: 4_000_000_000,
      users: null,
      aprPct: null,
      targetAprPct: null,
      marketCapUsd: null,
      loanPipelineUsd: null,
      partnerships: null,
    },
  },
  {
    slug: "gearbox",
    name: "Gearbox",
    sector: "Credit",
    tags: ["Leveraged Yield"],
    currentScale: {
      tvlUsd: 300_000_000,
      users: null,
      aprPct: null,
      targetAprPct: null,
      marketCapUsd: null,
      loanPipelineUsd: null,
      partnerships: null,
    },
  },
];

const mockStablecoin = {
  slug: "usdc",
  name: "USD Coin",
};

const pegPoints = [
  { date: "2026-07-10", price: 1.0 },
  { date: "2026-07-14", price: 0.999 },
  { date: "2026-07-17", price: 1.001 },
  { date: "2026-07-20", price: 0.998 },
];

jest.mock("@/lib/data", () => ({
  getApprovedNetworks: jest.fn(async () => mockNetworks),
  getApprovedNetworkBySlug: jest.fn(async (slug: string) =>
    mockNetworks.find((n) => n.slug === slug) ?? null,
  ),
  getApprovedStablecoinBySlug: jest.fn(async (slug: string) =>
    slug === "usdc" ? mockStablecoin : null,
  ),
  getApprovedRwaBySlug: jest.fn(async () => null),
  getApprovedTokenBySlug: jest.fn(async () => null),
  getApprovedStablecoins: jest.fn(async () => []),
  getApprovedTokens: jest.fn(async () => []),
  getApprovedRwas: jest.fn(async () => []),
}));

jest.mock("@/lib/server/series", () => ({
  resolvePegSeries: jest.fn(async () => ({ points: pegPoints, source: "stored-history" })),
  resolveTvlSeries: jest.fn(async () => ({ points: [], source: null })),
}));

// The rest of the tool module's server dependencies are irrelevant to these
// read-only research tools; stub them so the import graph stays hermetic.
jest.mock("@/lib/agent/memory", () => ({}));
jest.mock("@/lib/agent/customTools", () => ({ listCustomTools: jest.fn(async () => []) }));
jest.mock("@/lib/agent/dunePublish", () => ({}));
jest.mock("@/lib/agent/verdictRunner", () => ({}));
jest.mock("@/lib/agent/trade/propose", () => ({}));
jest.mock("@/lib/agent/knowledge", () => ({}));
jest.mock("@/lib/agent/entity-binding", () => ({}));
jest.mock("@/lib/agent/skills", () => ({}));
jest.mock("@/lib/server/aave", () => ({}));
jest.mock("@/lib/server/alchemy", () => ({}));
jest.mock("@/lib/server/dune", () => ({ hasDuneWrite: () => false }));

import { runTool, TOOL_CATALOG } from "@/lib/agent/tools";

describe("research_compare", () => {
  it("ranks sector members by TVL and carries sourced metrics", async () => {
    const out = await runTool("agent-1", "research_compare", { sector: "Credit" });
    expect(out.ok).toBe(true);
    const rows = out.result?.rows as Array<Record<string, unknown>>;
    expect(rows.map((r) => r.slug)).toEqual(["aave", "pendle", "gearbox"]);
    const aave = rows[0] as {
      creditMetrics: { lending: { supplyApyPct: { value: number; source: string; asOf: string } } };
      riskCount: number;
      highSeverityRiskCount: number;
      partnershipCount: number;
      flaggedAssetCount: number;
    };
    expect(aave.creditMetrics.lending.supplyApyPct).toEqual({
      value: 4.2,
      source: "DeFi Llama",
      asOf: "2026-07-20",
    });
    expect(aave.riskCount).toBe(2);
    expect(aave.highSeverityRiskCount).toBe(1);
    expect(aave.partnershipCount).toBe(25);
    expect(aave.flaggedAssetCount).toBe(1);
  });

  it("filters by tag and caps rows", async () => {
    const out = await runTool("agent-1", "research_compare", {
      sector: "Credit",
      tag: "Lending",
      limit: 1,
    });
    const rows = out.result?.rows as Array<{ slug: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].slug).toBe("aave");
  });

  it("reports available sectors when nothing matches", async () => {
    const out = await runTool("agent-1", "research_compare", { sector: "Nonsense" });
    expect(out.result?.found).toBe(false);
    expect(out.summary).toContain("Credit");
  });
});

describe("research_getRisks", () => {
  it("returns typed risks with severity, mitigation and provenance", async () => {
    const out = await runTool("agent-1", "research_getRisks", { slug: "aave" });
    const typed = out.result?.typedRisks as Array<Record<string, unknown>>;
    expect(typed).toHaveLength(2);
    expect(typed[0]).toMatchObject({
      name: "Oracle failure",
      severity: "high",
      mitigation: "Chainlink feeds with fallbacks.",
      asOf: "Apr 2026",
      source: "Aave docs",
    });
    // Legacy prose risks stay out when the typed dataset exists.
    expect(out.result?.legacyRisks).toEqual([]);
    expect(out.result?.riskPosture).toContain("Conservative");
  });
});

describe("research_getPartnerships", () => {
  it("caps rows at the default and reports the true total", async () => {
    const out = await runTool("agent-1", "research_getPartnerships", { slug: "aave" });
    const rows = out.result?.partnerships as unknown[];
    expect(rows).toHaveLength(20);
    expect(out.result?.totalCount).toBe(25);
    expect((rows[0] as { slug: string | null }).slug).toBe("gearbox");
  });
});

describe("research_getCompetitors", () => {
  it("sorts by rank ascending", async () => {
    const out = await runTool("agent-1", "research_getCompetitors", { slug: "aave" });
    const rows = out.result?.competitors as Array<{ name: string; rank: number }>;
    expect(rows.map((r) => r.name)).toEqual(["Compound", "Morpho"]);
  });
});

describe("research_getAssetCoverage", () => {
  it("returns coverage rows with LTV, flags and asOf", async () => {
    const out = await runTool("agent-1", "research_getAssetCoverage", { slug: "aave" });
    expect(out.result?.asOf).toBe("2026-04-01");
    const assets = out.result?.assets as Array<Record<string, unknown>>;
    expect(assets).toHaveLength(2);
    expect(assets[0]).toMatchObject({ asset: "USDC", maxLtvPct: 77, oracle: "Chainlink" });
    // Borrow-cap sentinel 1 must read as disabled, never as a cap of one.
    expect(assets[1].borrowCap).toBe("borrowing disabled");
    const flagged = out.result?.flaggedAssets as Array<{ asset: string }>;
    expect(flagged[0].asset).toBe("renFIL");
  });

  it("filters by asset substring", async () => {
    const out = await runTool("agent-1", "research_getAssetCoverage", {
      slug: "aave",
      asset: "weth",
    });
    const assets = out.result?.assets as Array<{ asset: string }>;
    expect(assets.map((a) => a.asset)).toEqual(["WETH"]);
  });
});

describe("research_whatChanged", () => {
  it("computes the windowed delta with source and asOf", async () => {
    const out = await runTool("agent-1", "research_whatChanged", {
      slug: "usdc",
      metric: "peg",
      days: 7,
    });
    expect(out.result?.found).toBe(true);
    expect(out.result?.source).toBe("stored-history");
    expect(out.result?.asOf).toBe("2026-07-20");
    const start = out.result?.start as { date: string; value: number };
    const end = out.result?.end as { date: string; value: number };
    expect(start.date).toBe("2026-07-14");
    expect(end.value).toBe(0.998);
    expect(out.result?.min).toBe(0.998);
    expect(out.result?.max).toBe(1.001);
  });

  it("fails soft on unknown slugs", async () => {
    const out = await runTool("agent-1", "research_whatChanged", {
      slug: "nope",
      metric: "peg",
    });
    expect(out.result?.found).toBe(false);
  });
});

describe("tool catalog", () => {
  it("lists every Phase 1 research tool", () => {
    const names = TOOL_CATALOG.map((t) => t.name);
    for (const n of [
      "research_compare",
      "research_getRisks",
      "research_getPartnerships",
      "research_getCompetitors",
      "research_getAssetCoverage",
      "research_whatChanged",
    ]) {
      expect(names).toContain(n);
    }
  });
});
