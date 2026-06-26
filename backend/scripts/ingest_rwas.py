#!/usr/bin/env python3
"""
Phase 2, Step 3 — seed the 10 RWA protocols from the Arbitrum Portal CSV.

Reads `Arbitrum Ecosystem - scrape v2.csv`, extracts the 10 target Real World
Asset protocols, maps each CSV row onto the DynamoDB single-table item shape
(``CATEGORY#RWA`` partition), and publishes it with ``Status = APPROVED``
via the configured repository (LocalAdapter by default — no installs, no cloud).

Live-sourced fields (``TotalValueLocked`` from Alchemy, ``HistoricalTvlData``
from Dune) are intentionally left empty here; they are populated in Step 4.

The CSV only labels every row generically as "Real World Assets (RWAs)", so the
finer ``AssetClass`` is assigned here (the same place stablecoin symbols / peg
targets are assigned for that module).

Run from anywhere:
    python3 backend/scripts/ingest_rwas.py
    python3 backend/scripts/ingest_rwas.py "/path/to/some.csv"

Stdlib only.
"""

from __future__ import annotations

import csv
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Make `app` importable regardless of the current working directory.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.db import get_repository, schema  # noqa: E402

SCRIPTS_ROOT = Path(__file__).resolve().parent
if str(SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_ROOT))
from classification import apply_coin_classification  # noqa: E402

# CSV slug -> (display name, symbol/ticker, asset class). These are the exact
# Phase-2 RWA targets; symbol + asset class are assigned here since the CSV has
# no such columns (it labels every row "Real World Assets (RWAs)").
TARGETS: Dict[str, Tuple[str, str, str]] = {
    "arcton": ("Arcton", "ARC", "Tokenized Equities"),
    "aryze": ("Aryze", "ARYZE", "Stablecoins & FX"),
    "atmosphera": ("Atmosphera", "ATMO", "Event Finance"),
    "centrifuge": ("Centrifuge", "CFG", "Private Credit"),
    "chateau-capital": ("Chateau Capital", "CHAT", "Structured Products"),
    "dinari": ("Dinari", "dSHARE", "Tokenized Equities"),
    "dualmint": ("DualMint", "DMINT", "Multi-Asset"),
    "estate-protocol": ("Estate Protocol", "EST", "Real Estate"),
    "florence-finance": ("Florence Finance", "FLR", "Private Credit"),
    "franklin-templeton": ("Franklin Templeton", "BENJI", "Treasuries & Funds"),
}

# Extra RWA products tied to umbrella entities (slug -> spec).
ENTITY_RWA_COINS: Dict[str, Dict[str, Dict[str, Optional[str]]]] = {
    "pleasing-market": {
        "pgold": {
            "name": "PGOLD",
            "symbol": "PGOLD",
            "assetClass": "Multi-Asset",
            "coingecko": "https://www.coingecko.com/en/coins/pleasing-gold",
            "contractAddress": None,
            "description": (
                "Tokenized physical gold: 1 troy oz LBMA-certified gold per token with "
                "physical redemption. Cross-chain via Chainlink CCIP."
            ),
        },
    },
    "ondo-finance": {
        "ousg": {
            "name": "OUSG",
            "symbol": "OUSG",
            "assetClass": "Treasuries & Funds",
            "coingecko": "https://www.coingecko.com/en/coins/ousg",
            "contractAddress": "0x1b19c19393e2d034d8ff31ff34c81252fcbbee92",
            "description": (
                "Tokenized short-term US Treasury fund interest for eligible investors. "
                "Rule 506(c) / 3(c)(7) qualified access — not a stablecoin."
            ),
        },
        "ondo-gm": {
            "name": "Ondo Global Markets",
            "symbol": "GM",
            "assetClass": "Tokenized Equities",
            "coingecko": None,
            "contractAddress": None,
            "description": (
                "Ondo Global Markets tokenizes US stocks and ETFs (e.g. TSLA, SPY, QQQ, "
                "NVDA) 1:1 against shares custodied with a registered broker-dealer. Each "
                "token tracks its underlying's price for 24/7 on-chain trading and DeFi "
                "composability under Reg S / Rule 506(c) access; the platform surpassed "
                "$1B in assets shortly after launch."
            ),
        },
    },
    "franklin-templeton": {
        "benji": {
            "name": "BENJI",
            "symbol": "BENJI",
            "assetClass": "Treasuries & Funds",
            "coingecko": "https://www.coingecko.com/en/coins/franklin-templeton-benji",
            "contractAddress": "0xb9e4765bce2609bc1949592059b17ea72fee6c6a",
            "description": (
                "On-chain share of FOBXX (Franklin OnChain U.S. Government Money Fund). "
                "SEC-registered '40 Act mutual fund; $1.00 NAV on Arbitrum One."
            ),
        },
    },
    "stably": {
        "stably-gold": {
            "name": "Stably Gold",
            "symbol": "XAUs",
            "assetClass": "Multi-Asset",
            "coingecko": None,
            "contractAddress": None,
            "description": (
                "Planned tokenized-gold product on Stably's stablecoin-as-a-service "
                "roadmap, intended to represent allocated physical gold. Forward-looking "
                "and not yet independently confirmed as live — treat as conceptual."
            ),
        },
    },
}

DEFAULT_CSV = BACKEND_ROOT / "data" / "Arbitrum Ecosystem - scrape v2.csv"
DOWNLOADS_CSV = Path.home() / "Downloads" / "Arbitrum Ecosystem - scrape v2.csv"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _clean(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    v = value.strip()
    return v or None


def _as_bool(value: Optional[str]) -> bool:
    return (value or "").strip().upper() == "TRUE"


def _split_chains(value: Optional[str]) -> List[str]:
    if not value:
        return []
    return [c.strip() for c in value.split("|") if c.strip()]


def resolve_csv_path(argv: List[str]) -> Path:
    if len(argv) > 1 and argv[1].strip():
        return Path(argv[1]).expanduser()
    if DEFAULT_CSV.exists():
        return DEFAULT_CSV
    if DOWNLOADS_CSV.exists():
        return DOWNLOADS_CSV
    return DEFAULT_CSV  # let the caller surface a clear "not found" error


def row_to_item(row: Dict[str, str], created_at: str) -> dict:
    """Map one CSV row onto a single-table item (Status=APPROVED)."""
    slug = (row.get("Slug") or "").strip()
    name, symbol, asset_class = TARGETS[slug]
    now = _now_iso()

    return {
        schema.PK: schema.category_pk(schema.CATEGORY_RWA),
        schema.SK: schema.protocol_sk(slug),
        "Category": schema.CATEGORY_RWA,
        "Status": schema.STATUS_APPROVED,
        "Name": name,
        "Slug": slug,
        "Symbol": symbol,
        "AssetClass": asset_class,
        "Description": _clean(row.get("Description")) or "",
        "Website": _clean(row.get("Website")),
        "Twitter": _clean(row.get("Twitter")),
        "Discord": _clean(row.get("Discord")),
        "GitHub": _clean(row.get("GitHub")),
        "CoinGecko": _clean(row.get("CoinGecko")),
        "AuditURL": _clean(row.get("Audit URL")),
        # Live overlays — populated in Step 4 (Alchemy / Dune).
        "TotalValueLocked": {"value": None, "source": "alchemy", "updatedAt": None},
        "HistoricalTvlData": {"points": [], "source": "dune", "updatedAt": None},
        "ArbitrumPortalMetadata": {
            "portalUrl": _clean(row.get("Portal URL")),
            "logoUrl": _clean(row.get("Logo URL")),
            "bannerUrl": _clean(row.get("Banner URL")),
            "chains": _split_chains(row.get("Chains")),
            "subCategory": _clean(row.get("Sub-category")),
            "isLive": _as_bool(row.get("Is Live")),
            "isArbitrumNative": _as_bool(row.get("Is Arbitrum Native")),
            "isPubliclyAudited": _as_bool(row.get("Is Publicly Audited")),
            "foundedDate": _clean(row.get("Founded Date")),
        },
        "CreatedAt": created_at,
        "UpdatedAt": now,
    }


def entity_rwa_item(
    slug: str,
    spec: Dict[str, Optional[str]],
    entity_slug: str,
    parent_row: Optional[Dict[str, str]],
    created_at: str,
    *,
    chains: Optional[List[str]] = None,
    website: Optional[str] = None,
    twitter: Optional[str] = None,
    discord: Optional[str] = None,
    github: Optional[str] = None,
) -> dict:
    """Build an RWA item for an umbrella entity (Pleasing Market, Ondo, etc.)."""
    row = parent_row or {}
    now = _now_iso()
    return {
        schema.PK: schema.category_pk(schema.CATEGORY_RWA),
        schema.SK: schema.protocol_sk(slug),
        "Category": schema.CATEGORY_RWA,
        "Status": schema.STATUS_APPROVED,
        "Name": spec["name"],
        "Slug": slug,
        "Symbol": spec["symbol"],
        "AssetClass": spec.get("assetClass") or "Multi-Asset",
        "Description": spec.get("description") or "",
        "Website": website or _clean(row.get("Website")),
        "Twitter": twitter or _clean(row.get("Twitter")),
        "Discord": discord or _clean(row.get("Discord")),
        "GitHub": github or _clean(row.get("GitHub")),
        "CoinGecko": spec.get("coingecko"),
        "AuditURL": _clean(row.get("Audit URL")),
        "ContractAddress": spec.get("contractAddress"),
        "EntitySlug": entity_slug,
        "TotalValueLocked": {"value": None, "source": "alchemy", "updatedAt": None},
        "HistoricalTvlData": {"points": [], "source": "dune", "updatedAt": None},
        "ArbitrumPortalMetadata": {
            "portalUrl": _clean(row.get("Portal URL")),
            "logoUrl": _clean(row.get("Logo URL")),
            "bannerUrl": _clean(row.get("Banner URL")),
            "chains": chains or _split_chains(row.get("Chains")),
            "subCategory": spec.get("assetClass") or "RWA",
            "isLive": _as_bool(row.get("Is Live")) or bool(chains),
            "isArbitrumNative": _as_bool(row.get("Is Arbitrum Native")),
            "isPubliclyAudited": _as_bool(row.get("Is Publicly Audited")),
            "foundedDate": _clean(row.get("Founded Date")),
        },
        "CreatedAt": created_at,
        "UpdatedAt": now,
    }


def main(argv: List[str]) -> int:
    csv_path = resolve_csv_path(argv)
    if not csv_path.exists():
        print(f"ERROR: CSV not found at {csv_path}", file=sys.stderr)
        print(
            "Pass a path explicitly: python3 backend/scripts/ingest_rwas.py "
            '"/path/to/Arbitrum Ecosystem - scrape v2.csv"',
            file=sys.stderr,
        )
        return 1

    repo = get_repository()
    pk = schema.category_pk(schema.CATEGORY_RWA)

    entity_slugs = {
        (it.get("Slug") or schema.slug_from_sk(it.get(schema.SK, "")))
        for it in repo.all()
        if it.get("Category") == schema.CATEGORY_ENTITY
    }

    # Remove legacy RWA rows superseded by promoted Entity profiles.
    deleted: List[str] = []
    for slug in sorted(entity_slugs):
        if slug in TARGETS and repo.delete_item(pk, schema.protocol_sk(slug)):
            deleted.append(slug)
    if deleted:
        print(f"Removed {len(deleted)} promoted-entity RWA duplicate(s): {', '.join(deleted)}")

    # Collect matching rows by slug (CSV is the source of truth).
    matched: Dict[str, Dict[str, str]] = {}
    with csv_path.open("r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            slug = (row.get("Slug") or "").strip()
            if slug in TARGETS and slug not in matched:
                matched[slug] = row

    staged: List[str] = []
    for slug in TARGETS:
        if slug in entity_slugs:
            continue
        row = matched.get(slug)
        if row is None:
            continue
        # Idempotent: preserve original CreatedAt on re-ingest.
        existing = repo.get_item(pk, schema.protocol_sk(slug))
        created_at = (existing or {}).get("CreatedAt") or _now_iso()
        item = row_to_item(row, created_at)
        repo.put_item(apply_coin_classification(item))
        staged.append(slug)

    # Entity-linked RWA products (PGOLD, OUSG, etc.).
    entity_staged: List[str] = []
    entity_rows: Dict[str, Dict[str, str]] = {}
    with csv_path.open("r", encoding="utf-8", newline="") as fh:
        for row in csv.DictReader(fh):
            slug = (row.get("Slug") or "").strip()
            if slug in ENTITY_RWA_COINS and slug not in entity_rows:
                entity_rows[slug] = row

    entity_defaults: Dict[str, Dict[str, object]] = {
        "ondo-finance": {
            "website": "https://ondo.finance",
            "twitter": "https://x.com/OndoFinance",
            "github": "https://github.com/ondo-finance",
            "chains": ["Arbitrum One", "Ethereum"],
        },
        "stably": {
            "website": "https://stably.io",
            "twitter": "https://x.com/StablyHQ",
        },
        "franklin-templeton": {
            "website": "https://www.franklintempleton.com",
            "twitter": "https://x.com/FTI_US",
            "chains": ["Arbitrum One", "Ethereum", "Polygon", "Base"],
        },
    }

    for entity_slug, coins in ENTITY_RWA_COINS.items():
        parent_row = entity_rows.get(entity_slug)
        defaults = entity_defaults.get(entity_slug, {})
        for slug, spec in coins.items():
            existing = repo.get_item(pk, schema.protocol_sk(slug))
            created_at = (existing or {}).get("CreatedAt") or _now_iso()
            row = parent_row or {}
            repo.put_item(
                apply_coin_classification(
                    entity_rwa_item(
                        slug,
                        spec,
                        entity_slug,
                        row,
                        created_at,
                        chains=defaults.get("chains") or None,
                        website=defaults.get("website") or _clean(row.get("Website")),
                        twitter=defaults.get("twitter") or _clean(row.get("Twitter")),
                        discord=_clean(row.get("Discord")),
                        github=defaults.get("github") or _clean(row.get("GitHub")),
                    )
                )
            )
            entity_staged.append(slug)

    # --- Report ------------------------------------------------------------
    print(f"Source CSV : {csv_path}")
    print(f"Backend    : {type(repo).__name__}")
    print(f"Partition  : {pk}")
    print("-" * 72)
    print(f"{'STATUS':<18}{'ASSET CLASS':<22}{'NAME'}")
    print("-" * 72)
    for slug in TARGETS:
        if slug in staged:
            name, _, asset_class = TARGETS[slug]
            print(f"{schema.STATUS_PENDING:<18}{asset_class:<22}{name}")
    for slug in entity_staged:
        for entity_slug, coins in ENTITY_RWA_COINS.items():
            if slug in coins:
                spec = coins[slug]
                print(
                    f"{schema.STATUS_PENDING:<18}{spec.get('assetClass', 'RWA'):<22}"
                    f"{spec['name']} ({entity_slug})"
                )
                break
    print("-" * 72)
    entity_count = sum(len(c) for c in ENTITY_RWA_COINS.values())
    print(
        f"Published {len(staged)} / {len(TARGETS)} target RWA protocols "
        f"+ {len(entity_staged)} entity RWA products as APPROVED."
    )

    missing = [s for s in TARGETS if s not in staged and s not in entity_slugs]
    if missing:
        print(f"WARNING: missing from CSV: {', '.join(missing)}", file=sys.stderr)
        return 2

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
