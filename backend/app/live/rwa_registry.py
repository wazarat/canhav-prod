"""
Curated Arbitrum token/vault registry for RWAs.  [Step 4 B2]

Python mirror of ``frontend/lib/server/rwaRegistry.ts`` — keep the two in sync.

Unlike stablecoins, most RWA tokens are not listed on CoinGecko (so their
Arbitrum address + price can't be auto-resolved). This map is the single place
to pin a protocol's on-chain contract so the Alchemy metrics (supply, TVL)
light up. It also lets us fix a USD price for NAV-style assets (e.g. money-market
funds at $1.00) that CoinGecko reports with no market cap.

Resolution precedence (see ``scripts/refresh_live.py``):
  CoinGecko  ->  this registry

Addresses MUST be verified before adding — never guess a contract address.
Leave a slug out entirely when its token is private / not yet public.
"""

from __future__ import annotations

from typing import Optional, TypedDict


class RwaTokenEntry(TypedDict, total=False):
    address: str  # Arbitrum token/vault contract address (lowercase, verified).
    decimals: Optional[int]  # omit to let Alchemy read decimals() on-chain.
    priceUsd: Optional[float]  # fixed USD price for the TVL proxy (supply x price).
    pegged: bool  # shorthand for priceUsd = 1 (treasuries / MMFs at $1 NAV).
    note: str  # short human note (documentation only).


RWA_ADDRESSES: dict[str, RwaTokenEntry] = {
    # Franklin OnChain U.S. Government Money Fund (BENJI) — Arbitrum One, $1.00 NAV.
    # Verified: CoinGecko detail_platforms["arbitrum-one"] for franklin-templeton-benji.
    "franklin-templeton": {
        "address": "0xb9e4765bce2609bc1949592059b17ea72fee6c6a",
        "pegged": True,
        "note": "BENJI money-market fund token on Arbitrum One; TVL = on-chain supply x $1.00.",
    },
    # Pleasing Gold (PGOLD) — Arbitrum One. Verified: CoinGecko platforms.
    "pgold": {
        "address": "0x3e76bb02286bfeaa89dd35f11253f2cbce634f91",
        "note": "PGOLD tokenized gold on Arbitrum One; price resolved live via CoinGecko.",
    },
}


def rwa_token_for_slug(slug: str) -> Optional[RwaTokenEntry]:
    return RWA_ADDRESSES.get(slug)
