#!/usr/bin/env python3
"""Collapse cross-tagged coins to a single item (spec D1.4: one item, not a
duplicate per sector). ENA and FXS were each seeded as two items under the same
parent entity, differing only in Sector/Tag -> the entity page rendered the
token twice. Keep the canonical ticker slug, drop the duplicate.

Coins surface ONLY via their parent entity's MemberCoins; a coin's Sector/Tag
does not drive any cross-sector listing, so collapsing loses nothing.

Idempotent. LOCAL file stores only (Upstash untouched).
"""
from __future__ import annotations
import json
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
BOOTSTRAP = REPO / "frontend" / "data" / "bootstrap-store.json"
BACKEND = REPO / "backend" / "data" / "store.json"
COINS_JSON = REPO / "frontend" / "data" / "seed" / "coins.json"
NOW = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

# Duplicate slug -> canonical slug kept. Only the duplicate is removed.
DROP = {"ethena-ena": "ena", "frax-fxs": "fxs"}
COIN_CATS = {"Token", "Stablecoin"}


def prune_store(path: Path, label: str) -> None:
    if not path.exists():
        print(f"{label}: (missing, skipped)")
        return
    trailing_nl = path.read_text(encoding="utf-8").endswith("\n")
    store = json.loads(path.read_text(encoding="utf-8"))
    items = store["items"]

    removed = []
    for key in list(items.keys()):
        v = items[key]
        if v.get("Category") in COIN_CATS and v.get("Slug") in DROP:
            removed.append(v.get("Slug"))
            del items[key]

    unlinked = []
    for v in items.values():
        mc = v.get("MemberCoins")
        if not mc:
            continue
        kept = [r for r in mc if r.get("slug") not in DROP]
        if len(kept) != len(mc):
            for r in mc:
                if r.get("slug") in DROP:
                    unlinked.append((v.get("Slug"), r.get("slug")))
            v["MemberCoins"] = kept

    store["_meta"]["count"] = len(items)
    store["_meta"]["updatedAt"] = NOW
    s = json.dumps(store, indent=2, ensure_ascii=False)  # preserve key order
    if trailing_nl:
        s += "\n"
    path.write_text(s, encoding="utf-8")

    print(f"{label}: removed {len(removed)} dup items {sorted(removed)}, "
          f"unlinked {len(unlinked)} refs {sorted(unlinked)}")


def prune_coins_json() -> None:
    coins = json.loads(COINS_JSON.read_text(encoding="utf-8"))
    kept = [c for c in coins if c.get("slug") not in DROP]
    COINS_JSON.write_text(json.dumps(kept, indent=2) + "\n", encoding="utf-8")
    print(f"coins.json: {len(coins)} -> {len(kept)} (dropped {sorted(DROP)})")


if __name__ == "__main__":
    prune_store(BOOTSTRAP, "bootstrap-store.json")
    prune_store(BACKEND, "backend/data/store.json")
    prune_coins_json()
    print("Done (local stores only; Upstash untouched).")
