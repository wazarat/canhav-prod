import { buildSkillFromEntity, buildSkillFromStablecoin } from "@/lib/agent/skills";
import { skillToMarkdown } from "@/lib/agent/skillExport";
import type { NetworkProfile, StablecoinProfile } from "@/lib/types";

jest.mock("@/lib/data", () => ({
  getApprovedNetworks: jest.fn(),
  getApprovedNetworkBySlug: jest.fn(),
  getApprovedRwaBySlug: jest.fn(),
  getApprovedRwas: jest.fn(),
  getApprovedStablecoinBySlug: jest.fn(),
  getApprovedStablecoins: jest.fn(),
  getApprovedTokenBySlug: jest.fn(),
  getApprovedTokens: jest.fn(),
}));

// An em dash attached to words is prose; a standalone "—" is the intentional
// missing-value placeholder glyph (CAN-80 protects those).
const hasProseEmDash = (text: string) =>
  text.split(/\s+/).some((token) => token.includes("—") && token !== "—");

const baseProfile = (extra?: Partial<NetworkProfile>): NetworkProfile =>
  ({
    slug: "testnet",
    name: "Testnet",
    symbol: "",
    tagline: "A test lending network",
    description: "A test lending network for skill derivation.",
    longDescription: null,
    differentiator: null,
    website: null,
    officialDocs: null,
    twitter: null,
    sources: [],
    audits: [],
    components: [],
    risks: [],
    tradFiComparison: [],
    memberCoins: [],
    partnerships: [],
    arbitrumPortalMetadata: {
      isArbitrumNative: false,
      isPubliclyAudited: false,
      chains: [],
      foundedDate: null,
    },
    currentScale: { tvlUsd: null, marketCapUsd: null, users: null, aprPct: null },
    universalMetrics: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...extra,
  }) as unknown as NetworkProfile;

const richProfile = () =>
  baseProfile({
    memberCoins: [
      { name: "Test USD", symbol: "TUSD", slug: "tusd", category: "Stablecoin", role: "debt asset" },
      { name: "Test Gov", symbol: "TGOV", slug: "tgov", category: "Token", role: null },
    ],
    components: [{ name: "Core", description: "The core lending market." }],
    risks: [{ category: "Oracle", description: "Feed staleness on thin markets." }],
    tradFiComparison: [
      {
        product: "Money market fund",
        similarity: "both pool short-term liquidity",
        differences: "collateral is crypto-native and liquidation is automated",
      },
    ],
  } as unknown as Partial<NetworkProfile>);

describe("buildSkillFromEntity", () => {
  it("emits no prose em dashes in any rendered skill string", () => {
    const skill = buildSkillFromEntity(richProfile());
    for (const f of skill.facts) expect(hasProseEmDash(`${f.key} ${f.value}`)).toBe(false);
    for (const s of skill.sections) expect(hasProseEmDash(`${s.heading} ${s.body}`)).toBe(false);
    for (const a of skill.actions) expect(hasProseEmDash(`${a.name} ${a.description}`)).toBe(false);
    for (const g of skill.glossary ?? []) {
      expect(hasProseEmDash(`${g.term} ${g.definition}`)).toBe(false);
    }
    expect(hasProseEmDash(skill.title)).toBe(false);
    expect(hasProseEmDash(skill.summary)).toBe(false);
  });

  it("keeps the standalone placeholder glyph for a missing symbol", () => {
    const skill = buildSkillFromEntity(baseProfile());
    expect(skill.facts.find((f) => f.key === "symbol")?.value).toBe("—");
  });

  it("omits numeric facts entirely when the underlying value is null (never 0)", () => {
    const skill = buildSkillFromEntity(baseProfile());
    const keys = skill.facts.map((f) => f.key);
    for (const absent of ["tvl", "marketCap", "price", "fdv", "marketCapRank", "users", "apr"]) {
      expect(keys).not.toContain(absent);
    }
    for (const f of skill.facts) {
      expect(f.value).not.toBe("0");
      expect(f.value).not.toBe("$0");
    }
  });

  it("renders present numerics compactly and carries the sync timestamp as asOf", () => {
    const skill = buildSkillFromEntity(
      baseProfile({
        currentScale: { tvlUsd: 1_250_000_000, marketCapUsd: null, users: 12_000, aprPct: null },
        universalMetrics: {
          syncedAt: "2026-07-27T06:00:00Z",
          identity: { chains: { value: null }, foundedDate: { value: null } },
          tvl: {
            tvlUsd: { value: null },
            tvlChangePct: { d1: { value: null }, d7: { value: null } },
          },
          market: {
            marketCapUsd: { value: null },
            priceUsd: { value: null },
            priceChangePct: { d1: { value: null }, d7: { value: null }, d30: { value: null } },
            fdvUsd: { value: null },
            marketCapRank: { value: null },
          },
        },
      } as unknown as Partial<NetworkProfile>),
    );
    expect(skill.facts.find((f) => f.key === "tvl")?.value).toBe("$1.25B");
    expect(skill.facts.find((f) => f.key === "universalMetricsSyncedAt")?.value).toBe(
      "2026-07-27T06:00:00Z",
    );
  });

  it("produces markdown whose em dashes are all standalone placeholder glyphs", () => {
    const md = skillToMarkdown(buildSkillFromEntity(richProfile()));
    expect(hasProseEmDash(md)).toBe(false);
  });
});

describe("buildSkillFromStablecoin", () => {
  it("emits no prose em dashes (including the lending-market section)", () => {
    const skill = buildSkillFromStablecoin({
      slug: "tusd",
      name: "Test USD",
      symbol: "TUSD",
      description: "A test stablecoin.",
      pegTarget: "USD",
      subCategory: null,
      pegMechanism: null,
      issuanceMeta: null,
      totalSupply: { value: null },
      chainDistribution: null,
      entitySlug: "testnet",
      lendingMarket: true,
      website: null,
      twitter: null,
      coingecko: null,
      auditUrl: null,
      arbitrumPortalMetadata: { isArbitrumNative: false, chains: [] },
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    } as unknown as StablecoinProfile);
    for (const s of skill.sections) expect(hasProseEmDash(s.body)).toBe(false);
    for (const f of skill.facts) expect(hasProseEmDash(f.value)).toBe(false);
  });
});
