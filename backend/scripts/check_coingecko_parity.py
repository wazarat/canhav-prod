#!/usr/bin/env python3
"""
Compare Python vs TypeScript CoinGecko slug maps for parity.

Usage:
    python3 backend/scripts/check_coingecko_parity.py

Stdlib only.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
TS_PATH = BACKEND_ROOT.parent / "frontend" / "lib" / "server" / "coingecko.ts"

sys.path.insert(0, str(BACKEND_ROOT))
from app.live.coingecko import COINGECKO_IDS  # noqa: E402


def parse_ts_map(path: Path) -> dict[str, str | None]:
    text = path.read_text(encoding="utf-8")
    block_match = re.search(r"const COINGECKO_IDS[^=]*=\s*\{([^}]+)\}", text, re.S)
    if not block_match:
        raise SystemExit(f"Could not parse COINGECKO_IDS from {path}")
    block = block_match.group(1)
    out: dict[str, str | None] = {}
    for line in block.splitlines():
        m = re.match(r'\s*"?([a-z0-9-]+)"?\s*:\s*(?:"([^"]*)"|null)\s*,?\s*(?://.*)?$', line)
        if m:
            out[m.group(1)] = m.group(2) if m.group(2) is not None else None
    return out


def main() -> int:
    ts_map = parse_ts_map(TS_PATH)
    py_keys = set(COINGECKO_IDS)
    ts_keys = set(ts_map)
    errors: list[str] = []

    for key in sorted(py_keys | ts_keys):
        py_val = COINGECKO_IDS.get(key)
        ts_val = ts_map.get(key)
        if key not in py_keys:
            errors.append(f"{key}: missing in Python map (TS={ts_val!r})")
        elif key not in ts_keys:
            errors.append(f"{key}: missing in TS map (Python={py_val!r})")
        elif py_val != ts_val:
            errors.append(f"{key}: Python={py_val!r} TS={ts_val!r}")

    if errors:
        print("CoinGecko map drift:")
        for e in errors:
            print(f"  - {e}")
        return 1
    print(f"OK: {len(py_keys)} slugs in sync between Python and TypeScript")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
