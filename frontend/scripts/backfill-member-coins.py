"""
Backfill network MemberCoins[] forward-links from compiled coin/receipt EntitySlug
reverse-links (M3 Day3/4 spec sec.B4.4 done in bulk).

- Dedupe by slug AND by SYMBOL alone (case-insensitive, category-agnostic) so
  legacy-vs-compiled collisions (e.g. individual aUSDC vs the grouped
  aave-atokens ref, Token vs Receipt category) are NOT double-listed. A
  compiled "A/B" symbol also collides when any part matches an existing symbol.
- Prunes existing same-symbol duplicates (keeps the FIRST ref per symbol) plus
  a curated list of redundant grouped refs, so a store that already has dupes
  self-heals on the next run.
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

# Grouped/compiled refs that duplicate concrete refs the network already lists
# under different symbols (so symbol-dedupe can't catch them).
REDUNDANT_REFS = {
    "maple": {"maple-credit-pool-tokens"},  # generic "Credit Pool Tokens" vs concrete syrupUSDC/syrupUSDT
}


def norm_sym(sym):
    return str(sym).strip().upper()


def sym_parts(sym):
    """'MPL/SYRUP' -> {'MPL', 'SYRUP'}; plain symbols -> single-element set."""
    return {p.strip().upper() for p in str(sym).split("/") if p.strip()}

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
pruned = collections.defaultdict(list)
modified_nets = set()

# --- Prune pass: drop same-symbol duplicates (keep the FIRST ref per symbol),
# "/"-joined symbols whose parts are already listed, and curated redundant refs.
for ent, net in nets.items():
    existing = net.get("MemberCoins")
    if not isinstance(existing, list) or not existing:
        continue
    seen_syms = set()
    kept = []
    for m in existing:
        sym = norm_sym(m.get("symbol"))
        parts = sym_parts(m.get("symbol"))
        if m.get("slug") in REDUNDANT_REFS.get(ent, set()):
            pruned[ent].append(f"{m.get('symbol')} ({m.get('slug')}, curated)")
        elif sym in seen_syms:
            pruned[ent].append(f"{m.get('symbol')} ({m.get('slug')}, dup symbol)")
        elif len(parts) > 1 and parts & seen_syms:
            pruned[ent].append(f"{m.get('symbol')} ({m.get('slug')}, part-dup)")
        else:
            kept.append(m)
            seen_syms.add(sym)
    if len(kept) != len(existing):
        net["MemberCoins"] = kept
        modified_nets.add(ent)

for ent, members in by_ent.items():
    net = nets.get(ent)
    if not net:
        continue
    existing = net.get("MemberCoins")
    if not isinstance(existing, list):
        existing = []
    ex_slugs = {m.get("slug") for m in existing}
    ex_syms = {norm_sym(m.get("symbol")) for m in existing}
    for it in members:
        slug, sym, cat = it.get("Slug"), it.get("Symbol"), it.get("Category")
        if slug in ex_slugs:
            continue
        if slug in REDUNDANT_REFS.get(ent, set()):
            skipped_collision.append((ent, sym, cat, slug))
            continue
        if norm_sym(sym) in ex_syms or (len(sym_parts(sym)) > 1 and sym_parts(sym) & ex_syms):
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
        ex_syms.add(norm_sym(sym))
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
import datetime
STAMP = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
for ent in modified_nets:
    nets[ent]["UpdatedAt"] = STAMP
if modified_nets:
    doc["_meta"]["updatedAt"] = STAMP

total_added = sum(len(v) for v in added.values())
total_pruned = sum(len(v) for v in pruned.values())
print(f"Networks modified: {len(modified_nets)}")
print(f"Total member refs ADDED: {total_added}")
print(f"Total member refs PRUNED: {total_pruned}")
if pruned:
    print("Pruned per network:")
    for ent in sorted(pruned):
        print(f"  {ent} (-{len(pruned[ent])}): {', '.join(pruned[ent])}")
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
