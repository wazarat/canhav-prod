"""
Aave V3 lending-rate overlay — supply/borrow APY read on-chain via Alchemy.

stdlib-only parity twin of ``frontend/lib/server/aave.ts`` (the Vercel cron is
the canonical runtime; this keeps the Python refresh script in sync for offline
dev). Reads Aave V3's ``AaveProtocolDataProvider.getReserveData(asset)`` via
``eth_call`` over the free-tier Alchemy Arbitrum RPC and converts the
ray-denominated ``liquidityRate`` / ``variableBorrowRate`` into APY percentages.

The 12-value tuple returned by ``getReserveData`` is all 32-byte words, so we
slice the ones we need: ``totalAToken`` (idx 2), ``totalStableDebt`` (idx 3),
``totalVariableDebt`` (idx 4), ``liquidityRate`` (idx 5), ``variableBorrowRate``
(idx 6).

Fails soft: a missing ``ALCHEMY_API_KEY`` or any RPC error yields ``None``.
Addresses are from bgd-labs/aave-address-book (AaveV3Arbitrum).
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Dict, Optional, TypedDict

from ..config import get_env

# AaveV3Arbitrum.AAVE_PROTOCOL_DATA_PROVIDER
DATA_PROVIDER = "0x243Aa95cAC2a25651eda86e80bEe66114413c43b"
DEFAULT_BASE_URL = "https://arb-mainnet.g.alchemy.com/v2"
# keccak256("getReserveData(address)")[:4]
SELECTOR_GET_RESERVE_DATA = "0x35ea6a75"

RAY = 10 ** 27
SECONDS_PER_YEAR = 31_536_000

# Member-coin slug -> underlying reserve address (Arbitrum). aTokens map to their
# underlying; GHO is the underlying itself. The TS twin resolves these by symbol
# via getAllReservesTokens(); here we pin them (stdlib has no ABI decoder for the
# dynamic string[] return). Best-known canonical addresses.
AAVE_RESERVES: Dict[str, str] = {
    "gho": "0x7dfF72693f6A4149b17e7C6314655f6A9F7c8B33",
    "ausdc": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",  # native USDC
    "ausdt": "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",  # Tether USDT
    "aweth": "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  # WETH
}
ATOKEN_SLUGS = {"ausdc", "ausdt", "aweth"}


class LendingMarketResult(TypedDict):
    supplyApyPct: Optional[float]
    variableBorrowApyPct: Optional[float]
    utilizationPct: Optional[float]
    underlyingSymbol: Optional[str]
    source: str  # always "aave"
    updatedAt: Optional[str]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _rpc_url() -> Optional[str]:
    key = get_env("ALCHEMY_API_KEY")
    if not key:
        return None
    base = get_env("ALCHEMY_ARBITRUM_BASE_URL", DEFAULT_BASE_URL) or DEFAULT_BASE_URL
    return f"{base.rstrip('/')}/{key}"


def _eth_call(url: str, to: str, data: str, *, timeout: float = 20.0) -> Optional[str]:
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


def _ray_to_apy_pct(rate: int) -> float:
    apr = rate / RAY
    return ((1 + apr / SECONDS_PER_YEAR) ** SECONDS_PER_YEAR - 1) * 100


def _encode_address_arg(addr: str) -> str:
    return addr.lower().replace("0x", "").rjust(64, "0")


def _word(hex_body: str, index: int) -> Optional[int]:
    start = index * 64
    chunk = hex_body[start : start + 64]
    if len(chunk) != 64:
        return None
    try:
        return int(chunk, 16)
    except ValueError:
        return None


def fetch_reserve_rates(underlying: str) -> Optional[LendingMarketResult]:
    """Read live supply/borrow APY + utilization for an Aave reserve underlying."""
    url = _rpc_url()
    if not url or not underlying:
        return None

    data = SELECTOR_GET_RESERVE_DATA + _encode_address_arg(underlying)
    raw = _eth_call(url, DATA_PROVIDER, data)
    if not raw:
        return None

    body = raw[2:]
    total_atoken = _word(body, 2)
    total_stable_debt = _word(body, 3)
    total_variable_debt = _word(body, 4)
    liquidity_rate = _word(body, 5)
    variable_borrow_rate = _word(body, 6)
    if liquidity_rate is None or variable_borrow_rate is None:
        return None

    utilization: Optional[float] = None
    if (
        total_atoken
        and total_atoken > 0
        and total_stable_debt is not None
        and total_variable_debt is not None
    ):
        utilization = ((total_stable_debt + total_variable_debt) / total_atoken) * 100

    return {
        "supplyApyPct": _ray_to_apy_pct(liquidity_rate),
        "variableBorrowApyPct": _ray_to_apy_pct(variable_borrow_rate),
        "utilizationPct": utilization,
        "underlyingSymbol": None,
        "source": "aave",
        "updatedAt": _now_iso(),
    }


def fetch_reserve_rates_for_slug(slug: str) -> Optional[LendingMarketResult]:
    """Resolve a member-coin slug to its reserve and read live rates; None if N/A."""
    underlying = AAVE_RESERVES.get(slug)
    if not underlying:
        return None
    return fetch_reserve_rates(underlying)
