import {
  fetchHyperliquidLiveMetrics,
  hyperliquidMetricsToTagOverlay,
  type HyperliquidLiveMetrics,
} from "@/lib/server/hyperliquid";

/**
 * Integration test — hits the live Hyperliquid `info` endpoint.
 *
 * Guarded by RUN_INTEGRATION (describe.skip when unset) so `npm test` stays
 * green offline. On an unreachable network the fetch fails soft and metrics is
 * null; we detect that in beforeAll and skip the assertions rather than emit a
 * false red. A reachable-but-malformed response fails loudly.
 */
const RUN = !!process.env.RUN_INTEGRATION;
const d = RUN ? describe : describe.skip;

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

d("Hyperliquid live metrics (integration)", () => {
  let metrics: HyperliquidLiveMetrics | null = null;
  let reachable = false;

  beforeAll(async () => {
    metrics = await fetchHyperliquidLiveMetrics();
    reachable = metrics !== null;
    if (!reachable) {
      // eslint-disable-next-line no-console
      console.warn("Hyperliquid unreachable — skipping field-form assertions.");
    }
  });

  it("returns finite, correctly-typed aggregate fields", () => {
    if (!reachable || !metrics) return;

    // marketsCount — positive integer.
    expect(typeof metrics.marketsCount).toBe("number");
    expect(Number.isInteger(metrics.marketsCount)).toBe(true);
    expect(metrics.marketsCount as number).toBeGreaterThan(0);

    // openInterestUsd — finite & > 0.
    expect(typeof metrics.openInterestUsd).toBe("number");
    expect(Number.isFinite(metrics.openInterestUsd as number)).toBe(true);
    expect(metrics.openInterestUsd as number).toBeGreaterThan(0);

    // volume24hUsd — finite & > 0.
    expect(typeof metrics.volume24hUsd).toBe("number");
    expect(Number.isFinite(metrics.volume24hUsd as number)).toBe(true);
    expect(metrics.volume24hUsd as number).toBeGreaterThan(0);

    // fundingRatePct — finite number (may be negative).
    expect(typeof metrics.fundingRatePct).toBe("number");
    expect(Number.isFinite(metrics.fundingRatePct as number)).toBe(true);

    // fundingRateAnnualizedPct — finite, and == fundingRatePct * 24 * 365.
    expect(typeof metrics.fundingRateAnnualizedPct).toBe("number");
    expect(Number.isFinite(metrics.fundingRateAnnualizedPct as number)).toBe(true);
    expect(metrics.fundingRateAnnualizedPct as number).toBeCloseTo(
      (metrics.fundingRatePct as number) * 24 * 365,
      6,
    );

    // Tier-2 per-side OI split — not exposed by the public info endpoint.
    expect(metrics.longOpenInterestUsd).toBeNull();
    expect(metrics.shortOpenInterestUsd).toBeNull();
  });

  it("emits an overlay conforming to Sourced<T>", () => {
    if (!reachable || !metrics) return;

    const overlay = hyperliquidMetricsToTagOverlay(metrics);
    expect(overlay).toHaveProperty("perpDex");
    const perp = overlay.perpDex as Record<string, unknown>;

    const assertSourced = (
      key: string,
      expectedSource: "live" | "derived",
    ) => {
      const s = perp[key] as {
        value: number;
        dataSource: string;
        sourceLabel?: string;
        updatedAt?: string;
      };
      expect(s).toBeDefined();
      expect(typeof s.value).toBe("number");
      expect(Number.isFinite(s.value)).toBe(true);
      expect(s.dataSource).toBe(expectedSource);
      expect(s.sourceLabel).toBe("Hyperliquid API");
      expect(typeof s.updatedAt).toBe("string");
      expect(s.updatedAt as string).toMatch(ISO_RE);
    };

    assertSourced("openInterestUsd", "live");
    assertSourced("volume24hUsd", "live");
    assertSourced("marketsCount", "live");
    assertSourced("fundingRatePct", "live");
    assertSourced("fundingRateAnnualizedPct", "derived");
  });
});
