#!/usr/bin/env python3
"""
Push the local file store (``backend/data/store.json``) into the production
Upstash Redis hash over the **REST** API.

Why this exists
---------------
Production (Vercel) reads the single-table store from Upstash Redis, while the
ingestion scripts (``ingest_stablecoins.py`` / ``ingest_entities.py`` /
``ingest_tokens.py``) write to the local file store by default. ``store.json`` is
gitignored, so ``git push`` never carries data to production — you must seed
Upstash separately.

The ``RedisAdapter`` (redis-py) needs a ``rediss://`` ``REDIS_URL``. The Vercel
"Upstash for Redis" integration instead injects **REST** credentials
(``KV_REST_API_URL`` / ``KV_REST_API_TOKEN``) — the very same ones the Next.js
frontend uses (`frontend/lib/server/redis.ts`). This script talks that REST API
directly with the stdlib (``urllib``), so it needs no installs and exactly the
env the frontend already relies on.

It writes the same hash + field scheme the frontend reads:
    key   = ``canhav:store`` (override with REDIS_STORE_KEY)
    field = ``<PK>|<SK>``  e.g. ``CATEGORY#Stablecoin|PROTOCOL#usdc``
    value = the JSON-encoded item

Credentials (any one pair, checked in this order):
    KV_REST_API_URL          + KV_REST_API_TOKEN            (Vercel integration)
    UPSTASH_REDIS_REST_URL   + UPSTASH_REDIS_REST_TOKEN     (native Upstash)

Get them locally with:  vercel env pull frontend/.env.local   (then export),
or copy from the Upstash console / Vercel project settings.

Usage:
    # Seed every local item into Upstash (additive HSET; safe to re-run):
    KV_REST_API_URL=... KV_REST_API_TOKEN=... \\
        python3 backend/scripts/sync_to_upstash.py

    # Mirror exactly (delete the whole hash first, then re-seed):
    ... python3 backend/scripts/sync_to_upstash.py --replace

    # Show what would be sent, change nothing:
    ... python3 backend/scripts/sync_to_upstash.py --dry-run

Stdlib only.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Dict, List, Optional, Tuple

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
DEFAULT_STORE = BACKEND_ROOT / "data" / "store.json"
DEFAULT_BOOTSTRAP = REPO_ROOT / "frontend" / "data" / "bootstrap-store.json"
DEFAULT_KEY = "canhav:store"
DEFAULT_ENV_FILES = (
    REPO_ROOT / "frontend" / ".env.local",
    REPO_ROOT / "frontend" / ".env.production.local",
)

# Legacy fields to remove from production so it mirrors the current local store
# (the combined "usd-ai" stablecoin was superseded by USDai + sUSDai).
LEGACY_FIELDS = ["CATEGORY#Stablecoin|PROTOCOL#usd-ai"]


def _strip_quotes(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        return value[1:-1]
    return value


def load_env_file(path: Path) -> None:
    """Best-effort load of KEY=VALUE lines into os.environ (only if unset)."""
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        trimmed = line.strip()
        if not trimmed or trimmed.startswith("#") or "=" not in trimmed:
            continue
        key, _, raw = trimmed.partition("=")
        key = key.strip()
        if not key or key in os.environ:
            continue
        os.environ[key] = _strip_quotes(raw)


def credential_status() -> Tuple[Optional[str], Optional[str], str]:
    """Return (url, token, human-readable status)."""
    url = rest_url()
    token = rest_token()
    if url and token:
        return url, token, "ok"
    empty_keys = []
    for path in DEFAULT_ENV_FILES:
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            trimmed = line.strip()
            if not trimmed or trimmed.startswith("#") or "=" not in trimmed:
                continue
            key, _, raw = trimmed.partition("=")
            key = key.strip()
            if key not in (
                "KV_REST_API_URL",
                "KV_REST_API_TOKEN",
                "UPSTASH_REDIS_REST_URL",
                "UPSTASH_REDIS_REST_TOKEN",
            ):
                continue
            if not _strip_quotes(raw):
                empty_keys.append(f"{key} (in {path.name})")
    if empty_keys:
        return url, token, "empty_placeholders:" + ",".join(empty_keys)
    return url, token, "missing"


def rest_url() -> Optional[str]:
    return os.environ.get("KV_REST_API_URL") or os.environ.get("UPSTASH_REDIS_REST_URL")


def rest_token() -> Optional[str]:
    return os.environ.get("KV_REST_API_TOKEN") or os.environ.get("UPSTASH_REDIS_REST_TOKEN")


def store_key() -> str:
    return os.environ.get("REDIS_STORE_KEY", DEFAULT_KEY)


def _command(url: str, token: str, args: List[str]) -> dict:
    """POST a single Redis command (as a JSON array) to the Upstash REST API."""
    body = json.dumps(args).encode("utf-8")
    req = urllib.request.Request(
        url.rstrip("/"),
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:  # surface Upstash's error body
        detail = exc.read().decode("utf-8", "replace")
        raise SystemExit(f"Upstash REST error {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"Could not reach Upstash REST endpoint: {exc.reason}") from exc
    if isinstance(payload, dict) and payload.get("error"):
        raise SystemExit(f"Upstash command error: {payload['error']}")
    return payload


def load_items(store_path: Path) -> Dict[str, dict]:
    if not store_path.exists():
        raise SystemExit(f"ERROR: local store not found at {store_path}")
    data = json.loads(store_path.read_text(encoding="utf-8"))
    items = data.get("items")
    if not isinstance(items, dict):
        raise SystemExit(f"ERROR: {store_path} has no 'items' object.")
    return items


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(description="Seed Upstash Redis from the local store.")
    parser.add_argument("store", nargs="?", default=str(DEFAULT_STORE), help="Path to store.json")
    parser.add_argument(
        "--bootstrap",
        action="store_true",
        help=f"Seed from committed bootstrap bundle ({DEFAULT_BOOTSTRAP.name}) instead of local store.json.",
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        help="DEL the hash first so production mirrors local exactly.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be written; change nothing.",
    )
    args = parser.parse_args(argv[1:])

    store_path = Path(DEFAULT_BOOTSTRAP if args.bootstrap else args.store).expanduser()

    for env_path in DEFAULT_ENV_FILES:
        load_env_file(env_path)

    url, token, cred_state = credential_status()
    if not args.dry_run and (not url or not token):
        msg = (
            "ERROR: Upstash REST credentials missing or empty.\n"
            "Vercel's Upstash integration often writes empty placeholders to "
            "`.env.local` on `vercel env pull` — secrets only exist at runtime on Vercel.\n\n"
            "Fix (pick one):\n"
            "  1. Upstash console → your database → REST API → copy URL + token, then:\n"
            "       export KV_REST_API_URL=... KV_REST_API_TOKEN=...\n"
            "       python3 backend/scripts/sync_to_upstash.py --replace\n"
            "  2. After deploying to canhav-prod-bvf7, push via the seed API (no Upstash creds locally):\n"
            "       APPROVAL_TOKEN=<token> ./scripts/push-store-prod.sh\n"
            "       (defaults to https://canhav-prod-bvf7.vercel.app)\n"
        )
        if cred_state.startswith("empty_placeholders"):
            msg += f"\nDetected empty vars: {cred_state.split(':', 1)[1]}\n"
        raise SystemExit(msg)

    items = load_items(store_path)
    key = store_key()

    # Build a single HSET with every field/value pair (Upstash accepts multi-field).
    hset_args: List[str] = ["HSET", key]
    by_category: Dict[str, int] = {}
    for field, item in items.items():
        published = {**item, "Status": "APPROVED"}
        hset_args.extend([field, json.dumps(published, ensure_ascii=False)])
        cat = item.get("Category", "?")
        by_category[cat] = by_category.get(cat, 0) + 1

    print(f"Store      : {store_path}")
    print(f"Hash key   : {key}")
    print(f"Endpoint   : {url or '(dry-run, no endpoint)'}")
    print(f"Items      : {len(items)}  " + ", ".join(f"{c}={n}" for c, n in sorted(by_category.items())))
    print(f"Mode       : {'REPLACE (DEL then HSET)' if args.replace else 'additive HSET'}")
    print("-" * 64)

    if args.dry_run:
        for field in items:
            print(f"  HSET {key} {field}")
        for field in LEGACY_FIELDS:
            print(f"  HDEL {key} {field}  (legacy cleanup)")
        print("-" * 64)
        print("Dry run — nothing written.")
        return 0

    assert url and token  # narrowed above

    if args.replace:
        _command(url, token, ["DEL", key])
        print(f"Deleted existing hash {key!r}.")

    if len(hset_args) > 2:
        written = _command(url, token, hset_args)
        print(f"HSET ok (new fields added: {written}).")
    else:
        print("No items to write.")

    # Drop superseded legacy fields so production matches local.
    removed = 0
    for field in LEGACY_FIELDS:
        res = _command(url, token, ["HDEL", key, field])
        if isinstance(res, int):
            removed += res
    if removed:
        print(f"Removed {removed} legacy field(s): {', '.join(LEGACY_FIELDS)}")

    print("-" * 64)
    print(
        f"Synced {len(items)} item(s) to Upstash (Status=APPROVED). The frontend picks "
        "them up on its next ISR revalidation (or redeploy)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
