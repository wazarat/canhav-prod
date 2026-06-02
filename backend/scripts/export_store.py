#!/usr/bin/env python3
"""
Step 4, Goal B1 — bridge the backend store into the frontend (build-time export).

Reads every item from the configured repository (LocalAdapter by default), maps
the DynamoDB-shaped PascalCase items onto the camelCase frontend contract in
``frontend/lib/types.ts`` (the inverse of the old mock files), splits them by
category, and writes:

    frontend/lib/generated/stablecoins.json
    frontend/lib/generated/rwas.json

``frontend/lib/data.ts`` imports these JSON files and filters by ``Status`` —
the approval gate is unchanged, only the *source* moves from hardcoded mocks to
the real store. Re-run this after every approval (it also runs automatically via
the frontend ``predev`` / ``prebuild`` npm scripts).

The nested objects in the store (``ArbitrumPortalMetadata``, ``TotalSupply`` /
``TotalValueLocked``, ``HistoricalPegData`` / ``HistoricalTvlData``) are already
stored with the camelCase keys the frontend expects, so only the top-level
attribute names are renamed here.

Stdlib only — no pydantic, no installs.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Dict, List

# Make `app` importable regardless of the current working directory.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.db import get_repository, schema  # noqa: E402

REPO_ROOT = BACKEND_ROOT.parent
GENERATED_DIR = REPO_ROOT / "frontend" / "lib" / "generated"

# Default live-field shapes (used when an item somehow lacks them).
_DEFAULT_TOTAL = {"value": None, "source": "alchemy", "updatedAt": None}
_DEFAULT_PORTAL = {
    "portalUrl": None,
    "logoUrl": None,
    "bannerUrl": None,
    "chains": [],
    "subCategory": None,
    "isLive": False,
    "isArbitrumNative": False,
    "isPubliclyAudited": False,
    "foundedDate": None,
}


def _common_fields(item: dict) -> dict:
    """Top-level fields shared by every category profile (camelCased)."""
    return {
        "slug": item.get("Slug") or schema.slug_from_sk(item.get(schema.SK, "")),
        "name": item.get("Name", ""),
        "symbol": item.get("Symbol", ""),
        "status": item.get("Status", schema.STATUS_PENDING),
        "description": item.get("Description") or "",
        "website": item.get("Website"),
        "twitter": item.get("Twitter"),
        "discord": item.get("Discord"),
        "github": item.get("GitHub"),
        "coingecko": item.get("CoinGecko"),
        "auditUrl": item.get("AuditURL"),
        "contractAddress": item.get("ContractAddress"),
        "arbitrumPortalMetadata": item.get("ArbitrumPortalMetadata") or dict(_DEFAULT_PORTAL),
        "createdAt": item.get("CreatedAt") or "",
        "updatedAt": item.get("UpdatedAt") or "",
    }


def stablecoin_from_item(item: dict) -> dict:
    profile = {"category": "Stablecoin", **_common_fields(item)}
    profile["pegTarget"] = item.get("PegTarget", schema.PEG_USD)
    profile["totalSupply"] = item.get("TotalSupply") or dict(_DEFAULT_TOTAL)
    profile["historicalPegData"] = item.get("HistoricalPegData") or {
        "points": [],
        "source": "dune",
        "updatedAt": None,
    }
    return profile


def rwa_from_item(item: dict) -> dict:
    profile = {"category": "RWA", **_common_fields(item)}
    profile["assetClass"] = item.get("AssetClass", "Multi-Asset")
    profile["vaultAddresses"] = item.get("VaultAddresses")
    profile["totalValueLocked"] = item.get("TotalValueLocked") or dict(_DEFAULT_TOTAL)
    profile["historicalTvlData"] = item.get("HistoricalTvlData") or {
        "points": [],
        "source": "dune",
        "updatedAt": None,
    }
    return profile


def _write_json(path: Path, payload: List[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, ensure_ascii=False, sort_keys=True)
        fh.write("\n")


def main() -> int:
    repo = get_repository()
    items = repo.all()

    stablecoins: List[dict] = []
    rwas: List[dict] = []
    skipped: List[str] = []

    for item in items:
        category = item.get("Category")
        if category == schema.CATEGORY_STABLECOIN:
            stablecoins.append(stablecoin_from_item(item))
        elif category == schema.CATEGORY_RWA:
            rwas.append(rwa_from_item(item))
        else:
            skipped.append(f"{category}/{item.get(schema.SK, '?')}")

    stablecoins.sort(key=lambda p: p["name"].lower())
    rwas.sort(key=lambda p: p["name"].lower())

    sc_path = GENERATED_DIR / "stablecoins.json"
    rwa_path = GENERATED_DIR / "rwas.json"
    _write_json(sc_path, stablecoins)
    _write_json(rwa_path, rwas)

    def _summary(profiles: List[dict]) -> str:
        approved = sum(1 for p in profiles if p["status"] == schema.STATUS_APPROVED)
        return f"{len(profiles)} total / {approved} approved"

    print(f"Backend : {type(repo).__name__}")
    print(f"Output  : {GENERATED_DIR}")
    print("-" * 72)
    print(f"Stablecoins -> {sc_path.name:<20} ({_summary(stablecoins)})")
    print(f"RWAs        -> {rwa_path.name:<20} ({_summary(rwas)})")
    print("-" * 72)
    if skipped:
        print(f"WARNING: skipped {len(skipped)} item(s) of unknown category:", file=sys.stderr)
        for s in skipped:
            print(f"  - {s}", file=sys.stderr)
    print("Exported. The frontend now reads real store data (set IS_MOCK_DATA=false).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
