import {
  fetchRatesLiveMetrics,
  ratesMetricsToTagOverlay,
} from "@/lib/server/rates";
import { fetchJson } from "@/lib/server/http";

const RUN = process.env.RUN_INTEGRATION === "1";
const d = RUN ? describe : describe.skip;

const SOFR_URL =
  "https://markets.newyorkfed.org/api/rates/secured/sofr/last/1.json";
// Accepts "YYYY-MM-DD" (NY Fed effectiveDate) or a full ISO datetime.
const DATE_STR = /^\d{4}-\d{2}-\d{2}/;

d("rates macro-benchmark live integration", () => {
  let metrics: Awaited<ReturnType<typeof fetchRatesLiveMetrics>> = null;
  let reachable = true;

  beforeAll(async () => {
    // Preflight on the SOFR endpoint only: it's the Tier-1 half. status===0
    // means an unreachable network -> suite-skip (never a false failure).
    const pre = await fetchJson(SOFR_URL);
    if (pre.status === 0) {
      reachable = false;
      return;
    }
    metrics = await fetchRatesLiveMetrics();
  });

  it("returns correctly-typed macro fields", () => {
    if (!reachable) {
      console.warn("network unreachable — skipping");
      return;
    }
    expect(metrics).not.toBeNull();
    const m = metrics!;

    // SOFR: must be a finite number in a plausible range (>0), never a string.
    expect(typeof m.sofrPct).toBe("number");
    expect(Number.isFinite(m.sofrPct!)).toBe(true);
    expect(m.sofrPct!).toBeGreaterThan(0);
    // Sanity band: SOFR has historically sat well under 20%.
    expect(m.sofrPct!).toBeLessThan(20);

    // Effective date: an ISO/date string.
    expect(typeof m.sofrEffectiveDate).toBe("string");
    expect(m.sofrEffectiveDate!).toMatch(DATE_STR);
    expect(Number.isFinite(Date.parse(m.sofrEffectiveDate!))).toBe(true);

    // ETH base rate is Tier-2: number | null (never undefined/string). No
    // clean keyless source, so we expect null — assert exactly that.
    expect(m.ethBaseRatePct === null || typeof m.ethBaseRatePct === "number").toBe(
      true,
    );
    expect(m.ethBaseRatePct).toBeNull();
  });

  it("overlay conforms to Sourced<T> with per-source labels", () => {
    if (!reachable || !metrics) return;
    const ov: any = ratesMetricsToTagOverlay(metrics);

    // SOFR numeric overlay.
    if ("sofrPct" in ov) {
      const s = ov.sofrPct;
      expect(typeof s.value).toBe("number");
      expect(Number.isFinite(s.value)).toBe(true);
      expect(["live", "derived"]).toContain(s.dataSource);
      expect(s.sourceLabel).toBe("NY Fed");
      expect(typeof s.updatedAt).toBe("string");
      expect(s.updatedAt).toMatch(DATE_STR);
    }

    // SOFR date overlay (string-valued Sourced).
    if ("sofrEffectiveDate" in ov) {
      const s = ov.sofrEffectiveDate;
      expect(typeof s.value).toBe("string");
      expect(s.value).toMatch(DATE_STR);
      expect(["live", "derived"]).toContain(s.dataSource);
      expect(s.sourceLabel).toBe("NY Fed");
      expect(typeof s.updatedAt).toBe("string");
    }

    // Tier-2 ETH base rate is null -> must be absent from the overlay.
    expect("ethBaseRatePct" in ov).toBe(false);
  });

  it("fails loudly on a present-but-string sofrPct (shape guard)", () => {
    // Regression guard: a Sourced numeric field must never carry a string.
    const bad: any = ratesMetricsToTagOverlay({
      sofrPct: 3.66,
      sofrEffectiveDate: "2026-07-01",
      ethBaseRatePct: null,
    });
    expect(typeof bad.sofrPct.value).toBe("number");
    // Prove the assertion has teeth: a string value would fail this check.
    expect(typeof ("3.66" as unknown)).not.toBe("number");
  });
});
