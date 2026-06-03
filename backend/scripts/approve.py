#!/usr/bin/env python3
"""
Step 4, Goal A — flip a protocol's approval status from the command line.

The CLI is the approval gate: running this script is the privileged action, so
no extra auth is layered on top (your terminal IS the gate). It calls the same
``Repository.update_status`` engine used everywhere else, so it works against
the LocalAdapter (default) or DynamoDB (``DB_BACKEND=dynamo``) with no change.

Usage:
    # Approve a single protocol (default status = APPROVED)
    python3 backend/scripts/approve.py --category Stablecoin --slug usdc
    python3 backend/scripts/approve.py --category RWA --slug centrifuge

    # Revert one back to PENDING_APPROVAL
    python3 backend/scripts/approve.py --category RWA --slug centrifuge --revert

    # Set an explicit status
    python3 backend/scripts/approve.py --category Stablecoin --slug usdc --status PENDING_APPROVAL

    # List every staged item and its current status (no changes)
    python3 backend/scripts/approve.py --list

With ``DB_BACKEND=redis`` this writes straight to Upstash and the frontend
picks up the change on its next revalidation — no export step.

Stdlib only.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import List, Optional

# Make `app` importable regardless of the current working directory.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.db import get_repository, schema  # noqa: E402

CATEGORIES = {
    "Stablecoin": schema.CATEGORY_STABLECOIN,
    "RWA": schema.CATEGORY_RWA,
    "Entity": schema.CATEGORY_ENTITY,
    "Token": schema.CATEGORY_TOKEN,
}


def _print_listing(repo) -> None:
    items = repo.all()
    print(f"Backend : {type(repo).__name__}")
    print(f"Items   : {len(items)}")
    print("-" * 72)
    print(f"{'STATUS':<18}{'CATEGORY':<14}{'SLUG':<24}{'NAME'}")
    print("-" * 72)
    for it in items:
        status = it.get("Status", "?")
        category = it.get("Category", "?")
        slug = schema.slug_from_sk(it.get(schema.SK, ""))
        name = it.get("Name", "")
        print(f"{status:<18}{category:<14}{slug:<24}{name}")
    print("-" * 72)


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(
        description="Flip a protocol's approval status (CanHav approval gate).",
    )
    parser.add_argument(
        "--category",
        choices=sorted(CATEGORIES.keys()),
        help="Taxonomy category (partition) the protocol lives in.",
    )
    parser.add_argument(
        "--slug",
        help="Protocol slug, e.g. 'usdc' or 'centrifuge'.",
    )
    parser.add_argument(
        "--status",
        choices=list(schema.VALID_STATUSES),
        default=schema.STATUS_APPROVED,
        help=f"Target status (default: {schema.STATUS_APPROVED}).",
    )
    parser.add_argument(
        "--revert",
        action="store_true",
        help=f"Shortcut for --status {schema.STATUS_PENDING}.",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List every staged item and its status, then exit (no changes).",
    )
    args = parser.parse_args(argv[1:])

    repo = get_repository()

    if args.list:
        _print_listing(repo)
        return 0

    if not args.category or not args.slug:
        parser.error("--category and --slug are required (or use --list).")

    target_status: str = schema.STATUS_PENDING if args.revert else args.status

    pk = schema.category_pk(CATEGORIES[args.category])
    sk = schema.protocol_sk(args.slug)

    existing: Optional[dict] = repo.get_item(pk, sk)
    if existing is None:
        print(
            f"ERROR: no item found for category={args.category!r} slug={args.slug!r} "
            f"(PK={pk}, SK={sk}).",
            file=sys.stderr,
        )
        print("Tip: run with --list to see available slugs.", file=sys.stderr)
        return 1

    before = existing.get("Status", "?")
    if before == target_status:
        print(
            f"No change: {args.category}/{args.slug} is already {target_status}."
        )
        return 0

    updated = repo.update_status(pk, sk, target_status)
    if updated is None:
        print(
            f"ERROR: update_status returned None for {pk}|{sk}.",
            file=sys.stderr,
        )
        return 1

    after = updated.get("Status", "?")
    print(f"Backend : {type(repo).__name__}")
    print(f"Protocol: {args.category}/{args.slug}  ({updated.get('Name', '')})")
    print(f"Status  : {before} -> {after}")
    print(f"Updated : {updated.get('UpdatedAt', '')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
