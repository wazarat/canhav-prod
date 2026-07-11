import { Info } from "lucide-react";

import { coinIdForSlug } from "@/lib/server/coingecko";
import {
  llamaProtocolForSlug,
  llamaStablecoinIdForSlug,
} from "@/lib/server/defillama";
import type { RwaProfile, StablecoinProfile, TokenProfile } from "@/lib/types";

/**
 * Explicit "not listed on public market aggregators" banner — rendered instead
 * of silent dashes for assets like Stably (USDS.s) that have no CoinGecko
 * listing, no DeFi Llama coverage, and no resolvable on-chain contract. Returns
 * null for any asset with at least one live market source.
 */
export function UnlistedMarketNotice({
  profile,
}: {
  profile: StablecoinProfile | RwaProfile | TokenProfile;
}) {
  const hasCoinGecko = coinIdForSlug(profile.slug) !== null;
  const hasLlama =
    profile.category === "RWA"
      ? llamaProtocolForSlug(profile.slug) !== null
      : llamaStablecoinIdForSlug(profile.slug) !== null;
  const hasContract = Boolean((profile.contractAddress ?? "").trim());

  if (hasCoinGecko || hasLlama || hasContract) return null;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
      <div className="text-sm text-ink-200">
        <p className="font-medium text-amber-300">Market data unavailable</p>
        <p className="mt-0.5 text-ink-300">
          {profile.name} is not listed on public market aggregators (CoinGecko, DeFi Llama) and
          has no public on-chain contract mapped, so live supply, price, and TVL metrics can&apos;t
          be sourced. The qualitative research below (issuer facts, links, and classification)
          is curated and current.
        </p>
      </div>
    </div>
  );
}
