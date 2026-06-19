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
from app.live import aave, alchemy, coingecko, defillama, rwa_registry  # noqa: E402


def _now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _to_sourced(result: dict) -> dict:
    """Convert a DeFi Llama result dict to the frontend `Sourced<>` shape."""
    return {
        "value": result.get("value"),
        "dataSource": "live",
        "sourceLabel": "DeFi Llama",
        "updatedAt": result.get("updatedAt"),
    }


def _slug_of(item: dict) -> str:
    return item.get("Slug") or schema.slug_from_sk(item.get(schema.SK, ""))


def _find_member_item(items: list, category: str, slug: str) -> Optional[dict]:
    for it in items:
        if it.get("Category") == category and _slug_of(it) == slug:
            return it
    return None


def _member_metric_usd(items: list, ref: dict) -> Optional[float]:
    cat = ref.get("category")
    ref_slug = ref.get("slug")
    if not cat or not ref_slug:
        return None
    member = _find_member_item(items, cat, ref_slug)
    if member is None:
        return None
    if cat == schema.CATEGORY_STABLECOIN:
        ts = member.get("TotalSupply") or {}
        value = ts.get("value")
    elif cat == schema.CATEGORY_RWA:
        hist = member.get("HistoricalTvlData") or {}
        points = hist.get("points") or []
        value = points[-1].get("value") if points else None
        if value is None:
            tvl = member.get("TotalValueLocked") or {}
            value = tvl.get("value")
    elif cat == schema.CATEGORY_TOKEN:
        market = member.get("Market") or {}
        mcap = market.get("marketCapUsd") or {}
        value = mcap.get("value")
    else:
        return None
    if value is not None and value > 0:
        return float(value)
    return None


def _aggregate_entity_tvl(items: list, item: dict) -> Optional[float]:
    total = 0.0
    found = False
    for ref in item.get("MemberCoins") or []:
        value = _member_metric_usd(items, ref)
        if value is not None:
            total += value
            found = True
    return total if found else None


def refresh_item(item: dict, *, has_alchemy: bool, dry_run: bool) -> dict:
    """Return a per-item result row; mutates ``item`` in place (unless dry-run)."""
    slug = _slug_of(item)
    category = item.get("Category")
    row = {"slug": slug, "category": category, "address": None, "metric": None, "note": ""}

    address: Optional[str] = None
    decimals = None
    price = None

    # 1. CoinGecko resolution (only when a coin id is mapped for this slug).
    if coingecko.COINGECKO_IDS.get(slug):
        resolution = coingecko.resolve_for_slug(slug)
        time.sleep(1.5)  # free-tier etiquette
        if resolution is None:
            row["note"] = "CoinGecko lookup failed"
        else:
            address = resolution.get("address")
            decimals = resolution.get("decimals")
            price = resolution.get("priceUsd")

    # 2. RWA registry fallback: most RWA tokens aren't on CoinGecko, so pin their
    #    Arbitrum address/price here. Only used when CoinGecko yielded no address.
    if category == schema.CATEGORY_RWA and not address:
        reg = rwa_registry.rwa_token_for_slug(slug)
        if reg:
            address = reg["address"].lower()
            decimals = reg.get("decimals") if reg.get("decimals") is not None else decimals
            reg_price = 1.0 if reg.get("pegged") else reg.get("priceUsd")
            price = reg_price if reg_price is not None else price

    row["address"] = address

    if not address:
        if not row["note"]:
            row["note"] = (
                "resolved coin, but no Arbitrum address"
                if coingecko.COINGECKO_IDS.get(slug)
                else "no CoinGecko mapping or registry entry"
            )
        return row

    if not dry_run:
        item["ContractAddress"] = address
        if category == schema.CATEGORY_RWA:
            item["VaultAddresses"] = [address]

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

    # --- Aave V3 lending rates (on-chain via Alchemy) ---------------------
    # Mirrors the canonical TS cron (frontend/app/api/cron/refresh): reserve
    # coins get a LendingMarket, aTokens also get a live YieldMechanics, and the
    # Aave entity's headline APR is derived from the GHO supply APY.
    # Runs regardless of has_alchemy: aave.py falls back to a public Arbitrum RPC
    # when no key is set, so live rates still resolve.
    aave_updated = 0
    if aave.has_aave():
        for item in items:
            slug = _slug_of(item)
            category = item.get("Category")
            if slug in aave.AAVE_RESERVES:
                rates = aave.fetch_reserve_rates_for_slug(slug)
                if rates and rates["supplyApyPct"] is not None:
                    if not args.dry_run:
                        item["LendingMarket"] = dict(rates)
                        if slug in aave.ATOKEN_SLUGS:
                            underlying = slug[1:].upper()
                            item["YieldMechanics"] = {
                                "currentApyPct": rates["supplyApyPct"],
                                "feeShareToHoldersPct": 0,
                                "yieldSource": (
                                    f"Aave V3 supply APY on {underlying} "
                                    "(interest paid by borrowers)"
                                ),
                                "isAutoCompounding": True,
                                "emissionsBased": False,
                                "payoutAsset": (
                                    "Accrues continuously into the aToken balance "
                                    "(redeemable for the underlying + interest)"
                                ),
                                "dataSource": "live",
                            }
                        item["UpdatedAt"] = _now_iso()
                        repo.put_item(item)
                    aave_updated += 1
            elif category == schema.CATEGORY_ENTITY and slug == "aave":
                gho = aave.fetch_reserve_rates_for_slug("gho")
                if gho and gho["supplyApyPct"] is not None and not args.dry_run:
                    scale = dict(item.get("CurrentScale") or {})
                    scale["aprPct"] = gho["supplyApyPct"]
                    item["CurrentScale"] = scale
                    labels = dict(item.get("ScaleLabels") or {})
                    labels["apr"] = "GHO supply APY"
                    item["ScaleLabels"] = labels
                    item["UpdatedAt"] = _now_iso()
                    repo.put_item(item)
                    aave_updated += 1
    if aave_updated:
        print(f"Aave rates : refreshed {aave_updated} item(s) (supply/borrow APY).")

    # --- Lending networks: DeFi Llama live protocol TVL --------------------
    # Run before DEX/RWA so a slow DEX volume fetch cannot block lending TVL.
    lending_updated = 0
    for item in items:
        if item.get("Category") != schema.CATEGORY_ENTITY:
            continue
        if item.get("Sector") != "Lending":
            continue
        slug = _slug_of(item)
        if defillama.llama_lending_project_for_slug(slug) is None:
            continue
        tvl = defillama.fetch_protocol_tvl(slug)
        if tvl["value"] is None:
            continue
        if not args.dry_run:
            item["Lending"] = {**(item.get("Lending") or {}), "tvlUsd": _to_sourced(tvl)}
            item["CurrentScale"] = {**(item.get("CurrentScale") or {}), "tvlUsd": tvl["value"]}
            item["UpdatedAt"] = _now_iso()
            repo.put_item(item)
        lending_updated += 1
    if lending_updated:
        print(f"Lending live: refreshed {lending_updated} item(s) (protocol TVL).")

    # --- DEX networks: DeFi Llama live TVL + 30d volume -------------------
    # Mirror of the TS cron DEX pass. Overlays live protocol TVL + volume onto
    # the curated `Dex` block, preserving curated fields. Keyless; fails soft.
    dex_updated = 0
    for item in items:
        if item.get("Category") != schema.CATEGORY_ENTITY:
            continue
        if item.get("Sector") != "DEX":
            continue
        slug = _slug_of(item)
        if defillama.llama_protocol_for_slug(slug) is None:
            continue
        tvl = defillama.fetch_protocol_tvl(slug)
        vol = defillama.fetch_dex_volume(slug)
        live = {}
        if tvl["value"] is not None:
            live["tvlUsd"] = _to_sourced(tvl)
        if vol["value"] is not None:
            live["volume30dUsd"] = _to_sourced(vol)
        if live and not args.dry_run:
            item["Dex"] = {**(item.get("Dex") or {}), **live}
            if tvl["value"] is not None:
                item["CurrentScale"] = {**(item.get("CurrentScale") or {}), "tvlUsd": tvl["value"]}
            item["UpdatedAt"] = _now_iso()
            repo.put_item(item)
            dex_updated += 1
        elif live:
            dex_updated += 1
    if dex_updated:
        print(f"DEX live   : refreshed {dex_updated} item(s) (TVL/volume).")

    # --- RWA networks: DeFi Llama live AUM (protocol TVL) ------------------
    rwa_updated = 0
    for item in items:
        if item.get("Category") != schema.CATEGORY_ENTITY:
            continue
        if item.get("Sector") != "RWA":
            continue
        slug = _slug_of(item)
        if defillama.llama_protocol_for_slug(slug) is None:
            continue
        tvl = defillama.fetch_protocol_tvl(slug)
        if tvl["value"] is None:
            continue
        if not args.dry_run:
            item["Rwa"] = {**(item.get("Rwa") or {}), "aumUsd": _to_sourced(tvl)}
            item["CurrentScale"] = {**(item.get("CurrentScale") or {}), "tvlUsd": tvl["value"]}
            item["UpdatedAt"] = _now_iso()
            repo.put_item(item)
        rwa_updated += 1
    if rwa_updated:
        print(f"RWA live   : refreshed {rwa_updated} item(s) (AUM/TVL).")

    # --- Entity headline TVL aggregation ------------------------------------
    # Mirror of the TS cron tail pass: derive CurrentScale.tvlUsd from member
    # coins when the headline is still null (e.g. Monerium, Pleasing Market).
    # For Stablecoin-sector entities, also persist stablecoin.currentSupplyUsd.
    aggregated = 0
    stablecoin_supply = 0
    for item in items:
        if item.get("Category") != schema.CATEGORY_ENTITY:
            continue
        scale = item.get("CurrentScale") or {}
        if scale.get("tvlUsd") is not None:
            continue
        total = _aggregate_entity_tvl(items, item)
        if total is None:
            continue
        if not args.dry_run:
            item["CurrentScale"] = {**scale, "tvlUsd": total}
            if item.get("Sector") == "Stablecoin":
                stable = dict(item.get("Stablecoin") or {})
                stable["currentSupplyUsd"] = _to_sourced(
                    {"value": total, "updatedAt": _now_iso()}
                )
                item["Stablecoin"] = stable
                stablecoin_supply += 1
            item["UpdatedAt"] = _now_iso()
            repo.put_item(item)
        aggregated += 1
    if aggregated:
        print(f"Entity TVL : aggregated {aggregated} item(s) from member coins.")
    if stablecoin_supply:
        print(f"Stablecoin live: wrote currentSupplyUsd on {stablecoin_supply} issuer(s).")

    print("History (peg/TVL series) left untouched — Dune is wired but not active yet.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
