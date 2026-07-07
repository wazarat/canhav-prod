import {
  fetchBeaconchainLiveMetrics,
  beaconchainMetricsToTagOverlay,
} from "@/lib/server/beaconchain";
import { fetchJson } from "@/lib/server/http";

const RUN = process.env.RUN_INTEGRATION === "1";
const d = RUN ? describe : describe.skip;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T/;

d("beaconchain (Ethereum consensus, keyless) live integration", () => {
  let metrics: Awaited<ReturnType<typeof fetchBeaconchainLiveMetrics>> = null;
  let reachable = true;

  beforeAll(async () => {
    // Preflight the primary keyless upstream. status===0 means the network is
    // unreachable from this runner → suite-skip, never a false red.
    const pre = await fetchJson("https://ultrasound.money/api/v2/fees/effective-balance-sum");
    if (pre.status === 0) {
      reachable = false;
      return;
    }
    metrics = await fetchBeaconchainLiveMetrics();
  });

  it("returns correctly-typed consensus fields", () => {
    if (!reachable) {
      console.warn("network unreachable — skipping");
      return;
    }
    expect(metrics).not.toBeNull();
    const m = metrics!;

    // Total ETH staked (effective balance): finite, positive, and LARGE.
    // Mainnet staked ETH is tens of millions; assert > 10M as a floor.
    expect(typeof m.totalEthStaked).toBe("number");
    expect(Number.isFinite(m.totalEthStaked!)).toBe(true);
    expect(m.totalEthStaked!).toBeGreaterThan(10_000_000);
    expect(m.totalEthStaked!).toBeLessThan(200_000_000);

    // Total ETH staked (actual balance): same plausible band, nullable.
    expect(m.totalEthStakedActual === null || typeof m.totalEthStakedActual === "number").toBe(
      true,
    );
    if (m.totalEthStakedActual !== null) {
      expect(Number.isFinite(m.totalEthStakedActual)).toBe(true);
      expect(m.totalEthStakedActual).toBeGreaterThan(10_000_000);
      expect(m.totalEthStakedActual).toBeLessThan(200_000_000);
    }

    // Staking APR: a finite percent in a plausible low-single-digit band, nullable.
    expect(m.stakingAprPct === null || typeof m.stakingAprPct === "number").toBe(true);
    if (m.stakingAprPct !== null) {
      expect(Number.isFinite(m.stakingAprPct)).toBe(true);
      expect(m.stakingAprPct).toBeGreaterThan(0);
      expect(m.stakingAprPct).toBeLessThan(20);
    }

    // Finalized epoch: a positive integer, nullable.
    expect(m.finalizedEpoch === null || typeof m.finalizedEpoch === "number").toBe(true);
    if (m.finalizedEpoch !== null) {
      expect(Number.isFinite(m.finalizedEpoch)).toBe(true);
      expect(Number.isInteger(m.finalizedEpoch)).toBe(true);
      expect(m.finalizedEpoch).toBeGreaterThan(0);
    }

    // Queue lengths: non-negative integers, nullable.
    for (const q of [m.withdrawalQueueLength, m.consolidationQueueLength]) {
      expect(q === null || typeof q === "number").toBe(true);
      if (q !== null) {
        expect(Number.isInteger(q)).toBe(true);
        expect(q).toBeGreaterThanOrEqual(0);
      }
    }

    // Tier-2 fields are intentionally null (unavailable keyless & lightweight).
    expect(m.activeValidatorCount).toBeNull();
    expect(m.participationRate).toBeNull();
    expect(m.slashingEventCount).toBeNull();
    expect(m.activationQueueLength).toBeNull();
  });

  it("overlay conforms to Sourced<T>", () => {
    if (!reachable || !metrics) return;
    const ov: any = beaconchainMetricsToTagOverlay(metrics);

    const numericKeys = ["totalEthStaked", "totalEthStakedActual", "stakingAprPct", "finalizedEpoch"];
    for (const key of numericKeys) {
      if (!(key in ov)) continue;
      const s = ov[key];
      expect(typeof s.value).toBe("number");
      expect(Number.isFinite(s.value)).toBe(true);
      expect(["live", "derived"]).toContain(s.dataSource);
      expect(s.sourceLabel).toBe("beaconcha.in");
      expect(typeof s.updatedAt).toBe("string");
      expect(s.updatedAt).toMatch(ISO_DATE);
    }

    // Headline total staked ETH must appear in the overlay when the client had it.
    if (metrics.totalEthStaked != null) {
      expect(ov.totalEthStaked).toBeDefined();
      expect(ov.totalEthStaked.value).toBe(metrics.totalEthStaked);
    }

    // withdrawalQueue, when present, is a human-readable string (not Sourced).
    if (metrics.withdrawalQueueLength != null) {
      expect(typeof ov.withdrawalQueue).toBe("string");
      expect(ov.withdrawalQueue.length).toBeGreaterThan(0);
    }
  });
});
