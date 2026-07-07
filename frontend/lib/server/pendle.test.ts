import { fetchPendleLiveMetrics, pendleMetricsToTagOverlay } from "@/lib/server/pendle";
import { fetchJson } from "@/lib/server/http";

const RUN = process.env.RUN_INTEGRATION === "1";
const d = RUN ? describe : describe.skip;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T/;

d("pendle live integration", () => {
  let metrics: Awaited<ReturnType<typeof fetchPendleLiveMetrics>> = null;
  let reachable = true;

  beforeAll(async () => {
    const pre = await fetchJson(
      "https://api-v2.pendle.finance/core/v1/1/markets/active",
    );
    if (pre.status === 0) {
      reachable = false;
      return;
    }
    metrics = await fetchPendleLiveMetrics();
  });

  it("returns correctly-typed fields", () => {
    if (!reachable) {
      console.warn("network unreachable — skipping");
      return;
    }
    expect(metrics).not.toBeNull();
    const m = metrics!;

    // Aggregate numerics: finite numbers (never NaN/string), TVL/count positive.
    expect(typeof m.totalTvlUsd).toBe("number");
    expect(Number.isFinite(m.totalTvlUsd!)).toBe(true);
    expect(m.totalTvlUsd!).toBeGreaterThan(0);

    expect(typeof m.marketCount).toBe("number");
    expect(Number.isFinite(m.marketCount!)).toBe(true);
    expect(m.marketCount!).toBeGreaterThan(0);

    expect(typeof m.avgImpliedApyPct).toBe("number");
    expect(Number.isFinite(m.avgImpliedApyPct!)).toBe(true);

    expect(typeof m.avgUnderlyingApyPct).toBe("number");
    expect(Number.isFinite(m.avgUnderlyingApyPct!)).toBe(true);

    expect(typeof m.avgDaysToMaturity).toBe("number");
    expect(Number.isFinite(m.avgDaysToMaturity!)).toBe(true);
    expect(m.avgDaysToMaturity!).toBeGreaterThan(0);

    // Maturity ISO strings.
    expect(typeof m.nearestMaturity).toBe("string");
    expect(m.nearestMaturity!).toMatch(ISO_DATE);
    expect(typeof m.furthestMaturity).toBe("string");
    expect(m.furthestMaturity!).toMatch(ISO_DATE);
    expect(Date.parse(m.nearestMaturity!)).toBeLessThanOrEqual(
      Date.parse(m.furthestMaturity!),
    );

    // Tier-2 fields: nullable, must be `number | null` (never undefined/string).
    expect(
      m.representativePtPriceUsd === null ||
        typeof m.representativePtPriceUsd === "number",
    ).toBe(true);
    expect(
      m.representativeYtPriceUsd === null ||
        typeof m.representativeYtPriceUsd === "number",
    ).toBe(true);
  });

  it("overlay conforms to Sourced<T>", () => {
    if (!reachable || !metrics) return;
    const ov: any = pendleMetricsToTagOverlay(metrics);
    expect(ov.fixedIncome).toBeDefined();
    const block = ov.fixedIncome;

    // Sourced<number> fields.
    const numericKeys = ["tvlUsd", "fixedApyPct", "impliedYieldPct"];
    for (const key of numericKeys) {
      if (!(key in block)) continue;
      const s = block[key];
      expect(typeof s.value).toBe("number");
      expect(Number.isFinite(s.value)).toBe(true);
      expect(["live", "derived"]).toContain(s.dataSource);
      expect(typeof s.updatedAt).toBe("string");
      expect(s.updatedAt).toMatch(ISO_DATE);
    }

    // `markets` is a plain number per FixedIncomeMetrics (not Sourced).
    if ("markets" in block) {
      expect(typeof block.markets).toBe("number");
      expect(Number.isFinite(block.markets)).toBe(true);
      expect(block.markets).toBeGreaterThan(0);
    }

    // `maturities` is a plain string[] of ISO dates (not Sourced).
    if ("maturities" in block) {
      expect(Array.isArray(block.maturities)).toBe(true);
      for (const s of block.maturities) {
        expect(typeof s).toBe("string");
        expect(s).toMatch(ISO_DATE);
      }
    }
  });
});
