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


# Yield pool hints — mirror of LLAMA_YIELD_POOLS in defillama.ts.
LLAMA_YIELD_POOLS: dict[str, Optional[dict]] = {
    "susde": {"project": "ethena-usde", "symbol": "SUSDE"},
    "susds": {"project": "sky-lending", "symbol": "SUSDS"},
    "stusds": {"project": "pendle", "symbol": "STUSDS"},
    "scrvusd": {"project": "crvusd", "symbol": "SCRVUSD"},
    "sfrax": {"project": "frax", "symbol": "SFRAX"},
    "susdz": {"project": "anzen-v2", "symbol": "SUSDZ"},
    "sdeusd": {"project": "elixir", "symbol": "SDEUSD"},
    "usdy": {"project": "ondo-finance", "symbol": "USDY"},
    "jlp": {"project": "jupiter-perpetuals", "symbol": "JLP", "chain": "Solana"},
}

YIELDS_BASE = "https://yields.llama.fi"


def fetch_yield_pools() -> list:
    data = _get_json(f"{YIELDS_BASE}/pools")
    if not isinstance(data, dict):
        return []
    pools = data.get("data")
    return pools if isinstance(pools, list) else []


def resolve_yield_pool(slug: str, pools: list) -> Optional[dict]:
    hint = LLAMA_YIELD_POOLS.get(slug)
    if not hint:
        return None
    pool_id = hint.get("poolId")
    if pool_id:
        for p in pools:
            if isinstance(p, dict) and p.get("pool") == pool_id:
                return p
        return None
    candidates = [p for p in pools if isinstance(p, dict)]
    if hint.get("project"):
        proj = str(hint["project"]).lower()
        candidates = [p for p in candidates if str(p.get("project", "")).lower() == proj]
    if hint.get("symbol"):
        sym = str(hint["symbol"]).lower()
        candidates = [p for p in candidates if str(p.get("symbol", "")).lower() == sym]
    if hint.get("chain"):
        chain = str(hint["chain"]).lower()
        candidates = [p for p in candidates if str(p.get("chain", "")).lower() == chain]
    if not candidates:
        return None
    if not hint.get("chain"):
        candidates.sort(
            key=lambda p: (
                1 if str(p.get("chain", "")).lower() == "arbitrum" else 0,
                _num(p.get("tvlUsd")) or 0,
            ),
            reverse=True,
        )
    else:
        candidates.sort(key=lambda p: _num(p.get("tvlUsd")) or 0, reverse=True)
    return candidates[0]


STABLECOINS_BASE = "https://stablecoins.llama.fi"

# Minimal mirror of LLAMA_STABLECOIN_IDS — supply fallback when Alchemy/CG miss.
LLAMA_STABLECOIN_IDS: dict[str, Optional[int]] = {
    "usdpm": 341,
}


def fetch_stablecoin_circulating(slug: str) -> Optional[float]:
    """Latest circulating supply (USD peg units) from DeFi Llama stablecoin index."""
    asset_id = LLAMA_STABLECOIN_IDS.get(slug)
    if asset_id is None:
        return None
    data = _get_json(f"{STABLECOINS_BASE}/stablecoin/{asset_id}")
    if not isinstance(data, dict):
        return None
    balances = data.get("chainBalances")
    if not isinstance(balances, dict):
        return None
    total = 0.0
    found = False
    for chain_data in balances.values():
        if not isinstance(chain_data, dict):
            continue
        tokens = chain_data.get("tokens")
        if not isinstance(tokens, list) or not tokens:
            continue
        last = tokens[-1]
        if not isinstance(last, dict):
            continue
        circ = last.get("circulating")
        if isinstance(circ, dict):
            for v in circ.values():
                n = _num(v)
                if n is not None:
                    total += n
                    found = True
    return total if found else None
