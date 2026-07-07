/**
 * Nexus Mutual live-data integration test (guarded).
 *
 * Run: RUN_INTEGRATION=1 npx jest lib/server/nexus.test.ts
 *
 * Guarded by RUN_INTEGRATION (describe.skip when unset). A preflight in beforeAll
 * probes the real endpoint; if the network is unreachable (status 0) the whole
 * suite skips its assertions rather than reporting false failures. Every consumed
 * field is asserted for FORM (finite numbers, correct types, Sourced<T> shape) so
 * a shape regression fails loudly.
 */
import { fetchJson } from "@/lib/server/http";
import { fetchNexusLiveMetrics, nexusMetricsToTagOverlay } from "@/lib/server/nexus";
import type { NexusLiveMetrics } from "@/lib/server/nexus";

const RUN = process.env.RUN_INTEGRATION === "1";
const d = RUN ? describe : describe.skip;

d("Nexus Mutual live client (integration)", () => {
  let reachable = false;
  let metrics: NexusLiveMetrics | null = null;

  beforeAll(async () => {
    const pre = await fetchJson("https://api.nexusmutual.io/v2/capacity");
    // status===0 => network error / unreachable. Skip assertions, don't fail.
    reachable = pre.status !== 0;
    if (reachable) {
      metrics = await fetchNexusLiveMetrics();
    }
  });

  test("fetchNexusLiveMetrics returns a metrics object", () => {
    if (!reachable) return;
    expect(metrics).not.toBeNull();
    expect(typeof metrics).toBe("object");
  });

  test("availableCapacityUsd is a positive finite number or null", () => {
    if (!reachable || !metrics) return;
    const v = metrics.availableCapacityUsd;
    if (v !== null) {
      expect(typeof v).toBe("number");
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
  });

  test("allocatedNxm is a finite number or null", () => {
    if (!reachable || !metrics) return;
    const v = metrics.allocatedNxm;
    if (v !== null) {
      expect(typeof v).toBe("number");
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  test("activeCoverUsd is null without a price, finite when priced", async () => {
    if (!reachable || !metrics) return;
    // No price supplied by the default fetch -> must be null.
    expect(metrics.activeCoverUsd).toBeNull();

    const priced = await fetchNexusLiveMetrics(undefined, 100);
    if (priced && priced.allocatedNxm !== null) {
      expect(typeof priced.activeCoverUsd).toBe("number");
      expect(Number.isFinite(priced.activeCoverUsd as number)).toBe(true);
    }
  });

  test("productCount / activeProductCount are non-negative integers or null", () => {
    if (!reachable || !metrics) return;
    for (const v of [metrics.productCount, metrics.activeProductCount]) {
      if (v !== null) {
        expect(typeof v).toBe("number");
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
      }
    }
    if (metrics.productCount !== null && metrics.activeProductCount !== null) {
      expect(metrics.activeProductCount).toBeLessThanOrEqual(metrics.productCount);
    }
  });

  test("overlay conforms to Sourced<T> under the underwriting block", () => {
    if (!reachable || !metrics) return;
    const overlay = nexusMetricsToTagOverlay(metrics);
    expect(overlay).toHaveProperty("underwriting");
    const uw = overlay.underwriting as Record<string, unknown>;

    for (const key of Object.keys(uw)) {
      const s = uw[key] as {
        value: unknown;
        dataSource: unknown;
        sourceLabel: unknown;
        updatedAt: unknown;
      };
      expect(typeof s.value).toBe("number");
      expect(Number.isFinite(s.value as number)).toBe(true);
      expect(s.dataSource).toBe("live");
      expect(s.sourceLabel).toBe("Nexus Mutual API");
      expect(typeof s.updatedAt).toBe("string");
      // ISO 8601 (nowIso trims millis): e.g. 2026-07-03T12:34:56Z
      expect(s.updatedAt as string).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    }
  });
});
