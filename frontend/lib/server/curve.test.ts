import { fetchCurveLiveMetrics, curveMetricsToTagOverlay } from "@/lib/server/curve";
import { fetchJson } from "@/lib/server/http";

const RUN = process.env.RUN_INTEGRATION === "1";
const d = RUN ? describe : describe.skip;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T/;

d("curve live integration", () => {
  let metrics: Awaited<ReturnType<typeof fetchCurveLiveMetrics>> = null;
  let reachable = true;

  beforeAll(async () => {
    const pre = await fetchJson("https://api.curve.finance/api/getAllGauges");
    if (pre.status === 0) {
      reachable = false;
      return;
    }
    metrics = await fetchCurveLiveMetrics();
  });

  it("returns correctly-typed fields", () => {
    if (!reachable) {
      console.warn("network unreachable — skipping");
      return;
    }
    expect(metrics).not.toBeNull();
    const m = metrics!;

    // Canonical CRV mint rate: a finite, strictly-positive number of CRV/sec.
    // Curve mainnet currently emits ~3.66 CRV/s; emissions only ever decay, so a
    // generous 0<rate<10 band is a stable plausibility check.
    expect(typeof m.crvInflationPerSec).toBe("number");
    expect(Number.isFinite(m.crvInflationPerSec!)).toBe(true);
    expect(m.crvInflationPerSec!).toBeGreaterThan(0);
    expect(m.crvInflationPerSec!).toBeLessThan(10);

    // Derived weekly/annual emissions: finite, positive, and internally
    // consistent with the per-second rate (exact multiples).
    expect(Number.isFinite(m.crvEmissionsWeekly!)).toBe(true);
    expect(m.crvEmissionsWeekly!).toBeGreaterThan(0);
    expect(m.crvEmissionsWeekly!).toBeCloseTo(m.crvInflationPerSec! * 604_800, 3);

    expect(Number.isFinite(m.crvEmissionsAnnual!)).toBe(true);
    expect(m.crvEmissionsAnnual!).toBeGreaterThan(0);
    expect(m.crvEmissionsAnnual!).toBeCloseTo(m.crvInflationPerSec! * 31_536_000, 0);

    // Active gauge count: a positive integer.
    expect(typeof m.activeGaugeCount).toBe("number");
    expect(Number.isInteger(m.activeGaugeCount!)).toBe(true);
    expect(m.activeGaugeCount!).toBeGreaterThan(0);

    // Total relative weight: nullable; when present a finite positive fraction.
    // Normalized gauge weights sum to ~1.0 (100%); allow slack for rounding.
    expect(
      m.totalGaugeRelativeWeight === null ||
        typeof m.totalGaugeRelativeWeight === "number",
    ).toBe(true);
    if (m.totalGaugeRelativeWeight !== null) {
      expect(Number.isFinite(m.totalGaugeRelativeWeight)).toBe(true);
      expect(m.totalGaugeRelativeWeight).toBeGreaterThan(0);
      expect(m.totalGaugeRelativeWeight).toBeLessThan(2);
    }
  });

  it("overlay conforms to Sourced<T>", () => {
    if (!reachable || !metrics) return;
    const ov: any = curveMetricsToTagOverlay(metrics);
    expect(ov.governance).toBeDefined();
    const block = ov.governance;

    const numericKeys = [
      "crvInflationPerSec",
      "crvEmissionsWeekly",
      "crvEmissionsAnnual",
      "activeGaugeCount",
      "totalGaugeRelativeWeight",
    ];
    for (const key of numericKeys) {
      if (!(key in block)) continue;
      const s = block[key];
      expect(typeof s.value).toBe("number");
      expect(Number.isFinite(s.value)).toBe(true);
      expect(["live", "derived"]).toContain(s.dataSource);
      expect(s.sourceLabel).toBe("Curve API");
      expect(typeof s.updatedAt).toBe("string");
      expect(s.updatedAt).toMatch(ISO_DATE);
    }

    // The headline inflation rate must appear in the overlay when returned,
    // carried through unchanged and tagged "live".
    if (metrics.crvInflationPerSec != null) {
      expect(block.crvInflationPerSec).toBeDefined();
      expect(block.crvInflationPerSec.value).toBe(metrics.crvInflationPerSec);
      expect(block.crvInflationPerSec.dataSource).toBe("live");
    }
    // Derived emissions must be tagged "derived".
    if (metrics.crvEmissionsWeekly != null) {
      expect(block.crvEmissionsWeekly.dataSource).toBe("derived");
    }
  });
});
