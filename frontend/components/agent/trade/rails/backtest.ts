/**
 * Pure backtest engine for the card rails: replays the curated historical
 * Aave events against the current rail settings and reports which rails
 * would have fired. No server-only imports — this runs client-side on every
 * slider tick and in unit tests.
 */

import {
  DEPEG_HARD_PCT,
  type MetricKey,
  type RailDef,
  type RailSeverity,
  type RailState,
} from "./railDefs";

export interface BacktestEvent {
  id: string;
  /** Display date, e.g. "2024-08-05" or "2022-06". */
  date: string;
  title: string;
  /** One line of what happened, no jargon. */
  summary: string;
  severity: RailSeverity;
  /**
   * Observed values in the early-detection window (when a rail could still
   * act), not the eventual bottom — so moving a threshold demonstrates WHEN
   * the rail would have tripped, not whether the crash happened.
   */
  metrics: Partial<Record<MetricKey, number>>;
  /** The recommendation line the agent would have filed. */
  wouldHaveSaid: string;
  /** What actually happened, for the honesty line under each row. */
  outcome: string;
}

export interface RailFire {
  railId: string;
  railName: string;
  metricKey: MetricKey;
  observed: number;
  /** Threshold compared against; null for event-driven rails. */
  threshold: number | null;
  unit: string;
  fired: boolean;
  severity: RailSeverity;
}

export interface EventResult {
  event: BacktestEvent;
  /** One entry per enabled rail whose watched metric exists on the event. */
  fires: RailFire[];
  fired: boolean;
}

/** Replay every event against the current rail settings. Pure. */
export function runBacktest(
  rails: RailDef[],
  state: RailState,
  events: BacktestEvent[],
): EventResult[] {
  return events.map((event) => {
    const fires: RailFire[] = [];
    for (const rail of rails) {
      const railState = state[rail.id];
      if (!railState?.enabled) continue;

      const key = rail.threshold?.key ?? rail.eventKey;
      if (!key) continue;
      const observed = event.metrics[key];
      if (observed == null) continue;

      let fired: boolean;
      let threshold: number | null = null;
      if (rail.threshold) {
        threshold = railState.value;
        fired =
          rail.threshold.direction === "gte" ? observed >= threshold : observed <= threshold;
      } else {
        fired = observed === 1;
      }

      if (fired && rail.secondary) {
        const secondaryObserved = event.metrics[rail.secondary.key];
        fired =
          secondaryObserved != null &&
          (rail.secondary.direction === "lt"
            ? secondaryObserved < rail.secondary.value
            : secondaryObserved > rail.secondary.value);
      }

      // The depeg guard's hard tier: at DEPEG_HARD_PCT or worse the fire is
      // high severity no matter where the soft intraday threshold sits.
      const severity: RailSeverity =
        fired && rail.id === "lrt_depeg_guard" && observed >= DEPEG_HARD_PCT
          ? "high"
          : rail.severity;

      fires.push({
        railId: rail.id,
        railName: rail.name,
        metricKey: key,
        observed,
        threshold,
        unit: rail.threshold?.unit ?? "",
        fired,
        severity,
      });
    }
    return { event, fires, fired: fires.some((f) => f.fired) };
  });
}

export function countCaught(results: EventResult[]): { caught: number; total: number } {
  return {
    caught: results.filter((r) => r.fired).length,
    total: results.length,
  };
}

/**
 * Five real events from the Aave dependency research (the Risks-tab work).
 * Each metric is the early-window reading a live rail would have seen:
 *  - stETH 2022: ~2.5% below ETH in early June, before Celsius froze
 *    withdrawals and the discount deepened toward 5%+.
 *  - ezETH 2024: printed near $700 on thin DEX pools vs ETH ~$3.1k; scored
 *    as the sustained ~22% venue depeg rather than the worst wick.
 *  - Aug 5 2024: WETH -21% intraday, LST/LRT wobble ~1.2%, ETH reserve
 *    utilization ~93%; Aave tightened E-Mode LT/LTV days later.
 *  - rsETH 2026: unbacked rsETH dumped on thin liquidity (~4% depeg), Kelp
 *    TVL fell ~18%, and Aave froze the rsETH reserves (LTV to zero).
 */
export const RAIL_BACKTEST_EVENTS: BacktestEvent[] = [
  {
    id: "steth-depeg-2022",
    date: "2022-06",
    title: "stETH depeg during Celsius / 3AC",
    summary:
      "stETH slid to roughly 2.5% below ETH in early June, then past 5% once Celsius froze withdrawals.",
    severity: "high",
    metrics: { depegPct: 2.5 },
    wouldHaveSaid: "REDUCE: largest collateral asset depegging, contagion risk.",
    outcome: "Aave froze some markets later; the rail flags the discount before the freeze.",
  },
  {
    id: "crv-bad-debt-2022",
    date: "2022-11",
    title: "CRV bad debt, market frozen",
    summary:
      "The Mango attacker's CRV short left Aave with about 2.7M CRV of bad debt and a frozen market.",
    severity: "high",
    metrics: { frozenMarket: 1 },
    wouldHaveSaid: "SELL: held-coin market frozen, protocol carrying bad debt.",
    outcome: "The debt lingered until mid-2025, a long and correct de-risk window.",
  },
  {
    id: "ezeth-depeg-2024",
    date: "2024-04",
    title: "ezETH (Renzo) depeg",
    summary:
      "ezETH printed near $700 on thin DEX pools and looped restaking positions were liquidated across venues.",
    severity: "high",
    metrics: { depegPct: 22, change24hPct: -9, change7dPct: -12 },
    wouldHaveSaid: "SELL: restaking dependency ezETH depegged hard, freeze new LRT longs.",
    outcome:
      "Aave's exchange-rate oracle limited borrower liquidations, but loopers elsewhere were hit.",
  },
  {
    id: "unwind-2024-08-05",
    date: "2024-08-05",
    title: "Carry-trade unwind",
    summary:
      "WETH fell 21% in a day, LST/LRT collateral wobbled about 1.2%, and ETH reserve utilization climbed to roughly 93%.",
    severity: "medium",
    metrics: { utilizationPct: 93, change24hPct: -21, change7dPct: -26, depegPct: 1.2 },
    wouldHaveSaid: "REDUCE: correlated LST/LRT collateral under stress, utilization climbing.",
    outcome: "Aave tightened E-Mode limits days later; the rails front-run the DAO's response.",
  },
  {
    id: "rseth-kelp-2026",
    date: "2026-04",
    title: "rsETH (Kelp DAO) incident",
    summary:
      "Unbacked rsETH hit thin liquidity for about a 4% depeg, Kelp TVL dropped 18%, and Aave froze the rsETH reserves.",
    severity: "high",
    metrics: { depegPct: 4, issuerTvlDropPct: 18, frozenMarket: 1 },
    wouldHaveSaid: "SELL: core dependency rsETH triggered a governance risk response.",
    outcome: "The exact scenario the rails exist for: a dependency event becomes an AAVE call.",
  },
];
