#!/usr/bin/env python3
"""Convert research-packet JSON files into properly-indented Python `_net(...)` kwargs.

Each research subagent writes a packet `<research-dir>/<slug>.json`. This script turns a
packet into a `<slug>.pytxt` snippet of Python keyword arguments (4-space nested
indentation matching the spec-file style) that you paste — or splice via a helper — into
that entity's spec call. Hand-transcribing rich JSON into Python is where mistakes creep
in; letting `json.load` give real Python `True/False/None` and formatting it once removes
that whole class of error.

Only fields present AND non-empty are emitted. Use `--exclude-json` to skip kwargs the
target spec ALREADY defines (passing a duplicate keyword arg is a Python SyntaxError) —
you learn which keys already exist from the discovery step in the skill.

Usage:
  python format_packet.py --research-dir DIR SLUG [SLUG ...]
  python format_packet.py --research-dir DIR --exclude-json exclude.json fluid venus ...

`exclude.json` shape:  {"fluid": ["competitors", "github"], "venus": ["competitors"]}
"""
import argparse
import json
from pathlib import Path

# JSON key -> _net/dict kwarg name, in the order we want them emitted. These are the
# editorial fields backing the six General Data tabs (see references/type-shapes.md).
FIELD_ORDER = [
    ("components", "components"),
    ("faq", "faq"),
    ("org_structure", "org_structure"),
    ("tradfi_comparison", "tradfi_comparison"),
    ("events", "events"),
    ("timeline", "timeline"),
    ("offchain_facts", "offchain_facts"),
    ("risks", "risks"),
    ("competitors", "competitors"),
    ("partnerships", "partnerships"),
    ("investment_rounds", "investment_rounds"),
    ("audits", "audits"),
    ("sources", "sources"),
    ("github", "github"),
]


def fmt(v, indent: int) -> str:
    """Recursively format a JSON-loaded value as valid, indented Python."""
    pad = " " * indent
    if isinstance(v, dict):
        if not v:
            return "{}"
        lines = ["{"]
        for k, val in v.items():
            lines.append(f"{pad}    {k!r}: {fmt(val, indent + 4)},")
        lines.append(pad + "}")
        return "\n".join(lines)
    if isinstance(v, list):
        if not v:
            return "[]"
        lines = ["["]
        for item in v:
            lines.append(f"{pad}    {fmt(item, indent + 4)},")
        lines.append(pad + "]")
        return "\n".join(lines)
    return repr(v)  # json.load already gives Python str/int/float/bool/None


def emit(slug: str, research_dir: Path, skip: set) -> str:
    data = json.loads((research_dir / f"{slug}.json").read_text(encoding="utf-8"))
    out = []
    for jkey, kwarg in FIELD_ORDER:
        if jkey not in data or kwarg in skip:
            continue
        val = data[jkey]
        if val in (None, [], "", {}):
            continue
        out.append(f"        {kwarg}={fmt(val, 8)},")
    return "\n".join(out)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("slugs", nargs="+")
    ap.add_argument("--research-dir", required=True, type=Path,
                    help="Directory holding <slug>.json research packets.")
    ap.add_argument("--out-dir", type=Path, default=None,
                    help="Where to write <slug>.pytxt (default: --research-dir).")
    ap.add_argument("--exclude-json", type=Path, default=None,
                    help="JSON mapping slug -> [kwargs to skip] (keys the spec already defines).")
    args = ap.parse_args()

    out_dir = args.out_dir or args.research_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    exclude = {}
    if args.exclude_json:
        exclude = json.loads(args.exclude_json.read_text(encoding="utf-8"))

    for slug in args.slugs:
        text = emit(slug, args.research_dir, set(exclude.get(slug, [])))
        (out_dir / f"{slug}.pytxt").write_text(text, encoding="utf-8")
        print(f"=== {slug} ({len(text.splitlines())} lines) ===")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
