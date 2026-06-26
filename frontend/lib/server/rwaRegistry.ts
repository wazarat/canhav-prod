import "server-only";

/**
 * Curated Arbitrum token/vault registry for RWAs.
 *
 * Unlike stablecoins, most RWA tokens are not listed on CoinGecko (so their
 * Arbitrum address + price can't be auto-resolved). This map is the single place
 * to pin a protocol's on-chain contract so the Alchemy panels (supply, TVL,
 * transfers) light up. It also lets us fix a USD price for NAV-style assets
 * (e.g. money-market funds at $1.00) that CoinGecko reports with no market cap.
 *
 * Resolution precedence (see lib/server/resolve.ts):
 *   stored profile.contractAddress  ->  this registry  ->  CoinGecko
 *
 * Addresses MUST be verified before adding — never guess a contract address.
 * Leave a slug out entirely when its token is private / not yet public; the UI
 * renders an explicit "no public token" state for those.
 */

export interface RwaTokenEntry {
  /** Arbitrum token/vault contract address (lowercase, verified). */
  address: string;
  /** Token decimals; omit to let Alchemy read `decimals()` on-chain. */
  decimals?: number;
  /** Fixed USD price for the TVL proxy (supply x price). */
  priceUsd?: number;
  /** Shorthand for priceUsd = 1 (treasuries / money-market funds at $1 NAV). */
  pegged?: boolean;
  /** Short human note (kept for documentation; not rendered). */
  note?: string;
}

export const RWA_ADDRESSES: Record<string, RwaTokenEntry> = {
  // Franklin OnChain U.S. Government Money Fund (BENJI) — Arbitrum One, $1.00 NAV.
  // Verified: CoinGecko detail_platforms["arbitrum-one"] for franklin-templeton-benji.
  benji: {
    address: "0xb9e4765bce2609bc1949592059b17ea72fee6c6a",
    pegged: true,
    note: "BENJI money-market fund token on Arbitrum One; TVL = on-chain supply x $1.00.",
  },
  // OUSG — tokenized short-term US Treasury fund (Ondo). Ethereum mainnet; used when
  // CoinGecko platform resolution misses the contract. Verified: ingest_rwas.py + Ondo docs.
  ousg: {
    address: "0x1b19c19393e2d034d8ff31ff34c81252fcbbee92",
    pegged: true,
    note: "OUSG on Ethereum; TVL proxy = on-chain supply x ~$1 NAV.",
  },
  // Pleasing Gold (PGOLD) — Arbitrum One. Verified: CoinGecko
  // platforms["arbitrum-one"] for pleasing-gold. No fixed price (tracks gold
  // spot), so the TVL proxy still needs the live CoinGecko price; this entry
  // pins the address so the on-chain panels survive a CoinGecko lookup miss.
  pgold: {
    address: "0x3e76bb02286bfeaa89dd35f11253f2cbce634f91",
    note: "PGOLD tokenized gold on Arbitrum One; price resolved live via CoinGecko.",
  },
};

export function rwaTokenForSlug(slug: string): RwaTokenEntry | null {
  return RWA_ADDRESSES[slug] ?? null;
}
