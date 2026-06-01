"""
Alchemy overlay — on-chain circulating supply.  [DEFERRED — Step 4]

Goal: populate each profile's ``TotalSupply`` attribute with live circulating
supply pulled from Alchemy's FREE tier (no other providers without approval).

Planned approach:
  - Read ``ALCHEMY_API_KEY`` from the environment.
  - For each token's Arbitrum contract address, call ``alchemy_getTokenMetadata``
    (decimals) + ``eth_call`` on ``totalSupply()`` (selector 0x18160ddd), or use
    Alchemy's token API, then scale by decimals.
  - Wrap the result in the same shape the schema/UI already expect.

NOTE: token contract addresses are NOT in the CSV — they must be resolved first
(e.g. from CoinGecko/Arbitrum token lists) and stored on the profile before this
overlay can run. That mapping is part of the Step 4 work.

This module is intentionally NOT imported or executed during Steps 1-3.
"""

from __future__ import annotations

import os
from typing import Optional, TypedDict


class TotalSupplyResult(TypedDict):
    value: Optional[float]
    source: str  # always "alchemy"
    updatedAt: Optional[str]


def fetch_total_supply(token_address: str, *, decimals: int = 18) -> TotalSupplyResult:
    """
    Return live circulating supply for an Arbitrum token contract.

    DEFERRED: implement in Step 4 using the free-tier Alchemy API and
    ``ALCHEMY_API_KEY``. Must return the shape above so callers/UI are unchanged.
    """
    _ = os.environ.get("ALCHEMY_API_KEY")  # required at implementation time
    raise NotImplementedError(
        "Alchemy total-supply overlay is deferred to Step 4. "
        "See AGENT_HANDOFF.md for the implementation plan."
    )
