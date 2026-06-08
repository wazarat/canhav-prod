#!/usr/bin/env bash
#
# seed-prod.sh — re-seed the PRODUCTION Upstash Redis store with the full,
# expanded dataset by running every ingest script against DB_BACKEND=redis.
#
# WHY: ingest_*.py default to DB_BACKEND=local and write to the gitignored
# backend/data/store.json. Production Next.js reads Upstash Redis, so local
# ingests never reach the live site. This wrapper points them at Redis.
#
# NO git operations. NO Supabase. Never prints the REDIS_URL secret.
# Frontend reads Redis live — no redeploy needed after this runs.
#
# Usage:
#   REDIS_URL="rediss://..." ./scripts/seed-prod.sh           # seed only
#   REDIS_URL="rediss://..." ./scripts/seed-prod.sh --refresh # also run live overlay
#   ./scripts/seed-prod.sh --help
#
# REDIS_URL resolution order:
#   1. Existing env var REDIS_URL
#   2. frontend/.env.local   (run `vercel env pull frontend/.env.local` first)
#   3. backend/.env
# REDIS_STORE_KEY is optional (default: canhav:store). It MUST match the key the
# frontend reads.

set -euo pipefail

# --- locate repo root (this file lives in <root>/scripts) --------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"

RUN_REFRESH=0
for arg in "$@"; do
  case "$arg" in
    --refresh) RUN_REFRESH=1 ;;
    -h|--help)
      sed -n '2,30p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "Unknown argument: $arg (use --refresh or --help)" >&2; exit 2 ;;
  esac
done

# --- load REDIS_URL / REDIS_STORE_KEY from env files if not already set ------
# Only pulls these two keys; does not export the whole env file.
load_key_from_file() {
  # $1 = var name, $2 = file path
  local var="$1" file="$2" line val
  [ -n "${!var:-}" ] && return 0
  [ -f "$file" ] || return 0
  line="$(grep -E "^[[:space:]]*${var}=" "$file" | tail -1 || true)"
  [ -z "$line" ] && return 0
  val="${line#*=}"
  # strip surrounding quotes and trailing CR/whitespace
  val="${val%$'\r'}"; val="${val%\"}"; val="${val#\"}"; val="${val%\'}"; val="${val#\'}"
  [ -n "$val" ] && export "$var=$val"
}

for f in "${REPO_ROOT}/frontend/.env.local" "${BACKEND_DIR}/.env"; do
  load_key_from_file REDIS_URL "$f"
  load_key_from_file REDIS_STORE_KEY "$f"
done

# --- preconditions -----------------------------------------------------------
if [ -z "${REDIS_URL:-}" ]; then
  echo "ERROR: REDIS_URL is not set and was not found in frontend/.env.local or backend/.env." >&2
  echo "       Run 'vercel env pull frontend/.env.local' or export REDIS_URL=rediss://... first." >&2
  exit 1
fi
case "$REDIS_URL" in
  rediss://*) ;;
  redis://*)  echo "WARNING: REDIS_URL uses redis:// (no TLS). Upstash expects rediss://." >&2 ;;
  *) echo "ERROR: REDIS_URL must start with rediss:// (got an unexpected scheme)." >&2; exit 1 ;;
esac

export DB_BACKEND=redis
STORE_KEY="${REDIS_STORE_KEY:-canhav:store}"

# Masked host (never print the secret/password portion of the URL).
REDIS_HOST="$(printf '%s' "$REDIS_URL" | sed -E 's#^rediss?://([^@]*@)?([^:/?]+).*#\2#')"

PYTHON_BIN="${PYTHON_BIN:-python3}"

echo "============================================================"
echo " CanHav — seed PRODUCTION Upstash Redis"
echo "------------------------------------------------------------"
echo " Repo root   : ${REPO_ROOT}"
echo " DB_BACKEND  : ${DB_BACKEND}"
echo " Redis host  : ${REDIS_HOST}        (URL/secret hidden)"
echo " Store key   : ${STORE_KEY}         (frontend MUST read this same key)"
echo " Live refresh: $([ "$RUN_REFRESH" -eq 1 ] && echo yes || echo no)"
echo "============================================================"

# --- confirmation (skip with SEED_YES=1 for non-interactive/CI) --------------
if [ "${SEED_YES:-0}" != "1" ]; then
  printf 'This OVERWRITES production data in the "%s" hash. Continue? [y/N] ' "$STORE_KEY"
  read -r reply
  case "$reply" in y|Y|yes|YES) ;; *) echo "Aborted."; exit 0 ;; esac
fi

# --- run one script; fail fast unless it confirms RedisAdapter ---------------
run_ingest() {
  local script="$1" path="${BACKEND_DIR}/scripts/$1" out
  echo ""
  echo ">>> ${script}"
  # tee so the human sees full output; capture to assert the backend line.
  out="$("${PYTHON_BIN}" "$path" 2>&1 | tee /dev/stderr)"
  if printf '%s' "$out" | grep -q "Backend *: *LocalAdapter"; then
    echo "FATAL: ${script} ran against LocalAdapter, not Redis. DB_BACKEND did not take." >&2
    echo "       Production was NOT modified by this script. Aborting." >&2
    exit 1
  fi
  if ! printf '%s' "$out" | grep -q "Backend *: *RedisAdapter"; then
    echo "WARNING: could not confirm 'Backend : RedisAdapter' in ${script} output." >&2
  fi
}

cd "${BACKEND_DIR}"

run_ingest "ingest_entities.py"
run_ingest "ingest_stablecoins.py"
run_ingest "ingest_tokens.py"
run_ingest "ingest_rwas.py"

if [ "$RUN_REFRESH" -eq 1 ]; then
  echo ""
  echo ">>> refresh_live.py (live price/TVL overlay)"
  "${PYTHON_BIN}" "${BACKEND_DIR}/scripts/refresh_live.py" || \
    echo "WARNING: refresh_live.py failed (overlay only; seeded data is fine)." >&2
fi

# --- verification: count items per Category in the Redis hash ----------------
echo ""
echo ">>> Verifying row counts in Redis hash '${STORE_KEY}' ..."
"${PYTHON_BIN}" - "$STORE_KEY" <<'PY'
import json, os, sys, collections
sys.path.insert(0, os.path.join(os.environ["PWD"], "app", ".."))  # backend on path
from app.db import get_repository  # uses DB_BACKEND=redis from env
store_key = sys.argv[1]
repo = get_repository()
items = repo.all()
by_cat = collections.Counter(i.get("Category", "?") for i in items)
print(f"  Total items in '{store_key}': {len(items)}")
for cat, n in sorted(by_cat.items()):
    print(f"    {cat:<12} {n}")
# Spot-check the expansion actually landed.
enriched = sum(1 for i in items if i.get("AssetSubtype") or i.get("OffchainFacts") or i.get("Timeline"))
print(f"  Items carrying expansion fields (AssetSubtype/OffchainFacts/Timeline): {enriched}")
if enriched == 0:
    print("  WARNING: no expansion fields found — did you run the latest ingest scripts?")
PY

echo ""
echo "Done. Frontend reads Redis live — no redeploy required."
echo "Project: https://vercel.com/wazarats-projects/canhav-prod-bvf7"
echo "Verify:  https://canhav-prod-bvf7.vercel.app/entities/usd-ai"
