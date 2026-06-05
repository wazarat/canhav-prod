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

# Umbrella entities whose primary CSV stablecoin row doubles as a member product.
ENTITY_PARENT_SLUGS = frozenset({"ethena", "sky", "monerium", "stably", "trueusd"})

# Field patches applied to CSV-derived parent stablecoins when seeding entities.
ENTITY_PARENT_PATCHES: Dict[str, Dict[str, str]] = {
    "ethena": {
        "name": "USDe",
        "subCategory": "Stablecoin",
        "description": (
            "Synthetic dollar pegged via delta-hedging BTC/ETH spot plus perp shorts "
            "and liquid stables. Not fiat-backed. Mint/redeem KYC-gated to market makers."
        ),
    },
    "sky": {
        "name": "USDS",
        "subCategory": "Stablecoin",
        "description": (
            "Primary Sky dollar (DAI successor). ERC-20 with 1:1 USDC swap and base "
            "for sUSDS yield wrapper."
        ),
    },
    "monerium": {
        "name": "EURe",
        "subCategory": "Stablecoin",
        "description": (
            "Regulated euro e-money issued by Monerium hf. Redeemable at par via "
            "Web3 IBAN and banking rails."
        ),
    },
    "stably": {
        "name": "Stably USD",
        "subCategory": "Stablecoin",
        "description": (
            "Stablecoin-as-a-service dollar from Stably, distinct from Sky USDS."
        ),
    },
    "trueusd": {
        "name": "TUSD",
        "subCategory": "Stablecoin",
        "description": (
            "Fiat-backed USD stablecoin with daily attestations and Chainlink Proof "
            "of Reserve. No native yield."
        ),
        "contractAddress": "0x4d15a3a2286d883af0aa1b3f21367843fac63e07",
    },
}

# Extra stablecoin products per umbrella entity (slug -> spec).
BATCH_ENTITY_COINS: Dict[str, Dict[str, Dict[str, str]]] = {
    "ethena": {
        "susde": {
            "name": "sUSDe",
            "symbol": "sUSDe",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Staked Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/ethena-staked-usde",
            "contractAddress": "0x9d39a5de30e57443bff2a8307a4256c8797a3497",
            "description": (
                "Staked USDe receipt token accruing protocol revenue. Savings asset, "
                "not a separate pegged stablecoin."
            ),
        },
        "usdtb": {
            "name": "USDtb",
            "symbol": "USDtb",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": None,
            "contractAddress": None,
            "description": (
                "Treasury-backed dollar distinct from synthetic USDe, backed by "
                "short-term Treasuries / BUIDL exposure."
            ),
        },
    },
    "sky": {
        "susds": {
            "name": "sUSDS",
            "symbol": "sUSDS",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Staked Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/susds",
            "contractAddress": None,
            "description": (
                "Yield-bearing USDS via Sky Savings Rate. Non-custodial wrapper with "
                "compounding exchange rate."
            ),
        },
        "dai": {
            "name": "DAI",
            "symbol": "DAI",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/dai",
            "contractAddress": None,
            "description": "Legacy Maker collateral-minted stablecoin.",
        },
        "stusds": {
            "name": "stUSDS",
            "symbol": "stUSDS",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Staked Stablecoin",
            "coingecko": None,
            "contractAddress": None,
            "description": (
                "Expert-user yield from SKY-backed borrowing with dynamic "
                "utilization-based returns."
            ),
        },
    },
    "monerium": {
        "gbpe": {
            "name": "GBPe",
            "symbol": "GBPe",
            "pegTarget": schema.PEG_GBP,
            "subCategory": "Stablecoin",
            "coingecko": None,
            "contractAddress": None,
            "description": "Regulated pound e-money from Monerium hf.",
        },
    },
    "pleasing-market": {
        "usdpm": {
            "name": "USDpm",
            "symbol": "USDpm",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": None,
            "contractAddress": None,
            "description": (
                "Synthetic USD stablecoin connecting on-chain liquidity to the Pleasing "
                "gold ecosystem. Peg model and custody unverified — confirm from official docs."
            ),
        },
    },
    "aave": {
        "gho": {
            "name": "GHO",
            "symbol": "GHO",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/gho",
            "contractAddress": None,
            "description": (
                "Native Aave overcollateralized stablecoin minted by locking approved "
                "collateral via Aave lending markets."
            ),
        },
        "sgho": {
            "name": "sGHO",
            "symbol": "sGHO",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Staked Stablecoin",
            "coingecko": None,
            "contractAddress": None,
            "description": (
                "GHO savings product — yield-bearing wrapper, not the stablecoin itself. "
                "New sGHO experience live May 2026; legacy savings rebranded StkGHO."
            ),
        },
    },
    "stably": {
        "veusd": {
            "name": "VeUSD",
            "symbol": "VeUSD",
            "pegTarget": schema.PEG_USD,
            "subCategory": "Stablecoin",
            "coingecko": "https://www.coingecko.com/en/coins/veusd",
            "contractAddress": None,
            "description": (
                "VeChain USD stablecoin developed by Stably, issued by Prime Trust."
            ),
        },
    },
}

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
    """Build a stablecoin item for an umbrella entity (USD.AI, Jupiter, batch issuers)."""
    item = row_to_item_generic(parent_row or {}, created_at)
    item[schema.SK] = schema.protocol_sk(slug)
    item["Name"] = spec["name"]
    item["Slug"] = slug
    item["Symbol"] = spec["symbol"]
    if spec.get("pegTarget"):
        item["PegTarget"] = spec["pegTarget"]
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
    all_csv_rows: Dict[str, Dict[str, str]] = {}
    usd_ai_row: Optional[Dict[str, str]] = None
    with csv_path.open("r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            slug = (row.get("Slug") or "").strip()
            if slug and slug not in all_csv_rows:
                all_csv_rows[slug] = row
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
        if slug in ENTITY_PARENT_SLUGS:
            item["EntitySlug"] = slug
            patch = ENTITY_PARENT_PATCHES.get(slug, {})
            if patch.get("name"):
                item["Name"] = patch["name"]
            if patch.get("subCategory"):
                item["SubCategory"] = patch["subCategory"]
            if patch.get("description"):
                item["Description"] = patch["description"]
            if patch.get("contractAddress"):
                item["ContractAddress"] = patch["contractAddress"]
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

    # Batch entity extra stablecoins (Ethena, Sky, Monerium, Stably).
    batch_staged: List[str] = []
    for entity_slug, coins in BATCH_ENTITY_COINS.items():
        parent_row = matched.get(entity_slug) or all_csv_rows.get(entity_slug)
        for slug, spec in coins.items():
            existing = repo.get_item(pk, schema.protocol_sk(slug))
            created_at = (existing or {}).get("CreatedAt") or _now_iso()
            row = parent_row or {}
            repo.put_item(
                entity_coin_item(
                    slug,
                    spec,
                    entity_slug,
                    row,
                    created_at,
                    website=_clean(row.get("Website")),
                    twitter=_clean(row.get("Twitter")),
                    discord=_clean(row.get("Discord")),
                    github=_clean(row.get("GitHub")),
                )
            )
            batch_staged.append(slug)

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
    for slug in batch_staged:
        for entity_slug, coins in BATCH_ENTITY_COINS.items():
            if slug in coins:
                spec = coins[slug]
                print(
                    f"{schema.STATUS_PENDING:<18}{spec['symbol']:<10}"
                    f"{spec['name']} ({entity_slug})"
                )
                break
    print("-" * 64)
    batch_count = sum(len(c) for c in BATCH_ENTITY_COINS.values())
    total_staged = len(staged) + len(usd_ai_staged) + len(jupiter_staged) + len(batch_staged)
    total_targets = len(TARGETS) + len(USD_AI_COINS) + len(JUPITER_COINS) + batch_count
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
