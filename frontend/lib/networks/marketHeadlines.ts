import type { NetworkProfile } from "@/lib/types";

/** Headline TVL for a network row — mirrors NetworkTable column resolution. */
export function networkHeadlineTvlUsd(network: NetworkProfile): number | null {
  const u = network.universalMetrics;
  return u?.tvl.tvlUsd.value ?? network.currentScale.tvlUsd ?? null;
}

/** Headline market cap for a network row. */
export function networkHeadlineMarketCapUsd(network: NetworkProfile): number | null {
  const u = network.universalMetrics;
  return u?.market.marketCapUsd.value ?? network.currentScale.marketCapUsd ?? null;
}

/** Headline 24h trading volume for a network row. */
export function networkHeadlineVolume24hUsd(network: NetworkProfile): number | null {
  const u = network.universalMetrics;
  return (
    u?.market.volume24hUsd?.value ??
    network.currentScale.volume24hUsd ??
    network.dexVolume?.volume24hUsd ??
    null
  );
}

export function networkNeedsMarketEnrichment(network: NetworkProfile): boolean {
  return (
    networkHeadlineMarketCapUsd(network) == null ||
    networkHeadlineVolume24hUsd(network) == null
  );
}
