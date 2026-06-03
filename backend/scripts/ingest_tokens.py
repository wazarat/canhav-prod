#!/usr/bin/env python3
"""
Seed the Token category — currently CHIP, USD.AI's governance token.

Tokens are standalone governance / utility tokens. CHIP has no dedicated CSV row
and is not yet listed on CoinGecko (its ICO is dated Mar/Apr 2026 in the USD.AI
research), so its live fields are left empty and shared metadata (website /
Twitter / portal banner) is sourced from the "usd-ai" Portal row. The item is
tagged EntitySlug="usd-ai" so it lists under the USD.AI Entity.

Run from anywhere:
    python3 backend/scripts/ingest_tokens.py
    python3 backend/scripts/ingest_tokens.py "/path/to/some.csv"

Stdlib only.
"""

from __future__ import annotations

import csv
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

# Make `app` importable regardless of the current working directory.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.db import get_repository, schema  # noqa: E402

USD_AI_PARENT_SLUG = "usd-ai"

# slug -> spec. Shared metadata is pulled from the USD.AI Portal row.
TOKENS: Dict[str, Dict[str, str]] = {
    "chip": {
        "name": "CHIP",
        "symbol": "CHIP",
        "tokenType": "Governance",
        "description": (
            "CHIP is the governance token of USD.AI. CHIP holders steer the "
            "protocol's DAO — collateral parameters, risk policy, treasury and "
            "ecosystem development — executed off-chain by the USD.AI Foundation. "
            "It is distributed via the USD.AI ICO (Permian Labs)."
        ),
        "entitySlug": USD_AI_PARENT_SLUG,
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
    return DEFAULT_CSV


def token_item(slug: str, parent_row: Optional[Dict[str, str]], created_at: str) -> dict:
    spec = TOKENS[slug]
    row = parent_row or {}
    now = _now_iso()
    return {
        schema.PK: schema.category_pk(schema.CATEGORY_TOKEN),
        schema.SK: schema.protocol_sk(slug),
        "Category": schema.CATEGORY_TOKEN,
        "Status": schema.STATUS_PENDING,
        "Name": spec["name"],
        "Slug": slug,
        "Symbol": spec["symbol"],
        "TokenType": spec["tokenType"],
        "Description": spec["description"],
        "Website": _clean(row.get("Website")) or "https://usd.ai",
        "Twitter": _clean(row.get("Twitter")),
        "Discord": _clean(row.get("Discord")),
        "GitHub": _clean(row.get("GitHub")),
        # Not yet listed on CoinGecko / no verified Arbitrum contract.
        "CoinGecko": None,
        "AuditURL": _clean(row.get("Audit URL")),
        "ContractAddress": None,
        "EntitySlug": spec["entitySlug"],
        "TotalSupply": {"value": None, "source": "alchemy", "updatedAt": None},
        "ArbitrumPortalMetadata": {
            "portalUrl": _clean(row.get("Portal URL")),
            "logoUrl": _clean(row.get("Logo URL")),
            "bannerUrl": _clean(row.get("Banner URL")),
            "chains": _split_chains(row.get("Chains")),
            "subCategory": "Token",
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
    parent_row: Optional[Dict[str, str]] = None
    if csv_path.exists():
        with csv_path.open("r", encoding="utf-8", newline="") as fh:
            for row in csv.DictReader(fh):
                if (row.get("Slug") or "").strip() == USD_AI_PARENT_SLUG:
                    parent_row = row
                    break

    repo = get_repository()
    pk = schema.category_pk(schema.CATEGORY_TOKEN)

    staged: List[str] = []
    for slug in TOKENS:
        existing = repo.get_item(pk, schema.protocol_sk(slug))
        created_at = (existing or {}).get("CreatedAt") or _now_iso()
        repo.put_item(token_item(slug, parent_row, created_at))
        staged.append(slug)

    print(f"Source CSV : {csv_path if csv_path.exists() else '(none — usd.ai defaults)'}")
    print(f"Backend    : {type(repo).__name__}")
    print(f"Partition  : {pk}")
    print("-" * 64)
    print(f"{'STATUS':<18}{'SYMBOL':<10}{'NAME'}")
    print("-" * 64)
    for slug in staged:
        spec = TOKENS[slug]
        print(f"{schema.STATUS_PENDING:<18}{spec['symbol']:<10}{spec['name']}")
    print("-" * 64)
    print(f"Staged {len(staged)} / {len(TOKENS)} token(s) as PENDING_APPROVAL.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
