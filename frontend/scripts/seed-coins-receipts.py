#!/usr/bin/env python3
"""
Seed primary coins and receipt tokens from frontend/data/seed/{coins,receipts}.json
into bootstrap-store.json and backend/data/store.json.

Usage:
  python3 frontend/scripts/seed-coins-receipts.py --coins
  python3 frontend/scripts/seed-coins-receipts.py --receipts
  python3 frontend/scripts/seed-coins-receipts.py --coins --receipts
  python3 frontend/scripts/seed-coins-receipts.py --check
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
SEED_DIR = REPO / "frontend" / "data" / "seed"
BOOTSTRAP = REPO / "frontend" / "data" / "bootstrap-store.json"
BACKEND = REPO / "backend" / "data" / "store.json"
NOW = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

# Individual token/stablecoin slugs superseded by receipt family entries.
RECEIPT_MIGRATION: dict[str, str] = {
    "steth": "lido-steth",
    "reth": "rocket-pool-reth",
    "wbeth": "binance-wbeth",
    "cbeth": "coinbase-cbeth",
    "meth": "mantle-meth",
    "sweth": "swell-sweth",
    "ethx": "stader-ethx",
    "oseth": "stakewise-oseth",
    "ankreth": "ankr-ankreth",
    "weeth": "ether-fi-weeth",
    "ezeth": "renzo-ezeth",
    "rseth": "kelp-rseth",
    "pufeth": "puffer-pufeth",
    "unieth": "bedrock-unieth",
    "yneth": "yieldnest-yneth",
    "ausdc": "aave-atokens",
    "ausdt": "aave-atokens",
    "aweth": "aave-atokens",
    "stkaave": "aave-staked",
    "sgho": "aave-staked",
    "stkgho": "aave-staked",
    "susde": "ethena-susde",
    "susds": "sky-susds",
    "sdai": "sky-susds",
    "scrvusd": "frax-sfrxusd",
    "susdai": "usd-ai-susdai",
    "schip": "usd-ai-schip",
    "glp": "gmx-glp",
    "jlp": "gmx-glp",
}

COIN_TYPE_TO_TOKEN_TYPE = {
    "Governance": "Governance",
    "GovernanceUtility": "Utility",
    "NativeStablecoin": "Utility",
    "SyntheticDollar": "Utility",
    "LockedEscrow": "Utility",
    "NoToken": "Governance",
}

COIN_TYPE_TO_SUBCATEGORY = {
    "Governance": "Governance Token",
    "GovernanceUtility": "Governance Token",
    "NativeStablecoin": "Stablecoin",
    "SyntheticDollar": "Stablecoin",
    "LockedEscrow": "Yield-generating Token",
    "NoToken": "Governance Token",
}


def entity_key(slug: str) -> str:
    return f"CATEGORY#Entity|PROTOCOL#{slug}"


def product_key(category: str, slug: str) -> str:
    return f"CATEGORY#{category}|PROTOCOL#{slug}"


def load_json(path: Path) -> list[dict]:
    return json.loads(path.read_text())


def base_item(slug: str, name: str, symbol: str, category: str) -> dict:
    return {
        "PK": f"CATEGORY#{category}",
        "SK": f"PROTOCOL#{slug}",
        "Category": category,
        "Slug": slug,
        "Name": name,
        "Symbol": symbol,
        "Status": "APPROVED",
        "Description": f"{name} — tracked via compiled coin integration.",
        "Website": None,
        "Twitter": None,
        "Discord": None,
        "GitHub": None,
        "AuditURL": None,
        "ContractAddress": None,
        "EntitySlug": None,
        "CreatedAt": NOW,
        "UpdatedAt": NOW,
        "ArbitrumPortalMetadata": {
            "portalUrl": None,
            "logoUrl": None,
            "bannerUrl": None,
            "chains": [],
            "subCategory": None,
            "isLive": True,
            "isArbitrumNative": False,
            "isPubliclyAudited": False,
            "foundedDate": None,
        },
    }


def build_coin_item(c: dict) -> dict:
    category = "Stablecoin" if c["isStablecoin"] else "Token"
    item = base_item(c["slug"], c["name"], c["symbol"], category)
    item["EntitySlug"] = c["entitySlug"]
    item["CoinType"] = c["coinType"]
    item["IsStablecoin"] = c["isStablecoin"]
    item["Sector"] = c["sector"]
    item["Tag"] = c["tag"]
    item["CoinGecko"] = (
        f"https://www.coingecko.com/en/coins/{c['geckoId']}" if c.get("geckoId") else None
    )
    if category == "Stablecoin":
        item["PegTarget"] = "USD"
        item["SubCategory"] = (
            "Staked Stablecoin" if c["coinType"] == "SyntheticDollar" else "Stablecoin"
        )
        item["TotalSupply"] = {"value": None, "source": "coingecko", "updatedAt": None}
        item["HistoricalPegData"] = {"points": [], "source": "coingecko", "updatedAt": None}
    else:
        item["TokenType"] = COIN_TYPE_TO_TOKEN_TYPE.get(c["coinType"], "Governance")
        item["SubCategory"] = COIN_TYPE_TO_SUBCATEGORY.get(c["coinType"], "Governance Token")
        item["TotalSupply"] = {"value": None, "source": "coingecko", "updatedAt": None}
    if c["coinType"] == "NoToken":
        item["Description"] = f"{c['name']} — no tradable native token; rolls up to network metrics."
    return item


def build_receipt_item(r: dict) -> dict:
    item = base_item(r["slug"], r["name"], r["symbol"], "Receipt")
    item["EntitySlug"] = r["entitySlug"]
    item["ReceiptType"] = r["receiptType"]
    item["BaseAsset"] = r.get("baseAsset")
    item["Sector"] = r["sector"]
    item["Tag"] = r["tag"]
    item["Notes"] = r.get("notes", "")
    item["CoinGecko"] = (
        f"https://www.coingecko.com/en/coins/{r['geckoId']}" if r.get("geckoId") else None
    )
    item["Description"] = r.get("notes") or r["name"]
    return item


def member_ref_coin(c: dict) -> dict:
    category = "Stablecoin" if c["isStablecoin"] else "Token"
    role = {
        "Governance": "Governance token",
        "GovernanceUtility": "Governance & utility token",
        "NativeStablecoin": "Native stablecoin",
        "SyntheticDollar": "Synthetic dollar",
        "LockedEscrow": "Locked / vote-escrow token",
        "NoToken": "No native token",
    }.get(c["coinType"], "Member coin")
    return {
        "slug": c["slug"],
        "name": c["name"],
        "symbol": c["symbol"],
        "category": category,
        "role": role,
        "subCategory": COIN_TYPE_TO_SUBCATEGORY.get(c["coinType"]),
        "coinType": c["coinType"],
    }


def member_ref_receipt(r: dict) -> dict:
    return {
        "slug": r["slug"],
        "name": r["name"],
        "symbol": r["symbol"],
        "category": "Receipt",
        "role": r.get("notes") or r["receiptType"],
        "receiptType": r["receiptType"],
    }


def dedupe_member_coins(mc: list[dict]) -> list[dict]:
    seen: set[tuple[str, str]] = set()
    out: list[dict] = []
    for ref in mc:
        key = (ref.get("slug", ""), ref.get("category", ""))
        if key in seen:
            continue
        seen.add(key)
        out.append(ref)
    return out


def replace_migrated_refs(mc: list[dict], migration: dict[str, str], receipt_by_slug: dict[str, dict]) -> list[dict]:
    out: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for ref in mc:
        slug = ref.get("slug", "")
        cat = ref.get("category", "")
        if slug in migration:
            new_slug = migration[slug]
            r = receipt_by_slug.get(new_slug)
            if not r:
                continue
            new_ref = member_ref_receipt(r)
            key = (new_ref["slug"], new_ref["category"])
            if key not in seen:
                seen.add(key)
                out.append(new_ref)
            continue
        if cat in ("Token", "Stablecoin") and slug in migration.values():
            continue
        key = (slug, cat)
        if key not in seen:
            seen.add(key)
            out.append(ref)
    return out


def apply_coins(store: dict, coins: list[dict]) -> tuple[int, int, list[str]]:
    items = store["items"]
    added = 0
    linked = 0
    missing_entities: list[str] = []
    for c in coins:
        category = "Stablecoin" if c["isStablecoin"] else "Token"
        key = product_key(category, c["slug"])
        existing = items.get(key)
        if existing:
            existing.update(
                {
                    "CoinType": c["coinType"],
                    "IsStablecoin": c["isStablecoin"],
                    "EntitySlug": c["entitySlug"],
                    "Sector": c["sector"],
                    "Tag": c["tag"],
                    "UpdatedAt": NOW,
                }
            )
        else:
            items[key] = build_coin_item(c)
            added += 1
        ek = entity_key(c["entitySlug"])
        if ek not in items:
            missing_entities.append(c["entitySlug"])
            continue
        net = items[ek]
        mc = net.get("MemberCoins") or []
        ref = member_ref_coin(c)
        if not any(r.get("slug") == ref["slug"] and r.get("category") == ref["category"] for r in mc):
            mc.append(ref)
            net["MemberCoins"] = dedupe_member_coins(mc)
            linked += 1
    return added, linked, missing_entities


def remove_migrated_products(items: dict) -> int:
    removed = 0
    for old_slug in RECEIPT_MIGRATION:
        for cat in ("Token", "Stablecoin"):
            key = product_key(cat, old_slug)
            if key in items:
                del items[key]
                removed += 1
    return removed


def apply_receipts(store: dict, receipts: list[dict]) -> tuple[int, int, int, list[str]]:
    items = store["items"]
    receipt_by_slug = {r["slug"]: r for r in receipts}
    removed = remove_migrated_products(items)
    added = 0
    linked = 0
    missing_entities: list[str] = []

    for r in receipts:
        key = product_key("Receipt", r["slug"])
        existing = items.get(key)
        if existing:
            existing.update(
                {
                    "ReceiptType": r["receiptType"],
                    "EntitySlug": r["entitySlug"],
                    "BaseAsset": r.get("baseAsset"),
                    "Sector": r["sector"],
                    "Tag": r["tag"],
                    "Notes": r.get("notes", ""),
                    "UpdatedAt": NOW,
                }
            )
        else:
            items[key] = build_receipt_item(r)
            added += 1

    for ek_field, net in list(items.items()):
        if not ek_field.startswith("CATEGORY#Entity|"):
            continue
        mc = net.get("MemberCoins") or []
        new_mc = replace_migrated_refs(mc, RECEIPT_MIGRATION, receipt_by_slug)
        for r in receipts:
            if r["entitySlug"] != net.get("Slug"):
                continue
            ref = member_ref_receipt(r)
            if not any(x.get("slug") == ref["slug"] and x.get("category") == "Receipt" for x in new_mc):
                new_mc.append(ref)
                linked += 1
        if new_mc != mc:
            net["MemberCoins"] = dedupe_member_coins(new_mc)

    for r in receipts:
        ek = entity_key(r["entitySlug"])
        if ek not in items:
            missing_entities.append(r["entitySlug"])

    return added, linked, removed, missing_entities


def write_store(path: Path, store: dict, trailing_newline: bool) -> None:
    s = json.dumps(store, indent=2, sort_keys=True, ensure_ascii=False)
    if trailing_newline:
        s += "\n"
    path.write_text(s)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--coins", action="store_true")
    parser.add_argument("--receipts", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if not args.coins and not args.receipts and not args.check:
        args.coins = True

    coins_path = SEED_DIR / "coins.json"
    receipts_path = SEED_DIR / "receipts.json"
    if not coins_path.exists():
        print("Run generate-coin-seeds.py first", file=sys.stderr)
        return 1

    coins = load_json(coins_path)
    receipts = load_json(receipts_path) if receipts_path.exists() else []

    boot = json.loads(BOOTSTRAP.read_text())
    back = json.loads(BACKEND.read_text()) if BACKEND.exists() else boot

    if args.check:
        print(f"coins.json: {len(coins)} entries")
        print(f"receipts.json: {len(receipts)} entries")
        return 0

    for label, store in [("bootstrap", boot), ("backend", back)]:
        if args.coins:
            a, l, miss = apply_coins(store, coins)
            print(f"{label}: coins +{a} items, +{l} member links")
            if miss:
                print(f"  missing entities: {sorted(set(miss))}")
        if args.receipts:
            a, l, rm, miss = apply_receipts(store, receipts)
            print(f"{label}: receipts +{a} items, +{l} links, removed {rm} migrated tokens")
            if miss:
                print(f"  missing entities: {sorted(set(miss))}")
        store["_meta"]["count"] = len(store["items"])
        store["_meta"]["updatedAt"] = NOW

    write_store(BOOTSTRAP, boot, trailing_newline=True)
    BACKEND.parent.mkdir(parents=True, exist_ok=True)
    write_store(BACKEND, back, trailing_newline=False)
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
