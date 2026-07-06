#!/usr/bin/env python3
"""Surgically overlay authored editorial fields onto the committed store JSON
(frontend/data/bootstrap-store.json) and the local-dev mirror (backend/data/store.json).

WHY THIS EXISTS: the ingest pipeline is LOSSY — a full regen rebuilds items from specs
only and drops seeded MemberCoins and live enrichments. This patch instead rebuilds each
item from its canonical spec via `build_entity_item` and overlays ONLY a whitelist of
editorial keys, and ONLY when the freshly-built value is non-empty. That non-empty guard
is the safety mechanism: it never blanks seeded MemberCoins on stub entities (whose specs
have `member_coins=[]`), and it never touches CurrentScale / sector metrics / live blocks
(which aren't in the whitelist anyway). The Python spec stays the single source of truth.

Usage:
  # by explicit slug list:
  python patch_sector.py --repo /path/to/canhav-prod --slugs aave,compound,morpho,...

  # or auto-discover every entity whose spec sector matches:
  python patch_sector.py --repo /path/to/canhav-prod --sector Staking
"""
import argparse
import json
import sys
from pathlib import Path

# Editorial keys backing the six General Data tabs. GitHub is included (stubs may gain a
# repo link). Descriptive/scale/member keys are intentionally EXCLUDED so nothing
# unrelated is churned and seeded MemberCoins are never blanked.
EDITORIAL_KEYS = [
    "GitHub", "Components", "Faq", "OrgStructure", "TradFiComparison",
    "Risks", "Events", "Timeline", "OffchainFacts", "Sources", "Audits",
    "Competitors", "Partnerships", "InvestmentRounds",
    # M2 curated metric blocks (only RWA specs set these; non-empty guard makes
    # this a no-op for every other sector).
    "RwaGeneral", "RwaCharacteristics",
]

# Placeholder created_at; real CreatedAt on the existing store item is always preserved.
CREATED_AT_FALLBACK = "2026-06-01T00:00:00Z"


def key_for(slug: str) -> str:
    return f"CATEGORY#Entity|PROTOCOL#{slug}"


def _nonempty(v) -> bool:
    if v is None:
        return False
    if isinstance(v, (list, dict, str)) and len(v) == 0:
        return False
    return True


def patch_file(path: Path, built_by_slug: dict, now_iso: str, *, trailing_newline: bool) -> None:
    store = json.loads(path.read_text(encoding="utf-8"))
    items = store.setdefault("items", {})
    changed = []
    for slug, built in built_by_slug.items():
        k = key_for(slug)
        existing = items.get(k)
        if existing is None:
            raise SystemExit(f"{path.name}: {k} not found — refusing to create a new entity.")
        existing.setdefault("CreatedAt", built.get("CreatedAt"))
        touched = 0
        for ek in EDITORIAL_KEYS:
            val = built.get(ek)
            if _nonempty(val):
                existing[ek] = val
                touched += 1
        existing["UpdatedAt"] = now_iso
        changed.append((slug, touched))
    store["_meta"] = store.get("_meta", {})
    store["_meta"]["updatedAt"] = now_iso
    store["_meta"]["count"] = len(items)
    text = json.dumps(store, indent=2, ensure_ascii=False)
    if trailing_newline:
        text += "\n"
    path.write_text(text, encoding="utf-8")
    print(f"patched {path.name}: {len(items)} items; overlaid {len(changed)} entities.")
    for slug, n in changed:
        print(f"    {slug:16} {n} editorial keys")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--repo", required=True, type=Path, help="Repo root (canhav-prod).")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--slugs", help="Comma-separated entity slugs to patch.")
    g.add_argument("--sector", help="Patch every ENTITY_SPECS entry with spec['sector']==SECTOR.")
    args = ap.parse_args()

    repo = args.repo.resolve()
    sys.path.insert(0, str(repo / "backend" / "scripts"))
    import ingest_entities as ie  # noqa: E402

    if args.slugs:
        slugs = [s.strip() for s in args.slugs.split(",") if s.strip()]
    else:
        slugs = sorted(s for s, sp in ie.ENTITY_SPECS.items() if sp.get("sector") == args.sector)
    if not slugs:
        raise SystemExit("No slugs to patch — check --slugs / --sector.")
    print(f"patching {len(slugs)} entities: {', '.join(slugs)}\n")

    built_by_slug = {}
    for slug in slugs:
        spec = ie.ENTITY_SPECS.get(slug)
        if spec is None:
            raise SystemExit(f"spec not found for slug '{slug}'.")
        enriched = ie.apply_minimal_research(spec, slug)
        built_by_slug[slug] = ie.build_entity_item(slug, enriched, None, CREATED_AT_FALLBACK)

    now_iso = ie._now_iso()
    bootstrap = repo / "frontend" / "data" / "bootstrap-store.json"
    backend = repo / "backend" / "data" / "store.json"

    patch_file(bootstrap, built_by_slug, now_iso, trailing_newline=True)
    if not backend.exists():
        backend.parent.mkdir(parents=True, exist_ok=True)
        backend.write_text(bootstrap.read_text(encoding="utf-8"), encoding="utf-8")
        print(f"created {backend} from bootstrap (already patched).")
    else:
        patch_file(backend, built_by_slug, now_iso, trailing_newline=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
