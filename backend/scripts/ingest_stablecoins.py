#!/usr/bin/env python3
"""
Step 3 — seed the 10 Phase-1 stablecoins from the Arbitrum Portal CSV.

Reads `Arbitrum Ecosystem - scrape v2.csv`, extracts the 10 target stablecoins,
maps each CSV row onto the DynamoDB single-table item shape, and stages it with
``Status = PENDING_APPROVAL`` via the configured repository (LocalAdapter by
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
TARGETS: Dict[str, Tuple[str, str, str]] = {
    "ethena": ("Ethena (USDe)", "USDe", schema.PEG_USD),
    "inverse-finance": ("Inverse Finance", "DOLA", schema.PEG_USD),
    "monerium": ("Monerium", "EURe", schema.PEG_EUR),
    "sky": ("Sky (USDS)", "USDS", schema.PEG_USD),
    "stably": ("Stably", "USDS.s", schema.PEG_USD),
    "tether": ("Tether (USDT)", "USDT", schema.PEG_USD),
    "trueusd": ("TrueUSD", "TUSD", schema.PEG_USD),
    "usd-ai": ("USD.AI (sUSDai)", "sUSDai", schema.PEG_USD),
    "usdc": ("USDC", "USDC", schema.PEG_USD),
    "usdt0": ("USDT0", "USDT0", schema.PEG_USD),
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
    """Map one CSV row onto a single-table item (Status=PENDING_APPROVAL)."""
    slug = (row.get("Slug") or "").strip()
    name, symbol, peg = TARGETS[slug]
    now = _now_iso()

    return {
        schema.PK: schema.category_pk(schema.CATEGORY_STABLECOIN),
        schema.SK: schema.protocol_sk(slug),
        "Category": schema.CATEGORY_STABLECOIN,
        "Status": schema.STATUS_PENDING,
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
        row = matched.get(slug)
        if row is None:
            continue
        # Idempotent: preserve original CreatedAt on re-ingest.
        existing = repo.get_item(pk, schema.protocol_sk(slug))
        created_at = (existing or {}).get("CreatedAt") or _now_iso()
        item = row_to_item(row, created_at)
        repo.put_item(item)
        staged.append(slug)

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
    print("-" * 64)
    print(f"Staged {len(staged)} / {len(TARGETS)} target stablecoins as PENDING_APPROVAL.")

    missing = [s for s in TARGETS if s not in staged]
    if missing:
        print(f"WARNING: missing from CSV: {', '.join(missing)}", file=sys.stderr)
        return 2

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
