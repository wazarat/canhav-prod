"""
Backfill network MemberCoins[] forward-links from compiled coin/receipt EntitySlug
reverse-links (M3 Day3/4 spec sec.B4.4 done in bulk).

- ADD-only: never removes or reorders existing refs.
- Idempotent + dedupe by slug AND by (symbol, category) so the 13 legacy-vs-compiled
  symbol collisions (e.g. aave-gov vs aave-token) are NOT double-listed.
- Repoints the one Ethena USDe ref from the entity slug 'ethena' to the canonical
  compiled 'usde' item (explicit request).
- Preserves key order + indentation; auto-detects ensure_ascii from the file.

Usage: python frontend/scripts/backfill-member-coins.py                 (writes bootstrap-store.json)
       python frontend/scripts/backfill-member-coins.py <store.json>    (writes the given store file)
       python frontend/scripts/backfill-member-coins.py --dry-run       (report only)
"""
import json, sys, collections, os

DRY = "--dry-run" in sys.argv
_paths = [a for a in sys.argv[1:] if not a.startswith("--")]
if _paths:
    STORE = os.path.abspath(_paths[0])
else:
    STORE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "bootstrap-store.json"))

raw = open(STORE, encoding="utf-8").read()
ensure_ascii = "\\u" in raw  # match the file's existing escaping style
doc = json.loads(raw)
items = doc["items"]

COINTYPE_LABEL = {
    "GovernanceUtility": "Governance & Utility Token",
    "Governance": "Governance Token",
    "NativeStablecoin": "Native Stablecoin",
    "SyntheticDollar": "Synthetic Dollar",
    "LockedVoteEscrow": "Locked / Vote-Escrow Token",
    "Native": "Native Asset",
    "NoToken": "No Token",
}
RECEIPTTYPE_LABEL = {
    "LiquidStaking": "Liquid Staking Token (LST)",
    "LiquidRestaking": "Liquid Restaking Token (LRT)",
    "LendingReceipt": "Lending Receipt Token",
    "StakedStablecoin": "Staked Stablecoin",
    "FixedIncomeTranche": "Fixed-Income / Tranche Token",
    "TokenizedRwa": "Tokenized RWA Token",
    "TokenizedRWA": "Tokenized RWA Token",
    "YieldBearingVault": "Yield-Bearing Vault Token",
    "YieldVault": "Yield-Bearing Vault Token",
    "LockedVoteEscrowReceipt": "Locked / Vote-Escrow Receipt",
    "LockedEscrowReceipt": "Locked / Vote-Escrow Receipt",
}

nets = {it.get("Slug"): it for k, it in items.items() if k.startswith("CATEGORY#Entity|")}

def role_for(it):
    if it.get("Category") == "Receipt":
        rt = it.get("ReceiptType")
        return RECEIPTTYPE_LABEL.get(rt, rt or "Receipt token")
    ct = it.get("CoinType")
    return COINTYPE_LABEL.get(ct, ct or it.get("SubCategory") or "Member coin")

# compiled coins/receipts by parent EntitySlug
by_ent = collections.defaultdict(list)
for k, it in items.items():
    if it.get("Category") in ("Token", "Stablecoin", "RWA", "Receipt"):
        slug = it.get("Slug", "")
        if slug.endswith("-no-token"):
            continue
        if it.get("EntitySlug"):
            by_ent[it["EntitySlug"]].append(it)

unmapped_types = set()
added = collections.defaultdict(list)
skipped_collision = []
modified_nets = set()

for ent, members in by_ent.items():
    net = nets.get(ent)
    if not net:
        continue
    existing = net.get("MemberCoins")
    if not isinstance(existing, list):
        existing = []
    ex_slugs = {m.get("slug") for m in existing}
    ex_symcat = {(str(m.get("symbol")).upper(), m.get("category")) for m in existing}
    for it in members:
        slug, sym, cat = it.get("Slug"), it.get("Symbol"), it.get("Category")
        if slug in ex_slugs:
            continue
        if (str(sym).upper(), cat) in ex_symcat:
            skipped_collision.append((ent, sym, cat, slug))
            continue
        if cat == "Receipt" and it.get("ReceiptType") not in RECEIPTTYPE_LABEL:
            unmapped_types.add(it.get("ReceiptType"))
        if cat != "Receipt" and it.get("CoinType") not in COINTYPE_LABEL:
            unmapped_types.add(it.get("CoinType"))
        ref = {
            "slug": slug,
            "name": it.get("Name"),
            "symbol": sym,
            "category": cat,
            "role": role_for(it),
        }
        sub = it.get("SubCategory")
        if sub:
            ref["subCategory"] = sub
        if cat == "Receipt" and it.get("ReceiptType"):
            ref["receiptType"] = it.get("ReceiptType")
        existing.append(ref)
        ex_slugs.add(slug)
        ex_symcat.add((str(sym).upper(), cat))
        added[ent].append(f"{sym} [{cat}] ({slug})")
        modified_nets.add(ent)
    net["MemberCoins"] = existing

# explicit fix: Ethena USDe ref should point at the canonical compiled 'usde' item
eth = nets.get("ethena")
usde_fixed = False
if eth and isinstance(eth.get("MemberCoins"), list) and "CATEGORY#Stablecoin|PROTOCOL#usde" in items:
    slugs_now = {m.get("slug") for m in eth["MemberCoins"]}
    for m in eth["MemberCoins"]:
        if str(m.get("symbol")).upper() == "USDE" and m.get("slug") == "ethena" and "usde" not in slugs_now:
            m["slug"] = "usde"
            usde_fixed = True
            modified_nets.add("ethena")

# stamp UpdatedAt on modified networks + _meta
STAMP = "2026-07-13T00:00:00Z"
for ent in modified_nets:
    nets[ent]["UpdatedAt"] = STAMP
if modified_nets:
    doc["_meta"]["updatedAt"] = STAMP

total_added = sum(len(v) for v in added.values())
print(f"Networks modified: {len(modified_nets)}")
print(f"Total member refs ADDED: {total_added}")
print(f"Skipped (symbol already present via legacy ref): {len(skipped_collision)}")
print(f"Ethena USDe ref repointed to 'usde': {usde_fixed}")
if unmapped_types:
    print(f"WARN unmapped type tokens (used raw as role): {sorted(t for t in unmapped_types if t)}")
print("\nAdds per network:")
for ent in sorted(added):
    print(f"  {ent} (+{len(added[ent])}): {', '.join(added[ent])}")
print("\nSkipped collisions (shown via existing legacy ref, not duplicated):")
for ent, sym, cat, slug in skipped_collision:
    print(f"  {ent}: {sym} [{cat}] compiled={slug}")

if DRY:
    print("\n[dry-run] no file written.")
else:
    out = json.dumps(doc, indent=2, ensure_ascii=ensure_ascii)
    if not out.endswith("\n"):
        out += "\n"
    open(STORE, "w", encoding="utf-8", newline="\n").write(out)
    print(f"\nWROTE {STORE}")
