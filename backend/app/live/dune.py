"""
Dune overlay — historical peg variance.  [DEFERRED — Step 4]

Goal: populate each profile's ``HistoricalPegData`` with a daily peg-price
series pulled from Dune Analytics' FREE tier.

Planned approach:
  - Read ``DUNE_API_KEY`` from the environment.
  - Trigger a saved Dune query (per asset, or one parametrized query) via
    ``POST /api/v1/query/{query_id}/execute``, poll
    ``GET /api/v1/execution/{execution_id}/status`` until complete, then fetch
    ``GET /api/v1/execution/{execution_id}/results``.
  - Normalize rows into ``[{ "date": "YYYY-MM-DD", "price": <float> }, ...]``.

This module is intentionally NOT imported or executed during Steps 1-3.
"""

from __future__ import annotations

import os
from typing import List, Optional, TypedDict


class PegPoint(TypedDict):
    date: str
    price: float


class HistoricalPegResult(TypedDict):
    points: List[PegPoint]
    source: str  # always "dune"
    updatedAt: Optional[str]


def fetch_peg_history(query_id: int, *, days: int = 30) -> HistoricalPegResult:
    """
    Return a daily peg-price series for one asset.

    DEFERRED: implement in Step 4 using the free-tier Dune API and
    ``DUNE_API_KEY``. Must return the shape above so callers/UI are unchanged.
    """
    _ = os.environ.get("DUNE_API_KEY")  # required at implementation time
    raise NotImplementedError(
        "Dune peg-history overlay is deferred to Step 4. "
        "See AGENT_HANDOFF.md for the implementation plan."
    )
