#!/usr/bin/env python3
"""
Validate entity specs and store items against taxonomy enums in app/db/schema.py.

Usage:
    python3 backend/scripts/validate_taxonomy.py              # validate ENTITY_SPECS
    python3 backend/scripts/validate_taxonomy.py --store      # validate local store.json
    python3 backend/scripts/validate_taxonomy.py --report-gaps

Stdlib only.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db import schema  # noqa: E402

STORE_PATH = BACKEND_ROOT / "data" / "store.json"

FIRST_CLASS_COIN_CATEGORIES = frozenset({"Stablecoin", "Token"})


def _sector_subsector_sets(sector: Optional[str]) -> Tuple[Optional[Tuple[str, ...]], Optional[Tuple[str, ...]]]:
    if sector == "Lending":
        return schema.LENDING_SUBSECTORS, schema.LENDING_TAGS
    if sector == "Stablecoin":
        return schema.STABLECOIN_SUBSECTORS, schema.STABLECOIN_SECONDARY_TAGS
    if sector == "DEX":
        return schema.DEX_SUBSECTORS, schema.DEX_SECONDARY_TAGS
    if sector == "RWA":
        return schema.RWA_SUBSECTORS, schema.RWA_SECONDARY_TAGS
    return None, None


def validate_entity_spec(slug: str, spec: Dict[str, Any], errors: List[str]) -> None:
    sector = spec.get("sector")
    if sector and sector not in schema.NETWORK_SECTORS:
        errors.append(f"{slug}: invalid sector {sector!r}")

    sub = spec.get("sub_sector")
    allowed_sub, _ = _sector_subsector_sets(sector)
    if sub and allowed_sub and sub not in allowed_sub:
        errors.append(f"{slug}: sub_sector {sub!r} not valid for sector {sector!r}")

    secondary = spec.get("secondary_sectors") or []
    if sector and sector in secondary:
        errors.append(f"{slug}: secondary_sectors duplicates primary sector {sector!r}")
    for s in secondary:
        if s not in schema.NETWORK_SECTORS:
            errors.append(f"{slug}: invalid secondary sector {s!r}")

    for tag in spec.get("tags") or []:
        if tag not in schema.LENDING_TAGS:
            errors.append(f"{slug}: invalid lending tag {tag!r}")

    for field, allowed in (
        ("stablecoin_sub_sector", schema.STABLECOIN_SUBSECTORS),
        ("dex_sub_sector", schema.DEX_SUBSECTORS),
        ("rwa_sub_sector", schema.RWA_SUBSECTORS),
    ):
        val = spec.get(field)
        if val and val not in allowed:
            errors.append(f"{slug}: invalid {field} {val!r}")

    for field, allowed in (
        ("stablecoin_secondary_tags", schema.STABLECOIN_SECONDARY_TAGS),
        ("dex_secondary_tags", schema.DEX_SECONDARY_TAGS),
        ("rwa_secondary_tags", schema.RWA_SECONDARY_TAGS),
    ):
        for tag in spec.get(field) or []:
            if tag not in allowed:
                errors.append(f"{slug}: invalid {field} tag {tag!r}")

    expected = schema.CROSS_SECTOR_MATRIX.get(slug)
    if expected is not None:
        have = set(secondary)
        missing = set(expected) - have
        extra = have - set(expected)
        if missing:
            errors.append(f"{slug}: missing cross-sector tags {sorted(missing)} (have {sorted(have)})")
        if extra:
            errors.append(f"{slug}: unexpected cross-sector tags {sorted(extra)} (expected {sorted(expected)})")


def validate_entity_specs(specs: Dict[str, Dict[str, Any]]) -> List[str]:
    errors: List[str] = []
    for slug, spec in specs.items():
        validate_entity_spec(slug, spec, errors)
    return errors


def validate_store_items(items: Dict[str, Any]) -> Tuple[List[str], List[str]]:
    """Validate store items; return (errors, gap_warnings)."""
    errors: List[str] = []
    gaps: List[str] = []
    entity_slugs: Set[str] = set()

    for key, item in items.items():
        if item.get("Category") in ("Entity", "Network"):
            entity_slugs.add(item.get("Slug", ""))

    for key, item in items.items():
        cat = item.get("Category")
        slug = item.get("Slug", key)

        if cat in ("Entity", "Network"):
            spec_like = {
                "sector": item.get("Sector"),
                "sub_sector": item.get("SubSector"),
                "secondary_sectors": item.get("SecondarySectors"),
                "tags": item.get("Tags"),
                "stablecoin_sub_sector": item.get("StablecoinSubSector"),
                "stablecoin_secondary_tags": item.get("StablecoinSecondaryTags"),
                "dex_sub_sector": item.get("DexSubSector"),
                "dex_secondary_tags": item.get("DexSecondaryTags"),
                "rwa_sub_sector": item.get("RwaSubSector"),
                "rwa_secondary_tags": item.get("RwaSecondaryTags"),
            }
            validate_entity_spec(slug, spec_like, errors)

            for ref in item.get("MemberCoins") or []:
                ref_slug = ref.get("slug")
                ref_cat = ref.get("category")
                found = any(
                    i.get("Slug") == ref_slug and i.get("Category") == ref_cat
                    for i in items.values()
                )
                if not found:
                    errors.append(f"{slug}: MemberCoin {ref_cat}/{ref_slug} not in store")

        if cat in FIRST_CLASS_COIN_CATEGORIES:
            subtype = item.get("AssetSubtype")
            if subtype and subtype not in schema.ASSET_SUBTYPES:
                errors.append(f"{slug}: invalid AssetSubtype {subtype!r}")
            if subtype == "stablecoin":
                errors.append(f"{slug}: bare AssetSubtype 'stablecoin' is forbidden")
            if not subtype:
                gaps.append(f"{cat}/{slug}: missing AssetSubtype")

            peg = item.get("PegMechanism")
            if peg and peg not in schema.PEG_MECHANISMS:
                errors.append(f"{slug}: invalid PegMechanism {peg!r}")

            entity_slug = item.get("EntitySlug")
            if entity_slug and entity_slug not in entity_slugs:
                errors.append(f"{slug}: EntitySlug {entity_slug!r} not found")

    return errors, gaps


def load_entity_specs() -> Dict[str, Dict[str, Any]]:
    from ingest_entities import ENTITY_SPECS  # noqa: E402

    return ENTITY_SPECS


def main(argv: List[str]) -> int:
    report_gaps = "--report-gaps" in argv
    use_store = "--store" in argv

    if use_store:
        if not STORE_PATH.exists():
            print(f"ERROR: {STORE_PATH} not found — run ingest scripts first.", file=sys.stderr)
            return 1
        store = json.loads(STORE_PATH.read_text(encoding="utf-8"))
        items = store.get("items", {})
        errors, gaps = validate_store_items(items)
        print(f"Validated {len(items)} store items")
    else:
        specs = load_entity_specs()
        errors = validate_entity_specs(specs)
        gaps = []
        print(f"Validated {len(specs)} entity specs")

    if errors:
        print("ERRORS:")
        for e in errors:
            print(f"  - {e}")
    else:
        print("OK: no taxonomy errors")

    if report_gaps and gaps:
        print("GAPS:")
        for g in gaps:
            print(f"  - {g}")

    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
