#!/usr/bin/env python3
"""
Step 3 — seed the 10 Phase-1 stablecoins from the Arbitrum Portal CSV.

Reads `Arbitrum Ecosystem - scrape v2.csv`, extracts the 10 target stablecoins,
maps each CSV row onto the DynamoDB single-table item shape, and stages it with
``Status = APPROVED`` via the configured repository (LocalAdapter by
default — no installs, no cloud).

Live-sourced fields (``TotalSupply`` from Alchemy, ``HistoricalPegData`` from
Dune) are intentionally left empty here; they are populated in Step 4.

Run from anywhere:
    python3 backend/scripts/ingest_stablecoins.py
    python3 backend/scripts/ingest_stablecoins.py "/path/to/some.csv"

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

# CSV slug -> (display name, symbol, peg target). These are the exact Phase-1
# targets; symbols/peg targets are added here since the CSV has no such columns.
#
# Note: the legacy combined "usd-ai" stablecoin is superseded by the two USD.AI
# coins below (USDai + sUSDai), which are part of the USD.AI Entity. The old
# "usd-ai" stablecoin item is deleted on run.
TARGETS: Dict[str, Tuple[str, str, str]] = {
    "ethena": ("Ethena (USDe)", "USDe", schema.PEG_USD),
    "inverse-finance": ("Inverse Finance", "DOLA", schema.PEG_USD),
    "monerium": ("Monerium", "EURe", schema.PEG_EUR),
    "sky": ("Sky (USDS)", "USDS", schema.PEG_USD),
    "stably": ("Stably", "USDS.s", schema.PEG_USD),
    "tether": ("Tether (USDT)", "USDT", schema.PEG_USD),
    "trueusd": ("TrueUSD", "TUSD", schema.PEG_USD),
    "usdc": ("USDC", "USDC", schema.PEG_USD),
    "usdt0": ("USDT0", "USDT0", schema.PEG_USD),
}

# USD.AI's two synthetic-dollar coins. They have no dedicated CSV row, so they
# are derived from the existing "usd-ai" Portal row (shared website / portal
# metadata) but get distinct slug / name / symbol / CoinGecko / contract and are
# tagged with EntitySlug="usd-ai" so they list under the USD.AI Entity. Addresses
# + CoinGecko ids verified via CoinGecko (detail_platforms["arbitrum-one"]).
USD_AI_PARENT_SLUG = "usd-ai"
JUPITER_PARENT_SLUG = "jupiter"

USD_AI_COINS: Dict[str, Dict[str, str]] = {
    "usdai": {
        "name": "USDai",
        "symbol": "USDAI",
        "subCategory": "Stablecoin",
        "coingecko": "https://www.coingecko.com/en/coins/usdai",
        "contractAddress": "0x0a1a1a107e45b7ced86833863f482bc5f4ed82ef",
    },
    "susdai": {
        "name": "sUSDai",
        "symbol": "sUSDai",
        "subCategory": "Staked Stablecoin",
        "coingecko": "https://www.coingecko.com/en/coins/susdai",
        "contractAddress": "0x0b2b2b2076d95dda7817e785989fe353fe955ef9",
    },
}

# Jupiter stablecoins (Solana SPL). No CSV row; curated metadata + Solana mints.
JUPITER_COINS: Dict[str, Dict[str, str]] = {
    "jupusd": {
        "name": "JupUSD",
        "symbol": "JUPUSD",
        "subCategory": "Stablecoin",
        "coingecko": "https://www.coingecko.com/en/coins/jupusd",
        "contractAddress": "JuprjznTrTSp2UFa3ZBUFgwdAmtZCq4MQCwysN55USD",
        "description": (
            "Reserve-backed Solana stablecoin built with Ethena: ~90% USDtb "
            "(BlackRock BUIDL-backed) + 10% USDC buffer. Does not yield natively "
            "(compliance). Custody via Anchorage Digital and Porto."
        ),
    },
    "jljupusd": {
        "name": "jlJupUSD",
        "symbol": "jlJUPUSD",
        "subCategory": "Staked Stablecoin",
        "coingecko": None,
        "contractAddress": None,
        "description": (
            "Deposit JupUSD into Jupiter Lend Earn to receive jlJupUSD, which earns "
            "interest and incentives while staying liquid and usable as collateral. "
            "The yield-bearing counterpart to plain JupUSD."
        ),
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
    name, symbol, peg = TARGETS[slug]
    now = _now_iso()

    return {
        schema.PK: schema.category_pk(schema.CATEGORY_STABLECOIN),
        schema.SK: schema.protocol_sk(slug),
        "Category": schema.CATEGORY_STABLECOIN,
        "Status": schema.STATUS_APPROVED,
        "Name": name,
        "Slug": slug,
        "Symbol": symbol,
        "PegTarget": peg,
        "Description": _clean(row.get("Description")) or "",
        "Website": _clean(row.get("Website")),
        "Twitter": _clean(row.get("Twitter")),
        "Discord": _clean(row.get("Discord")),
        "GitHub": _clean(row.get("GitHub")),
        "CoinGecko": _clean(row.get("CoinGecko")),
        "AuditURL": _clean(row.get("Audit URL")),
        "ContractAddress": None,
        "SubCategory": None,
        "EntitySlug": None,
        # Live overlays — populated in Step 4 (Alchemy / Dune).
        "TotalSupply": {"value": None, "source": "alchemy", "updatedAt": None},
        "HistoricalPegData": {"points": [], "source": "dune", "updatedAt": None},
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


def entity_coin_item(
    slug: str,
    spec: Dict[str, str],
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
    """Build a stablecoin item for an umbrella entity (USD.AI or Jupiter)."""
    item = row_to_item_generic(parent_row or {}, created_at)
    item[schema.SK] = schema.protocol_sk(slug)
    item["Name"] = spec["name"]
    item["Slug"] = slug
    item["Symbol"] = spec["symbol"]
    item["SubCategory"] = spec.get("subCategory")
    item["Description"] = spec.get("description") or item["Description"]
    item["CoinGecko"] = spec.get("coingecko")
    item["ContractAddress"] = spec.get("contractAddress")
    item["EntitySlug"] = entity_slug
    if website:
        item["Website"] = website
    if twitter:
        item["Twitter"] = twitter
    if discord:
        item["Discord"] = discord
    if github:
        item["GitHub"] = github
    if chains:
        item["ArbitrumPortalMetadata"]["chains"] = chains
    return item


def row_to_item_generic(row: Dict[str, str], created_at: str) -> dict:
    """Like row_to_item but without the TARGETS name/symbol/peg lookup."""
    now = _now_iso()
    return {
        schema.PK: schema.category_pk(schema.CATEGORY_STABLECOIN),
        schema.SK: schema.protocol_sk((row.get("Slug") or "").strip()),
        "Category": schema.CATEGORY_STABLECOIN,
        "Status": schema.STATUS_APPROVED,
        "Name": _clean(row.get("Name")) or "",
        "Slug": (row.get("Slug") or "").strip(),
        "Symbol": "",
        "PegTarget": schema.PEG_USD,
        "Description": _clean(row.get("Description")) or "",
        "Website": _clean(row.get("Website")),
        "Twitter": _clean(row.get("Twitter")),
        "Discord": _clean(row.get("Discord")),
        "GitHub": _clean(row.get("GitHub")),
        "CoinGecko": _clean(row.get("CoinGecko")),
        "AuditURL": _clean(row.get("Audit URL")),
        "ContractAddress": None,
        "SubCategory": None,
        "EntitySlug": None,
        "TotalSupply": {"value": None, "source": "alchemy", "updatedAt": None},
        "HistoricalPegData": {"points": [], "source": "dune", "updatedAt": None},
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


def main(argv: List[str]) -> int:
    csv_path = resolve_csv_path(argv)
    if not csv_path.exists():
        print(f"ERROR: CSV not found at {csv_path}", file=sys.stderr)
        print(
            "Pass a path explicitly: python3 backend/scripts/ingest_stablecoins.py "
            '"/path/to/Arbitrum Ecosystem - scrape v2.csv"',
            file=sys.stderr,
        )
        return 1

    repo = get_repository()
    pk = schema.category_pk(schema.CATEGORY_STABLECOIN)

    # Collect matching rows by slug (CSV is the source of truth). The legacy
    # "usd-ai" row is captured to source the two USD.AI coins below.
    matched: Dict[str, Dict[str, str]] = {}
    usd_ai_row: Optional[Dict[str, str]] = None
    with csv_path.open("r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            slug = (row.get("Slug") or "").strip()
            if slug in TARGETS and slug not in matched:
                matched[slug] = row
            if slug == USD_AI_PARENT_SLUG and usd_ai_row is None:
                usd_ai_row = row

    staged: List[str] = []
    for slug in TARGETS:
        row = matched.get(slug)
        if row is None:
            continue
        # Idempotent: preserve original CreatedAt on re-ingest.
        existing = repo.get_item(pk, schema.protocol_sk(slug))
        created_at = (existing or {}).get("CreatedAt") or _now_iso()
        item = row_to_item(row, created_at)
        repo.put_item(item)
        staged.append(slug)

    # USD.AI coins (USDai + sUSDai), derived from the shared "usd-ai" row.
    usd_ai_staged: List[str] = []
    if usd_ai_row is not None:
        for slug in USD_AI_COINS:
            existing = repo.get_item(pk, schema.protocol_sk(slug))
            created_at = (existing or {}).get("CreatedAt") or _now_iso()
            repo.put_item(
                entity_coin_item(slug, USD_AI_COINS[slug], USD_AI_PARENT_SLUG, usd_ai_row, created_at)
            )
            usd_ai_staged.append(slug)
    else:
        print(
            f"WARNING: no '{USD_AI_PARENT_SLUG}' row in CSV; "
            "USDai / sUSDai not staged.",
            file=sys.stderr,
        )

    # Jupiter stablecoins (JupUSD + jlJupUSD).
    jupiter_staged: List[str] = []
    for slug in JUPITER_COINS:
        existing = repo.get_item(pk, schema.protocol_sk(slug))
        created_at = (existing or {}).get("CreatedAt") or _now_iso()
        repo.put_item(
            entity_coin_item(
                slug,
                JUPITER_COINS[slug],
                JUPITER_PARENT_SLUG,
                None,
                created_at,
                chains=["Solana"],
                website="https://jup.ag",
                twitter="https://x.com/JupiterExchange",
                discord="https://discord.gg/jup",
                github="https://github.com/jup-ag",
            )
        )
        jupiter_staged.append(slug)

    # Drop the legacy combined "usd-ai" stablecoin (superseded by the two coins).
    removed_legacy = repo.delete_item(pk, schema.protocol_sk(USD_AI_PARENT_SLUG))

    # --- Report ------------------------------------------------------------
    print(f"Source CSV : {csv_path}")
    print(f"Backend    : {type(repo).__name__}")
    print(f"Partition  : {pk}")
    print("-" * 64)
    print(f"{'STATUS':<18}{'SYMBOL':<10}{'NAME'}")
    print("-" * 64)
    for slug in TARGETS:
        if slug in staged:
            name, symbol, _ = TARGETS[slug]
            print(f"{schema.STATUS_PENDING:<18}{symbol:<10}{name}")
    for slug in usd_ai_staged:
        spec = USD_AI_COINS[slug]
        print(f"{schema.STATUS_PENDING:<18}{spec['symbol']:<10}{spec['name']} (USD.AI)")
    for slug in jupiter_staged:
        spec = JUPITER_COINS[slug]
        print(f"{schema.STATUS_PENDING:<18}{spec['symbol']:<10}{spec['name']} (Jupiter)")
    print("-" * 64)
    total_staged = len(staged) + len(usd_ai_staged) + len(jupiter_staged)
    total_targets = len(TARGETS) + len(USD_AI_COINS) + len(JUPITER_COINS)
    print(f"Published {total_staged} / {total_targets} target stablecoins as APPROVED.")
    if removed_legacy:
        print(f"Removed legacy '{USD_AI_PARENT_SLUG}' stablecoin (superseded by USDai + sUSDai).")

    missing = [s for s in TARGETS if s not in staged]
    if missing:
        print(f"WARNING: missing from CSV: {', '.join(missing)}", file=sys.stderr)
        return 2

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
