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
