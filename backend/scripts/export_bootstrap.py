#!/usr/bin/env python3
"""Export backend/data/store.json to frontend/data/bootstrap-store.json."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
STORE_PATH = BACKEND_ROOT / "data" / "store.json"
BOOTSTRAP_PATH = REPO_ROOT / "frontend" / "data" / "bootstrap-store.json"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def main() -> int:
    if not STORE_PATH.exists():
        print(f"ERROR: {STORE_PATH} not found — run ingest scripts first.", file=sys.stderr)
        return 1
    store = json.loads(STORE_PATH.read_text(encoding="utf-8"))
    meta = store.setdefault("_meta", {})
    meta["updatedAt"] = _now_iso()
    meta["count"] = len(store.get("items", {}))
    meta.setdefault("backend", "local")
    meta.setdefault("table", "canhav-research")
    BOOTSTRAP_PATH.parent.mkdir(parents=True, exist_ok=True)
    BOOTSTRAP_PATH.write_text(json.dumps(store, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Exported {meta['count']} items to {BOOTSTRAP_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
