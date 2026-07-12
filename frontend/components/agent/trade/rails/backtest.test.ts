import {
  countCaught,
  eventsForAsset,
  RAIL_BACKTEST_EVENTS,
  runBacktest,
} from "@/components/agent/trade/rails/backtest";
import {
  defaultRailState,
  RAILS,
} from "@/components/agent/trade/rails/railDefs";

function resultFor(results: ReturnType<typeof runBacktest>, id: string) {
  const r = results.find((x) => x.event.id === id);
  if (!r) throw new Error(`missing event ${id}`);
  return r;
}

describe("card-rails backtest engine", () => {
  it("catches all five historical events at factory defaults", () => {
    const results = runBacktest(RAILS, defaultRailState(RAILS), RAIL_BACKTEST_EVENTS);
    expect(countCaught(results)).toEqual({ caught: 5, total: 5 });
  });

  it("depeg guard at 3% suppresses stETH 2022 but never ezETH 2024", () => {
    const state = defaultRailState(RAILS);
    state.lrt_depeg_guard.value = 3;
    const results = runBacktest(RAILS, state, RAIL_BACKTEST_EVENTS);

    expect(resultFor(results, "steth-depeg-2022").fired).toBe(false);
    const ezeth = resultFor(results, "ezeth-depeg-2024");
    expect(ezeth.fired).toBe(true);
    // The 22% observed depeg is past the hard tier: high severity regardless
    // of where the soft threshold sits.
    const depegFire = ezeth.fires.find((f) => f.railId === "lrt_depeg_guard");
    expect(depegFire?.fired).toBe(true);
    expect(depegFire?.severity).toBe("high");
  });

  it("disabling the bad-debt rail suppresses CRV 2022; rsETH 2026 still fires", () => {
    const state = defaultRailState(RAILS);
    state.bad_debt_frozen.enabled = false;
    const results = runBacktest(RAILS, state, RAIL_BACKTEST_EVENTS);

    expect(resultFor(results, "crv-bad-debt-2022").fired).toBe(false);
    // rsETH keeps firing on the depeg guard and issuer health: independent
    // rails are defense in depth.
    expect(resultFor(results, "rseth-kelp-2026").fired).toBe(true);
  });

  it("Aug 2024 unwind survives a 95% utilization threshold via momentum flip, then flips fully suppressed", () => {
    const state = defaultRailState(RAILS);
    state.util_spike.value = 95;
    let results = runBacktest(RAILS, state, RAIL_BACKTEST_EVENTS);
    const partial = resultFor(results, "unwind-2024-08-05");
    expect(partial.fired).toBe(true);
    expect(partial.fires.find((f) => f.railId === "util_spike")?.fired).toBe(false);
    expect(partial.fires.find((f) => f.railId === "momentum_flip")?.fired).toBe(true);

    // Push every participating threshold past the observed readings.
    state.momentum_flip.value = -22;
    state.lrt_depeg_guard.value = 1.5;
    results = runBacktest(RAILS, state, RAIL_BACKTEST_EVENTS);
    expect(resultFor(results, "unwind-2024-08-05").fired).toBe(false);
  });

  it("AAVE desk keeps all 5 events; ETH desk drops the Aave-solvency CRV event", () => {
    expect(eventsForAsset("AAVE")).toHaveLength(5);
    const ethEvents = eventsForAsset("ETH");
    expect(ethEvents).toHaveLength(4);
    expect(ethEvents.map((e) => e.id)).not.toContain("crv-bad-debt-2022");
  });

  it("ETH desk catches all 4 of its events at factory defaults", () => {
    const results = runBacktest(RAILS, defaultRailState(RAILS), eventsForAsset("ETH"));
    expect(countCaught(results)).toEqual({ caught: 4, total: 4 });
  });
});
