#!/usr/bin/env python3
"""Remove dead / near-dead coin items from the local file stores + coins.json
and prune them from every entity's MemberCoins. Idempotent.

Scope: LOCAL stores only (bootstrap-store.json + backend/data/store.json).
Does NOT touch Upstash. Leaves the 15 "No Token" placeholder items alone.
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

# Dead (unlisted) + near-dead (dust mcap) + rebranded-away. dpx: DPX dead,
# successor Stryke is a differently-named token -> remove rather than mislabel.
REMOVE = {
    "sher", "pal", "npm", "neu", "rage", "spice", "sense-token", "insur",
    "fflr", "dlp", "m", "tprotocol-tru", "btrfly", "armor", "dpx",
}
COIN_CATS = {"Token", "Stablecoin"}


def prune_store(path: Path, label: str) -> None:
    if not path.exists():
        print(f"{label}: (missing, skipped) {path}")
        return
    trailing_nl = path.read_text().endswith("\n")
    store = json.loads(path.read_text())
    items = store["items"]

    removed_items = []
    for key in list(items.keys()):
        v = items[key]
        if v.get("Category") in COIN_CATS and v.get("Slug") in REMOVE:
            removed_items.append((v.get("Slug"), v.get("Category")))
            del items[key]

    pruned_links = []  # (entity_slug, coin_slug)
    for v in items.values():
        mc = v.get("MemberCoins")
        if not mc:
            continue
        kept = [r for r in mc if r.get("slug") not in REMOVE]
        if len(kept) != len(mc):
            for r in mc:
                if r.get("slug") in REMOVE:
                    pruned_links.append((v.get("Slug"), r.get("slug")))
            v["MemberCoins"] = kept

    store["_meta"]["count"] = len(items)
    store["_meta"]["updatedAt"] = NOW

    # Preserve original key order (no sort_keys) so the diff stays minimal.
    s = json.dumps(store, indent=2, ensure_ascii=False)
    if trailing_nl:
        s += "\n"
    path.write_text(s)

    print(f"\n{label}: removed {len(removed_items)} coin items, "
          f"pruned {len(pruned_links)} MemberCoins refs")
    for slug, cat in sorted(removed_items):
        print(f"   - item  {cat:10} {slug}")
    for ent, coin in sorted(pruned_links):
        print(f"   - unlink {ent:18} <- {coin}")


def prune_coins_json() -> None:
    coins = json.loads(COINS_JSON.read_text())
    kept = [c for c in coins if c.get("slug") not in REMOVE]
    dropped = [c["slug"] for c in coins if c.get("slug") in REMOVE]
    COINS_JSON.write_text(json.dumps(kept, indent=2) + "\n")
    print(f"\ncoins.json: {len(coins)} -> {len(kept)} (dropped {len(dropped)}: {sorted(dropped)})")


if __name__ == "__main__":
    prune_store(BOOTSTRAP, "bootstrap-store.json")
    prune_store(BACKEND, "backend/data/store.json")
    prune_coins_json()
    print("\nDone (local stores only; Upstash untouched).")
