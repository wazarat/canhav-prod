import "server-only";

import { cache } from "react";

import { getNetworkMemberCoins } from "@/lib/data";
import { getCoinLiveData } from "@/lib/server/coin";
import { resolveNetworkTvlSeries } from "@/lib/server/series";
import {
  buildFeesSummary,
  buildNetworkSnapshot,
  buildTvlFlow,
  type FeesSummary,
  type NetworkSnapshot,
  type TvlFlow,
} from "@/lib/networks/metrics";
import type { CoinLiveData } from "@/lib/server/coin";
import type { NetworkProfile, TvlDataPoint } from "@/lib/types";

export interface NetworkDashboardData {
  coins: CoinLiveData[];
  flow: TvlFlow;
  fees: FeesSummary;
  snapshot: NetworkSnapshot;
  tvlSeries: TvlDataPoint[];
  tvlSeriesSource: string | null;
  tvlValues: number[];
}

// react `cache()`: the page body and both Suspense children (OverviewDashboard,
// OverviewRail) call this with the same profile reference; dedup so member-coin
// resolution + the CoinGecko/Alchemy fan-out runs once per request. Memoization
// is by argument identity: keep passing the same `profile` object from
// `getApprovedNetworkBySlug` or the dedupe silently breaks.
export const loadNetworkDashboardData = cache(
  async (network: NetworkProfile): Promise<NetworkDashboardData> => {
    const members = await getNetworkMemberCoins(network);
    const coins = await Promise.all(
      members
        .filter((m) => m.profile !== null)
        .map((m) => getCoinLiveData(m.profile!, m.ref.role)),
    );
    const flow = buildTvlFlow(coins);
    const fees = buildFeesSummary(network);
    const snapshot = buildNetworkSnapshot(network, coins);
    const tvl = await resolveNetworkTvlSeries(network.slug);

    return {
      coins,
      flow,
      fees,
      snapshot,
      tvlSeries: tvl.points,
      tvlSeriesSource: tvl.source,
      tvlValues: tvl.points.map((p) => p.value),
    };
  },
);
