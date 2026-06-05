"""
CoinGecko resolver — Arbitrum contract address + USD price.  [Step 4 B2]

Token/vault contract addresses are NOT in the Portal CSV, but Alchemy needs an
address to read on-chain supply. CoinGecko's free public API exposes, per coin:

  - ``detail_platforms["arbitrum-one"]`` -> ``{ contract_address, decimal_place }``
  - ``market_data.current_price.usd``     -> spot price (for RWA TVL pricing)

This module maps each protocol slug to a CoinGecko coin id and resolves both in
one request. It is stdlib-only (``urllib``) so it needs no installs, and it fails
soft: any network/lookup miss returns ``None`` rather than raising, so the
overlay runner can skip that protocol and continue.

Free-tier etiquette: a short delay between calls and optional demo API key
(``COINGECKO_API_KEY`` -> ``x-cg-demo-api-key`` header).
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Optional, TypedDict

from ..config import get_env

COINGECKO_BASE = "https://api.coingecko.com/api/v3"
ARBITRUM_PLATFORM = "arbitrum-one"

# Best-effort slug -> CoinGecko coin id. ``None`` means "no known liquid token on
# CoinGecko" (common for early-stage RWAs); fill these in as tokens launch, or
# override an address manually on the store item. This map is the single place
# to curate the mapping.
COINGECKO_IDS: dict[str, Optional[str]] = {
    # Stablecoins
    "ethena": "ethena-usde",
    "susde": "ethena-staked-usde",
    "usdtb": None,
    "ena": "ethena",
    "inverse-finance": "dola-usd",
    "monerium": "monerium-eur-money",
    "gbpe": None,
    "sky": "usds",
    "susds": "susds",
    "dai": "dai",
    "stusds": None,
    "sky-gov": "sky",
    "stably": None,
    "veusd": "veusd",
    "tether": "tether",
    "trueusd": "true-usd",
    "usd-ai": None,
    "usdai": "usdai",
    "susdai": "susdai",
    "chip": None,
    # Jupiter (Solana)
    "jup": "jupiter-exchange-solana",
    "jlp": "jupiter-perpetuals-liquidity-provider-token",
    "jupsol": "jupiter-staked-sol",
    "jupusd": "jupusd",
    "jljupusd": None,
    "usdpm": None,
    "gho": "gho",
    "sgho": None,
    "usdy": "ondo-us-dollar-yield",
    "ondo-gov": "ondo-finance",
    "aave-gov": "aave",
    "stkaave": "staked-aave",
    "pgold": "pleasing-gold",
    "ousg": "ousg",
    "usdc": "usd-coin",
    "usdt0": "usdt0",
    # RWAs (most have no CoinGecko-listed Arbitrum token yet)
    "arcton": None,
    "aryze": None,
    "atmosphera": None,
    "centrifuge": "centrifuge",
    "chateau-capital": None,
    "dinari": None,
    "dualmint": None,
    "estate-protocol": None,
    "florence-finance": None,
    "franklin-templeton": "franklin-templeton-benji",
}


class TokenResolution(TypedDict):
    coinId: str
    address: Optional[str]
    decimals: Optional[int]
    priceUsd: Optional[float]
    source: str  # always "coingecko"


def _get_json(url: str, *, timeout: float = 20.0) -> Optional[dict]:
    headers = {"User-Agent": "canhav-research/1.0", "Accept": "application/json"}
    api_key = get_env("COINGECKO_API_KEY")
    if api_key:
        headers["x-cg-demo-api-key"] = api_key
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code == 429:  # rate limited — back off once and retry
            time.sleep(8.0)
            try:
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    return json.loads(resp.read().decode("utf-8"))
            except Exception:
                return None
        return None
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None


def resolve_coin(coin_id: str) -> Optional[TokenResolution]:
    """
    Resolve a CoinGecko coin id to its Arbitrum address + USD price.

    Returns ``None`` if the coin can't be fetched. ``address``/``decimals`` may be
    ``None`` if the coin has no Arbitrum deployment (price can still be present).
    """
    params = urllib.parse.urlencode(
        {
            "localization": "false",
            "tickers": "false",
            "market_data": "true",
            "community_data": "false",
            "developer_data": "false",
            "sparkline": "false",
        }
    )
    data = _get_json(f"{COINGECKO_BASE}/coins/{urllib.parse.quote(coin_id)}?{params}")
    if not isinstance(data, dict):
        return None

    address: Optional[str] = None
    decimals: Optional[int] = None
    detail = data.get("detail_platforms") or {}
    arb = detail.get(ARBITRUM_PLATFORM) if isinstance(detail, dict) else None
    if isinstance(arb, dict):
        address = (arb.get("contract_address") or "").strip().lower() or None
        dp = arb.get("decimal_place")
        decimals = int(dp) if isinstance(dp, int) else None
    if address is None:
        # Fall back to the flat ``platforms`` map (no decimals there).
        platforms = data.get("platforms") or {}
        if isinstance(platforms, dict):
            address = (platforms.get(ARBITRUM_PLATFORM) or "").strip().lower() or None

    price_usd: Optional[float] = None
    market = data.get("market_data") or {}
    cur = market.get("current_price") if isinstance(market, dict) else None
    if isinstance(cur, dict) and isinstance(cur.get("usd"), (int, float)):
        price_usd = float(cur["usd"])

    return TokenResolution(
        coinId=coin_id,
        address=address,
        decimals=decimals,
        priceUsd=price_usd,
        source="coingecko",
    )


def resolve_for_slug(slug: str) -> Optional[TokenResolution]:
    """Resolve via the curated ``COINGECKO_IDS`` map; ``None`` if unmapped."""
    coin_id = COINGECKO_IDS.get(slug)
    if not coin_id:
        return None
    return resolve_coin(coin_id)
