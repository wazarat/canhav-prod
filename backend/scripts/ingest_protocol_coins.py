#!/usr/bin/env python3
"""
Apply Protocol-Symbol-Chain-Contract.csv to lending-network token profiles.

Reads the CSV (default: ~/Downloads/Protocol-Symbol-Chain-Contract.csv),
updates token ContractAddress / Chains / Deployments in the local store, and
refreshes frontend/data/bootstrap-store.json from backend/data/store.json.

Usage:
    python3 backend/scripts/ingest_protocol_coins.py
    python3 backend/scripts/ingest_protocol_coins.py /path/to/Protocol-Symbol-Chain-Contract.csv

Stdlib only.
"""

from __future__ import annotations

import csv
import json
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
DEFAULT_CSV = Path.home() / "Downloads" / "Protocol-Symbol-Chain-Contract.csv"
STORE_PATH = BACKEND_ROOT / "data" / "store.json"
BOOTSTRAP_PATH = REPO_ROOT / "frontend" / "data" / "bootstrap-store.json"

# CSV Protocol -> entity slug (MemberCoins live on the entity).
PROTOCOL_TO_ENTITY: Dict[str, str] = {
    "Morpho": "morpho",
    "Spark": "spark",
    "Spark/Sky": "spark",
    "Compound": "compound",
    "Fluid": "fluid",
    "Venus": "venus",
    "JustLend": "justlend",
    "Kamino": "kamino",
    "Maple": "maple",
}

# (Protocol, Symbol) -> token slug in ingest_tokens.py / store.
SYMBOL_TO_SLUG: Dict[Tuple[str, str], str] = {
    ("Morpho", "MORPHO"): "morpho",
    ("Morpho", "MORPHO (legacy)"): "morpho",
    ("Spark", "SPK"): "spk",
    ("Spark/Sky", "USDS"): "sky",
    ("Spark/Sky", "SKY"): "sky-gov",
    ("Compound", "COMP"): "comp",
    ("Fluid", "FLUID (ex-INST)"): "fluid",
    ("Venus", "XVS"): "xvs",
    ("JustLend", "JST"): "jst",
    ("Kamino", "KMNO"): "kmno",
    ("Maple", "SYRUP"): "syrup",
    ("Maple", "SYRUP (OFT)"): "syrup-oft",
    ("Maple", "stSYRUP"): "stsyrup",
    ("Maple", "syrupUSDC pool"): "syrup-usdc-pool",
    ("Maple", "syrupUSDT pool"): "syrup-usdt-pool",
}

# Member-coin refs keyed by entity slug -> list of (category, slug, name, role, symbol, subCategory).
MEMBER_COIN_REFS: Dict[str, List[Dict[str, str]]] = {
    "morpho": [
        {
            "category": "Token",
            "slug": "morpho",
            "name": "MORPHO",
            "role": "DAO governance token",
            "symbol": "MORPHO",
            "subCategory": "Governance Token",
        },
    ],
    "spark": [
        {
            "category": "Token",
            "slug": "spk",
            "name": "Spark",
            "role": "Governance token",
            "symbol": "SPK",
            "subCategory": "Governance Token",
        },
        {
            "category": "Token",
            "slug": "sky-gov",
            "name": "SKY",
            "role": "Sky ecosystem governance (MKR successor)",
            "symbol": "SKY",
            "subCategory": "Governance Token",
        },
        {
            "category": "Stablecoin",
            "slug": "sky",
            "name": "USDS",
            "role": "Primary stablecoin liquidity (Sky)",
            "symbol": "USDS",
            "subCategory": "Stablecoin",
        },
    ],
    "compound": [
        {
            "category": "Token",
            "slug": "comp",
            "name": "Compound",
            "role": "DAO governance token",
            "symbol": "COMP",
            "subCategory": "Governance Token",
        },
    ],
    "fluid": [
        {
            "category": "Token",
            "slug": "fluid",
            "name": "Fluid",
            "role": "Governance token (ex-INST)",
            "symbol": "FLUID",
            "subCategory": "Governance Token",
        },
    ],
    "venus": [
        {
            "category": "Token",
            "slug": "xvs",
            "name": "Venus",
            "role": "Governance token",
            "symbol": "XVS",
            "subCategory": "Governance Token",
        },
    ],
    "justlend": [
        {
            "category": "Token",
            "slug": "jst",
            "name": "JUST",
            "role": "Governance token",
            "symbol": "JST",
            "subCategory": "Governance Token",
        },
    ],
    "kamino": [
        {
            "category": "Token",
            "slug": "kmno",
            "name": "Kamino",
            "role": "Governance token",
            "symbol": "KMNO",
            "subCategory": "Governance Token",
        },
    ],
    "maple": [
        {
            "category": "Token",
            "slug": "syrup",
            "name": "Syrup",
            "role": "Governance / staking token (ex-MPL)",
            "symbol": "SYRUP",
            "subCategory": "Governance Token",
        },
        {
            "category": "Token",
            "slug": "syrup-oft",
            "name": "SYRUP (OFT)",
            "role": "OFT bridge token on Base",
            "symbol": "SYRUP",
            "subCategory": "Governance Token",
        },
        {
            "category": "Token",
            "slug": "stsyrup",
            "name": "stSYRUP",
            "role": "Staked SYRUP receipt",
            "symbol": "stSYRUP",
            "subCategory": "Yield-generating Token",
        },
        {
            "category": "Token",
            "slug": "syrup-usdc-pool",
            "name": "syrupUSDC pool",
            "role": "USDC lending pool token",
            "symbol": "syrupUSDC",
            "subCategory": "Yield-generating Token",
        },
        {
            "category": "Token",
            "slug": "syrup-usdt-pool",
            "name": "syrupUSDT pool",
            "role": "USDT lending pool token",
            "symbol": "syrupUSDT",
            "subCategory": "Yield-generating Token",
        },
    ],
}

PRIMARY_CHAIN = "Ethereum"


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def resolve_csv_path(argv: List[str]) -> Path:
    if len(argv) > 1 and not argv[1].startswith("-"):
        return Path(argv[1]).expanduser()
    return DEFAULT_CSV


def load_store() -> Dict[str, Any]:
    if not STORE_PATH.exists():
        print(f"ERROR: {STORE_PATH} not found — run ingest_entities.py / ingest_tokens.py first.", file=sys.stderr)
        sys.exit(1)
    return json.loads(STORE_PATH.read_text(encoding="utf-8"))


def save_store(store: Dict[str, Any]) -> None:
    store["_meta"]["updatedAt"] = _now_iso()
    store["_meta"]["count"] = len(store.get("items", {}))
    STORE_PATH.write_text(json.dumps(store, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def export_bootstrap(store: Dict[str, Any]) -> None:
    BOOTSTRAP_PATH.parent.mkdir(parents=True, exist_ok=True)
    BOOTSTRAP_PATH.write_text(json.dumps(store, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def find_item_key(items: Dict[str, Any], category: str, slug: str) -> Optional[str]:
    sk = f"PROTOCOL#{slug}"
    pk = f"CATEGORY#{category}"
    needle = f"{pk}|{sk}"
    if needle in items:
        return needle
    for key, item in items.items():
        if item.get("Category") == category and item.get("Slug") == slug:
            return key
    return None


def deployment_label(symbol: str) -> Optional[str]:
    if "legacy" in symbol.lower():
        return "legacy"
    if "oft" in symbol.lower():
        return "OFT"
    return None


def apply_csv_rows(store: Dict[str, Any], csv_path: Path) -> None:
    items: Dict[str, Any] = store["items"]
    rows_by_slug: Dict[str, List[Dict[str, str]]] = defaultdict(list)

    with csv_path.open("r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            protocol = (row.get("Protocol") or "").strip()
            symbol = (row.get("Symbol") or "").strip()
            chain = (row.get("Chain") or "").strip()
            contract = (row.get("Contract") or "").strip()
            if not protocol or not symbol or not chain or not contract:
                continue
            slug = SYMBOL_TO_SLUG.get((protocol, symbol))
            if not slug:
                raise SystemExit(f"Unknown CSV row: Protocol={protocol!r} Symbol={symbol!r}")
            rows_by_slug[slug].append(
                {"protocol": protocol, "symbol": symbol, "chain": chain, "contract": contract}
            )

    updated_tokens = 0
    for slug, rows in rows_by_slug.items():
        category = "Stablecoin" if slug == "sky" else "Token"
        key = find_item_key(items, category, slug)
        if not key:
            raise SystemExit(f"Token {slug!r} not in store — run ingest_tokens.py first.")

        chains = sorted({r["chain"] for r in rows})
        primary_row = next((r for r in rows if r["chain"] == PRIMARY_CHAIN), rows[0])
        deployments: List[Dict[str, str]] = []
        for r in rows:
            if r["chain"] == primary_row["chain"] and r["contract"] == primary_row["contract"]:
                continue
            dep: Dict[str, str] = {"chain": r["chain"], "address": r["contract"]}
            label = deployment_label(r["symbol"])
            if label:
                dep["label"] = label
            deployments.append(dep)

        item = items[key]
        item["ContractAddress"] = primary_row["contract"]
        meta = item.setdefault("ArbitrumPortalMetadata", {})
        meta["chains"] = chains
        if deployments:
            item["Deployments"] = deployments
        elif "Deployments" in item and len(rows) == 1:
            item.pop("Deployments", None)
        item["UpdatedAt"] = _now_iso()
        updated_tokens += 1

    updated_entities = 0
    for entity_slug, refs in MEMBER_COIN_REFS.items():
        key = find_item_key(items, "Entity", entity_slug)
        if not key:
            print(f"WARN: entity {entity_slug!r} not in store — skipping MemberCoins", file=sys.stderr)
            continue
        item = items[key]
        item["MemberCoins"] = refs
        item["UpdatedAt"] = _now_iso()
        updated_entities += 1

    print(f"CSV rows   : {sum(len(v) for v in rows_by_slug.values())} across {len(rows_by_slug)} tokens")
    print(f"Updated    : {updated_tokens} tokens, {updated_entities} entities")
    print(f"Store      : {STORE_PATH}")


def main(argv: List[str]) -> int:
    csv_path = resolve_csv_path(argv)
    if not csv_path.exists():
        print(f"ERROR: CSV not found at {csv_path}", file=sys.stderr)
        return 1

    store = load_store()
    apply_csv_rows(store, csv_path)
    save_store(store)
    export_bootstrap(store)
    print(f"Bootstrap  : {BOOTSTRAP_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
