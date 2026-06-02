#!/usr/bin/env python3
"""
Step 4, Goal B2 — refresh live metrics from Alchemy (addresses via CoinGecko).

Pipeline per protocol:
  1. Resolve the Arbitrum contract address + USD price via CoinGecko (free,
     keyless) and persist the address on the store item.
  2. Stablecoins: read on-chain ``totalSupply()`` via Alchemy -> ``TotalSupply``.
     RWAs: compute ``sum(totalSupply * priceUsd)`` (an AUM proxy) -> ``TotalValueLocked``.

Writes straight to the configured store (``DB_BACKEND``; ``redis`` in production,
``local`` for offline dev). The frontend reads that store at request/build time,
so there is no build-time export step anymore.

History series (``HistoricalPegData`` / ``HistoricalTvlData``) are intentionally
left empty here: per the current decision, Dune is wired but not active until
saved query IDs are provided. This script does NOT touch them.

Fails soft: missing ``ALCHEMY_API_KEY`` (or no network) still resolves/persists
addresses where possible and reports which metrics could not be filled.

Usage:
    python3 backend/scripts/refresh_live.py                 # all protocols
    python3 backend/scripts/refresh_live.py --only usdc tether
    python3 backend/scripts/refresh_live.py --dry-run       # resolve + report, no writes

Stdlib only.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path
from typing import List, Optional

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.config import get_env, load_env  # noqa: E402
from app.db import get_repository, schema  # noqa: E402
from app.live import alchemy, coingecko  # noqa: E402


def _now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _slug_of(item: dict) -> str:
    return item.get("Slug") or schema.slug_from_sk(item.get(schema.SK, ""))


def refresh_item(item: dict, *, has_alchemy: bool, dry_run: bool) -> dict:
    """Return a per-item result row; mutates ``item`` in place (unless dry-run)."""
    slug = _slug_of(item)
    category = item.get("Category")
    row = {"slug": slug, "category": category, "address": None, "metric": None, "note": ""}

    resolution = coingecko.resolve_for_slug(slug)
    time.sleep(1.5)  # free-tier etiquette

    if resolution is None:
        row["note"] = "no CoinGecko mapping/lookup"
        return row

    address = resolution.get("address")
    decimals = resolution.get("decimals")
    price = resolution.get("priceUsd")
    row["address"] = address

    if not dry_run:
        item["ContractAddress"] = address
        if category == schema.CATEGORY_RWA:
            item["VaultAddresses"] = [address] if address else []

    if not address:
        row["note"] = "resolved coin, but no Arbitrum address"
        return row
    if not has_alchemy:
        row["note"] = "address persisted; ALCHEMY_API_KEY missing (metric skipped)"
        return row

    if category == schema.CATEGORY_STABLECOIN:
        result = alchemy.fetch_total_supply(address, decimals=decimals)
        if not dry_run:
            item["TotalSupply"] = dict(result)
        row["metric"] = result["value"]
        row["note"] = "TotalSupply" if result["value"] is not None else "supply call failed"
    elif category == schema.CATEGORY_RWA:
        holdings = [{"address": address, "decimals": decimals, "priceUsd": price}]
        result = alchemy.fetch_total_value_locked(holdings)
        if not dry_run:
            item["TotalValueLocked"] = dict(result)
        row["metric"] = result["value"]
        row["note"] = "TotalValueLocked" if result["value"] is not None else "TVL calc failed"

    if not dry_run:
        item["UpdatedAt"] = _now_iso()
    return row


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(description="Refresh live Alchemy metrics for staged profiles.")
    parser.add_argument("--only", nargs="*", default=None, help="Limit to these slugs.")
    parser.add_argument("--dry-run", action="store_true", help="Resolve + report, write nothing.")
    # Deprecated no-op: the build-time export was removed (frontend reads the
    # store at runtime). Accepted so existing cron commands keep working.
    parser.add_argument("--no-export", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args(argv[1:])

    load_env()  # backend/.env -> os.environ (no-op if file absent)
    has_alchemy = bool(get_env("ALCHEMY_API_KEY"))

    repo = get_repository()
    items = repo.all()
    if args.only:
        wanted = set(args.only)
        items = [it for it in items if _slug_of(it) in wanted]

    print(f"Backend     : {type(repo).__name__}")
    print(f"Alchemy key : {'present' if has_alchemy else 'MISSING (metrics will be skipped)'}")
    print(f"Mode        : {'DRY-RUN (no writes)' if args.dry_run else 'write'}")
    print(f"Protocols   : {len(items)}")
    print("-" * 78)
    print(f"{'SLUG':<20}{'ADDRESS':<14}{'METRIC':<18}{'NOTE'}")
    print("-" * 78)

    updated = 0
    for item in items:
        row = refresh_item(item, has_alchemy=has_alchemy, dry_run=args.dry_run)
        if not args.dry_run and (row["address"] is not None or row["metric"] is not None):
            repo.put_item(item)
            updated += 1
        addr = (row["address"] or "—")
        addr_short = addr if addr == "—" else f"{addr[:8]}…"
        metric = "—" if row["metric"] is None else f"{row['metric']:,.2f}"
        print(f"{row['slug']:<20}{addr_short:<14}{metric:<18}{row['note']}")

    print("-" * 78)
    print(f"{'Resolved/updated' if not args.dry_run else 'Would update'}: {updated} item(s).")
    print("History (peg/TVL series) left untouched — Dune is wired but not active yet.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
