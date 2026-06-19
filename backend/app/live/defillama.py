"""
DeFi Llama overlay — protocol TVL + DEX trading volume.  [Step 4 / Sector expansion]

Python parity for the canonical TS cron (``frontend/app/api/cron/refresh``). The
TS cron is what production runs; this mirror keeps the local Python pipeline
(``refresh_live.py``) in sync for offline dev and parity checks.

  - ``fetch_protocol_tvl(slug)`` reads the latest protocol TVL (USD) from
    ``api.llama.fi/protocol/{slug}`` — used for DEX ``tvlUsd`` and RWA ``aumUsd``.
  - ``fetch_dex_volume(slug)`` reads the 30-day trading volume from
    ``api.llama.fi/summary/dexs/{protocol}``.

Slug maps mirror ``LLAMA_PROTOCOL_SLUGS`` / ``LLAMA_DEX_SLUGS`` in
``frontend/lib/server/defillama.ts``. Keep the two in sync.

Stdlib only (``urllib``); keyless public API. Fails soft: any network/lookup
miss returns ``None`` rather than raising, so the runner can skip and continue.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Optional

LLAMA_API_BASE = "https://api.llama.fi"

# Curated slug -> DeFi Llama protocol slug (TVL series). Mirror of
# LLAMA_PROTOCOL_SLUGS in defillama.ts (lending + DEX + RWA subset).
LLAMA_PROTOCOL_SLUGS: dict[str, Optional[str]] = {
    # Lending networks (PDF Week 7+8) — protocol TVL series (verified 2026-06-18).
    "aave": "aave-v3",
    "morpho": "morpho-blue",
    "spark": "spark",
    "compound": "compound-v3",
    "fluid": "fluid",
    "venus": "venus-core-pool",
    "justlend": "justlend",
    "kamino": "kamino-lend",
    "maple": "maple",
    # DEX networks — parent-protocol TVL.
    "uniswap": "uniswap",
    "curve-finance": "curve-finance",
    "balancer": "balancer",
    "aerodrome": "aerodrome-slipstream",  # parent "aerodrome" 400s # verify
    "pancakeswap": "pancakeswap",
    "trader-joe": "lfj",  # verify (LFJ, fka Trader Joe)
    "sushiswap": "sushiswap",
    "raydium": "raydium",
    "thorchain": "thorchain-dex",
    "hyperliquid": "hyperliquid",
    "dydx": "dydx",
    "gmx": "gmx",
    "drift-protocol": "drift-trade",
    "gains-network": "gains-network",
    # RWA networks — issuer/protocol TVL.
    "ondo-finance": "ondo-finance",
    "pleasing-market": "pleasing-gold",
    "securitize": "securitize",
    "centrifuge": "centrifuge-protocol",
    "goldfinch": "goldfinch",
    "clearpool": "clearpool",
    "realt": "realt",
    "lofty-ai": "lofty",
    "toucan-protocol": "toucan-protocol",
    # RWA expansion + coin-level slugs (mirrors defillama.ts).
    "dinari": "dinari",
    "estate-protocol": "estate-protocol",
    "chateau-capital": "chateau",
    "florence-finance": "florence-finance",
    "pgold": "pleasing-gold",
    # Verified absent — covered via on-chain supply x $1 NAV or CoinGecko instead.
    "arcton": None,
    "atmosphera": None,
    "aryze": None,
    "dualmint": None,
    "franklin-templeton": None,
    "ousg": None,
    "ondo-gm": None,
    "stably-gold": None,
}

# Curated slug -> DeFi Llama DEX protocol slug (volume). Mirror of
# LLAMA_DEX_SLUGS in defillama.ts. summary/dexs fails soft, so unverified slugs
# simply yield no live volume. # verify
LLAMA_DEX_SLUGS: dict[str, Optional[str]] = {
    "jupiter": None,  # Jupiter aggregator - no working volume adapter on DeFi Llama
    "uniswap": "uniswap",
    "camelot": "camelot",  # Arbitrum-native DEX # verify
    "curve-finance": "curve-dex",
    "balancer": "balancer",
    "aerodrome": "aerodrome-slipstream",
    "pancakeswap": "pancakeswap",
    "trader-joe": "lfj",
    "sushiswap": "sushiswap",
    "raydium": "raydium",
    "thorchain": "thorchain-dex",
}


# Curated slug -> DeFi Llama yields/borrow project id. Mirror of
# LLAMA_LENDING_PROJECTS in defillama.ts (borrow-pool aggregation).
LLAMA_LENDING_PROJECTS: dict[str, Optional[str]] = {
    "aave": "aave-v3",
    "morpho": "morpho-blue",
    "spark": "sparklend",
    "compound": "compound-v3",
    "fluid": "fluid-lending",
    "venus": "venus-core-pool",
    "justlend": "justlend",
    "kamino": "kamino-lend",
    "maple": "maple",
}


def llama_protocol_for_slug(slug: str) -> Optional[str]:
    return LLAMA_PROTOCOL_SLUGS.get(slug)


def llama_lending_project_for_slug(slug: str) -> Optional[str]:
    return LLAMA_LENDING_PROJECTS.get(slug)


def llama_dex_for_slug(slug: str) -> Optional[str]:
    return LLAMA_DEX_SLUGS.get(slug)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _get_json(url: str, *, timeout: float = 30.0) -> Optional[dict]:
    req = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "User-Agent": "canhav-research/1.0"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError, OSError):
        return None


def _num(value) -> Optional[float]:
    if isinstance(value, (int, float)) and value == value:  # not NaN
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return None
    return None


def fetch_protocol_tvl(slug: str) -> dict:
    """
    Return the latest protocol TVL (USD) for a curated slug as a Sourced dict.

    ``value`` is ``None`` when the slug is unmapped or the call fails. Prefers the
    protocol-wide ``tvl`` series tail (mirrors the TS cron's day-1 fetch).
    """
    empty = {"value": None, "source": "defillama", "updatedAt": None}
    protocol = llama_protocol_for_slug(slug)
    if not protocol:
        return empty
    data = _get_json(f"{LLAMA_API_BASE}/protocol/{protocol}")
    if not isinstance(data, dict):
        return empty
    series = data.get("tvl")
    if not isinstance(series, list) or not series:
        return empty
    last = series[-1]
    value = _num(last.get("totalLiquidityUSD")) if isinstance(last, dict) else None
    if value is None or value <= 0:
        return empty
    return {"value": value, "source": "defillama", "updatedAt": _now_iso()}


def fetch_dex_volume(slug: str) -> dict:
    """
    Return the 30-day DEX trading volume (USD) for a curated slug as a Sourced dict.

    Llama exposes ``total30d`` on ``summary/dexs/{protocol}``. ``value`` is
    ``None`` when the slug is unmapped or the call fails.
    """
    empty = {"value": None, "source": "defillama", "updatedAt": None}
    protocol = llama_dex_for_slug(slug)
    if not protocol:
        return empty
    data = _get_json(f"{LLAMA_API_BASE}/summary/dexs/{protocol}")
    if not isinstance(data, dict):
        return empty
    value = _num(data.get("total30d"))
    if value is None or value <= 0:
        return empty
    return {"value": value, "source": "defillama", "updatedAt": _now_iso()}


COINS_BASE = "https://coins.llama.fi"


def arb_coin_key(address: str) -> str:
    return f"arbitrum:{address.strip().lower()}"


def eth_coin_key(address: str) -> str:
    return f"ethereum:{address.strip().lower()}"


def llama_coin_keys_for_address(address: str, primary_chain: Optional[str] = None) -> list[str]:
    addr = address.strip().lower()
    chain = (primary_chain or "").lower()
    if "ethereum" in chain and "arbitrum" not in chain:
        return [eth_coin_key(addr), arb_coin_key(addr)]
    return [arb_coin_key(addr), eth_coin_key(addr)]


def fetch_coin_price(coin_key: str) -> Optional[float]:
    """Current USD price for a ``{chain}:{address}`` Llama coin key."""
    data = _get_json(f"{COINS_BASE}/prices/current/{coin_key}")
    if not isinstance(data, dict):
        return None
    coins = data.get("coins")
    if not isinstance(coins, dict):
        return None
    coin = coins.get(coin_key)
    if not isinstance(coin, dict):
        return None
    return _num(coin.get("price"))
