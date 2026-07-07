import { fetchLidoLiveMetrics, lidoMetricsToTagOverlay } from "@/lib/server/lido";
import { fetchJson } from "@/lib/server/http";

const RUN = process.env.RUN_INTEGRATION === "1";
const d = RUN ? describe : describe.skip;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T/;

d("lido live integration", () => {
  let metrics: Awaited<ReturnType<typeof fetchLidoLiveMetrics>> = null;
  let reachable = true;

  beforeAll(async () => {
    const pre = await fetchJson(
      "https://eth-api.lido.fi/v1/protocol/steth/apr/last",
    );
    if (pre.status === 0) {
      reachable = false;
      return;
    }
    metrics = await fetchLidoLiveMetrics();
  });

  it("returns correctly-typed fields", () => {
    if (!reachable) {
      console.warn("network unreachable — skipping");
      return;
    }
    expect(metrics).not.toBeNull();
    const m = metrics!;

    // Headline LS3 APR: a finite number already expressed as a percent. stETH
    // consensus+execution APR realistically sits in the low single digits; we
    // assert a generous 0<apr<20 band (finite, strictly positive, plausible).
    expect(typeof m.netStakingAprPct).toBe("number");
    expect(Number.isFinite(m.netStakingAprPct!)).toBe(true);
    expect(m.netStakingAprPct!).toBeGreaterThan(0);
    expect(m.netStakingAprPct!).toBeLessThan(20);

    // Optional SMA APR: nullable, but when present same plausible percent band.
    expect(m.smaAprPct === null || typeof m.smaAprPct === "number").toBe(true);
    if (m.smaAprPct !== null) {
      expect(Number.isFinite(m.smaAprPct)).toBe(true);
      expect(m.smaAprPct).toBeGreaterThan(0);
      expect(m.smaAprPct).toBeLessThan(20);
    }

    // Optional stats: total pooled ETH (positive), market cap (positive), holders.
    expect(m.totalPooledEth === null || typeof m.totalPooledEth === "number").toBe(true);
    if (m.totalPooledEth !== null) {
      expect(Number.isFinite(m.totalPooledEth)).toBe(true);
      expect(m.totalPooledEth).toBeGreaterThan(0);
    }
    expect(
      m.stEthMarketCapUsd === null || typeof m.stEthMarketCapUsd === "number",
    ).toBe(true);
    if (m.stEthMarketCapUsd !== null) {
      expect(Number.isFinite(m.stEthMarketCapUsd)).toBe(true);
      expect(m.stEthMarketCapUsd).toBeGreaterThan(0);
    }
    expect(m.uniqueHolders === null || typeof m.uniqueHolders === "number").toBe(true);
  });

  it("overlay conforms to Sourced<T>", () => {
    if (!reachable || !metrics) return;
    const ov: any = lidoMetricsToTagOverlay(metrics);
    expect(ov.liquidStaking).toBeDefined();
    const block = ov.liquidStaking;

    const numericKeys = ["stakingAprPct", "marketCapUsd"];
    for (const key of numericKeys) {
      if (!(key in block)) continue;
      const s = block[key];
      expect(typeof s.value).toBe("number");
      expect(Number.isFinite(s.value)).toBe(true);
      expect(["live", "derived"]).toContain(s.dataSource);
      expect(s.sourceLabel).toBe("Lido API");
      expect(typeof s.updatedAt).toBe("string");
      expect(s.updatedAt).toMatch(ISO_DATE);
    }

    // The headline APR must be present in the overlay when the client returned it.
    if (metrics.netStakingAprPct != null) {
      expect(block.stakingAprPct).toBeDefined();
      expect(block.stakingAprPct.value).toBe(metrics.netStakingAprPct);
    }
  });
});
