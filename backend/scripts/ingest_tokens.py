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
JUPITER_PARENT_SLUG = "jupiter"

# slug -> spec. USD.AI tokens pull shared metadata from the Portal row; Jupiter
# tokens are fully curated (Solana-native, no Arbitrum CSV row).
TOKENS: Dict[str, Dict[str, Optional[str]]] = {
    "chip": {
        "name": "CHIP",
        "symbol": "CHIP",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "CHIP is the governance token of USD.AI. CHIP holders steer the "
            "protocol's DAO — collateral parameters, risk policy, treasury and "
            "ecosystem development — executed off-chain by the USD.AI Foundation. "
            "It is distributed via the USD.AI ICO (Permian Labs)."
        ),
        "entitySlug": USD_AI_PARENT_SLUG,
        "coingecko": None,
        "contractAddress": None,
        "csvParentSlug": USD_AI_PARENT_SLUG,
        "chains": None,
        "website": None,
        "twitter": None,
        "discord": None,
        "github": None,
    },
    "jup": {
        "name": "JUP",
        "symbol": "JUP",
        "tokenType": "Governance",
        "subCategory": "Governance Token",
        "description": (
            "JUP is the governance token of Jupiter DAO (Jupiter United Planet). "
            "Founder Meow has stated it is for DAO governance only, not a utility "
            "token. Supply is capped at 10B with 50% allocated to the community."
        ),
        "entitySlug": JUPITER_PARENT_SLUG,
        "coingecko": "https://www.coingecko.com/en/coins/jupiter-exchange-solana",
        "contractAddress": "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
        "csvParentSlug": None,
        "chains": ["Solana"],
        "website": "https://jup.ag",
        "twitter": "https://x.com/JupiterExchange",
        "discord": "https://discord.gg/jup",
        "github": "https://github.com/jup-ag",
    },
    "jlp": {
        "name": "JLP",
        "symbol": "JLP",
        "tokenType": "Yield",
        "subCategory": "Yield-generating Token",
        "description": (
            "Jupiter Liquidity Provider token: a tradeable basket of SOL (~44%), ETH (~9%), "
            "BTC (~11%), USDC (~27%), USDT (~9%) (~35% stable / 65% volatile). Value = "
            "index + trader PnL + 75% of perp fees auto-compounded. LPs are the house."
        ),
        "entitySlug": JUPITER_PARENT_SLUG,
        "coingecko": "https://www.coingecko.com/en/coins/jupiter-perpetuals-liquidity-provider-token",
        "contractAddress": "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4",
        "csvParentSlug": None,
        "chains": ["Solana"],
        "website": "https://jup.ag/perps",
        "twitter": "https://x.com/JupiterExchange",
        "discord": "https://discord.gg/jup",
        "github": "https://github.com/jup-ag",
    },
    "jupsol": {
        "name": "JupSOL",
        "symbol": "JUPSOL",
        "tokenType": "LST",
        "subCategory": "LST",
        "description": (
            "Jupiter Staked SOL liquid staking token. Represents staked SOL in "
            "Jupiter's staking product with DeFi composability across the ecosystem."
        ),
        "entitySlug": JUPITER_PARENT_SLUG,
        "coingecko": "https://www.coingecko.com/en/coins/jupiter-staked-sol",
        "contractAddress": "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v",
        "csvParentSlug": None,
        "chains": ["Solana"],
        "website": "https://jup.ag/stake",
        "twitter": "https://x.com/JupiterExchange",
        "discord": "https://discord.gg/jup",
        "github": "https://github.com/jup-ag",
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
    chains = spec.get("chains")
    if chains is None and row:
        chains = _split_chains(row.get("Chains"))
    return {
        schema.PK: schema.category_pk(schema.CATEGORY_TOKEN),
        schema.SK: schema.protocol_sk(slug),
        "Category": schema.CATEGORY_TOKEN,
        "Status": schema.STATUS_APPROVED,
        "Name": spec["name"],
        "Slug": slug,
        "Symbol": spec["symbol"],
        "TokenType": spec["tokenType"],
        "SubCategory": spec.get("subCategory"),
        "Description": spec["description"],
        "Website": spec.get("website") or _clean(row.get("Website")) or "https://usd.ai",
        "Twitter": spec.get("twitter") or _clean(row.get("Twitter")),
        "Discord": spec.get("discord") or _clean(row.get("Discord")),
        "GitHub": spec.get("github") or _clean(row.get("GitHub")),
        "CoinGecko": spec.get("coingecko"),
        "AuditURL": _clean(row.get("Audit URL")),
        "ContractAddress": spec.get("contractAddress"),
        "EntitySlug": spec["entitySlug"],
        "TotalSupply": {"value": None, "source": "alchemy", "updatedAt": None},
        "ArbitrumPortalMetadata": {
            "portalUrl": _clean(row.get("Portal URL")),
            "logoUrl": _clean(row.get("Logo URL")),
            "bannerUrl": _clean(row.get("Banner URL")),
            "chains": chains or [],
            "subCategory": spec.get("subCategory") or "Token",
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
    csv_rows: Dict[str, Dict[str, str]] = {}
    if csv_path.exists():
        with csv_path.open("r", encoding="utf-8", newline="") as fh:
            for row in csv.DictReader(fh):
                slug = (row.get("Slug") or "").strip()
                if slug:
                    csv_rows[slug] = row

    repo = get_repository()
    pk = schema.category_pk(schema.CATEGORY_TOKEN)

    staged: List[str] = []
    for slug, spec in TOKENS.items():
        csv_parent = spec.get("csvParentSlug")
        parent_row = csv_rows.get(csv_parent) if csv_parent else None
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
    print(f"Published {len(staged)} / {len(TOKENS)} token(s) as APPROVED.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
