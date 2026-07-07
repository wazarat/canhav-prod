"""Milestone-2 RWA characteristic metric blocks (spec §7).

Curated, off-chain research (custody, KYC/access, yield source, chains, governance)
for RWA-carrying entities, keyed by slug. The raw research lives as reviewable JSON in
``backend/data/rwa_m2_characteristics.json``; this module transforms it into the store
shape and merges it onto ``ENTITY_SPECS`` at ingest time.

Design notes:
  * Numeric metrics that the frontend renders through a ``Sourced<>`` field are wrapped
    with ``_sourced`` (dataSource "derived" — the only non-live provenance the UI models,
    matching the franklin-templeton seed). Plain-number and string/list fields pass through.
  * Null / empty values are dropped so the UI shows an honest "Not yet collected" state
    instead of a dead source dot. A characteristic sub-block that collapses to empty is
    omitted entirely.
  * ``tags_recommended`` (only set for entities that had no declared RWA tags) is applied
    to ``rwa_secondary_tags`` so the taxonomy stays in sync; existing tags are never
    overwritten.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

_DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "rwa_m2_characteristics.json"

# Fields the frontend reads via a Sourced<> wrapper (everything else is plain).
_SOURCED_GENERAL = {"aumUsd", "holders"}
_SOURCED_BY_BLOCK = {
    "institutionalGated": {"whitelistedAddresses"},
    "yieldBearing": {"currentYieldPct", "benchmarkSpreadPct", "benchmarkSofrPct"},
    "daoGoverned": {"proposalCount", "voterTurnoutPct", "treasuryUsd"},
    "multiChain": {"chainMarketSharePct"},
    "realWorldCustody": set(),
}
_SOURCE_LABEL = "Curated research"


def _sourced(value: Optional[float]) -> Dict[str, Any]:
    return {"value": value, "dataSource": "derived", "sourceLabel": _SOURCE_LABEL, "updatedAt": None}


def _keep(value: Any) -> bool:
    """Drop None and empty string/list/dict; keep 0 and False (real values)."""
    if value is None:
        return False
    if isinstance(value, (str, list, dict)) and len(value) == 0:
        return False
    return True


def _clean_block(block: Dict[str, Any], sourced_keys: set) -> Optional[Dict[str, Any]]:
    out: Dict[str, Any] = {}
    for key, val in block.items():
        if key in sourced_keys:
            if val is None:  # a Sourced field with no value → omit (honest empty state)
                continue
            out[key] = _sourced(val)
        elif _keep(val):
            out[key] = val
    return out or None


def _build(entry: Dict[str, Any]) -> Dict[str, Any]:
    result: Dict[str, Any] = {}

    general = _clean_block(entry.get("rwa_general") or {}, _SOURCED_GENERAL)
    if general:
        result["rwa_general"] = general

    chars: Dict[str, Any] = {}
    for block_key, block in (entry.get("characteristics") or {}).items():
        if not isinstance(block, dict):
            continue
        cleaned = _clean_block(block, _SOURCED_BY_BLOCK.get(block_key, set()))
        if cleaned:
            chars[block_key] = cleaned
    if chars:
        result["rwa_characteristics"] = chars

    result["tags_recommended"] = entry.get("tags_recommended") or []
    return result


def load_transformed() -> Dict[str, Dict[str, Any]]:
    raw = json.loads(_DATA_PATH.read_text(encoding="utf-8"))
    return {slug: _build(entry) for slug, entry in raw.items()}


def apply_rwa_m2_characteristics(entity_specs: Dict[str, Dict[str, Any]]) -> List[str]:
    """Merge curated M2 RWA blocks onto matching specs. Returns the slugs touched."""
    touched: List[str] = []
    for slug, built in load_transformed().items():
        spec = entity_specs.get(slug)
        if spec is None:
            continue
        if built.get("rwa_general"):
            spec["rwa_general"] = built["rwa_general"]
        if built.get("rwa_characteristics"):
            spec["rwa_characteristics"] = built["rwa_characteristics"]
        # Only seed tags when the entity had none declared (never clobber curated tags).
        recommended = built.get("tags_recommended") or []
        if recommended and not spec.get("rwa_secondary_tags"):
            spec["rwa_secondary_tags"] = recommended
        touched.append(slug)
    return touched


if __name__ == "__main__":
    data = load_transformed()
    for slug, built in data.items():
        chars = list((built.get("rwa_characteristics") or {}).keys())
        has_gen = "rwa_general" in built
        print(f"{slug:20} general={int(has_gen)} chars={chars} rec={built.get('tags_recommended')}")
