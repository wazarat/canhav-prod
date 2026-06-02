"""
Alchemy overlay — on-chain supply (stablecoins) and TVL (RWAs).  [Step 4 B2]

Implemented against the free-tier Alchemy Arbitrum JSON-RPC endpoint using only
the standard library (``urllib``), so no installs are required.

  - ``fetch_total_supply(address, decimals)`` reads ``totalSupply()`` (and, if
    ``decimals`` is unknown, ``decimals()``) via ``eth_call`` and scales it.
  - ``fetch_total_value_locked(holdings)`` sums ``supply_i * priceUsd_i`` across
    a protocol's token/vault contracts (price comes from CoinGecko). This is an
    AUM/market-cap proxy for TVL — documented as such — since the free tier has
    no protocol-specific TVL feed.

Both fail soft: a missing ``ALCHEMY_API_KEY`` or any RPC error yields a result
with ``value=None`` rather than raising, so the runner can continue.

Token/vault addresses are resolved up front by ``app.live.coingecko`` and stored
on each profile; this module only consumes addresses.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import List, Optional, TypedDict

from ..config import get_env

# Function selectors (first 4 bytes of keccak256 of the signature).
SELECTOR_TOTAL_SUPPLY = "0x18160ddd"  # totalSupply()
SELECTOR_DECIMALS = "0x313ce567"  # decimals()

DEFAULT_BASE_URL = "https://arb-mainnet.g.alchemy.com/v2"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rpc_url() -> Optional[str]:
    key = get_env("ALCHEMY_API_KEY")
    if not key:
        return None
    base = get_env("ALCHEMY_ARBITRUM_BASE_URL", DEFAULT_BASE_URL) or DEFAULT_BASE_URL
    return f"{base.rstrip('/')}/{key}"


def _eth_call(url: str, to: str, data: str, *, timeout: float = 20.0) -> Optional[str]:
    """Return the hex result of an ``eth_call``, or ``None`` on error."""
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "eth_call",
        "params": [{"to": to, "data": data}, "latest"],
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None
    if not isinstance(body, dict) or body.get("error"):
        return None
    result = body.get("result")
    if not isinstance(result, str) or not result.startswith("0x") or len(result) <= 2:
        return None
    return result


def _hex_to_int(value: Optional[str]) -> Optional[int]:
    if not value:
        return None
    try:
        return int(value, 16)
    except ValueError:
        return None


class TotalSupplyResult(TypedDict):
    value: Optional[float]
    source: str  # always "alchemy"
    updatedAt: Optional[str]


def fetch_total_supply(token_address: str, *, decimals: Optional[int] = None) -> TotalSupplyResult:
    """
    Return live circulating supply (token units) for an Arbitrum token contract.

    ``value`` is ``None`` if the key is missing or the call fails. For a USD-pegged
    stablecoin, supply in token units ~= circulating USD, which is what the UI
    renders.
    """
    empty: TotalSupplyResult = {"value": None, "source": "alchemy", "updatedAt": None}
    url = _rpc_url()
    if not url or not token_address:
        return empty

    raw = _hex_to_int(_eth_call(url, token_address, SELECTOR_TOTAL_SUPPLY))
    if raw is None:
        return empty

    if decimals is None:
        decimals = _hex_to_int(_eth_call(url, token_address, SELECTOR_DECIMALS))
        if decimals is None:
            decimals = 18  # ERC-20 default

    value = raw / (10 ** decimals)
    return {"value": value, "source": "alchemy", "updatedAt": _now_iso()}


class Holding(TypedDict, total=False):
    address: str
    decimals: Optional[int]
    priceUsd: Optional[float]


class TotalValueLockedResult(TypedDict):
    value: Optional[float]
    source: str  # always "alchemy"
    updatedAt: Optional[str]


def fetch_total_value_locked(holdings: List[Holding]) -> TotalValueLockedResult:
    """
    Return live total value locked (USD) for an RWA protocol.

    Computed as ``sum(totalSupply_i * priceUsd_i)`` over the protocol's token /
    vault contracts. This is an AUM / market-cap proxy for TVL (the free tier has
    no protocol-specific TVL feed). ``value`` is ``None`` if nothing could be
    priced (no key, no address, or no price).
    """
    empty: TotalValueLockedResult = {"value": None, "source": "alchemy", "updatedAt": None}
    url = _rpc_url()
    if not url or not holdings:
        return empty

    total = 0.0
    priced_any = False
    for h in holdings:
        address = (h.get("address") or "").strip()
        price = h.get("priceUsd")
        if not address or price is None:
            continue
        supply = fetch_total_supply(address, decimals=h.get("decimals"))
        if supply["value"] is None:
            continue
        total += supply["value"] * float(price)
        priced_any = True

    if not priced_any:
        return empty
    return {"value": total, "source": "alchemy", "updatedAt": _now_iso()}
