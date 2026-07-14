#!/usr/bin/env bash
#
# regenerate-bootstrap.sh — run full local ingest and export bootstrap-store.json.
#
# Usage:
#   ./scripts/regenerate-bootstrap.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"
PYTHON_BIN="${PYTHON_BIN:-python3}"

export DB_BACKEND=local

cd "${BACKEND_DIR}"

for script in ingest_entities.py ingest_stablecoins.py ingest_tokens.py ingest_rwas.py; do
  echo ">>> ${script}"
  "${PYTHON_BIN}" "scripts/${script}"
done

if [ -f "${HOME}/Downloads/Protocol-Symbol-Chain-Contract.csv" ]; then
  echo ">>> ingest_protocol_coins.py"
  "${PYTHON_BIN}" scripts/ingest_protocol_coins.py || echo "WARN: ingest_protocol_coins.py failed (optional CSV step)"
else
  echo ">>> skipping ingest_protocol_coins.py (CSV not found)"
fi

echo ">>> validate_taxonomy.py --store"
"${PYTHON_BIN}" scripts/validate_taxonomy.py --store

echo ">>> refresh_live.py (live TVL overlay)"
"${PYTHON_BIN}" scripts/refresh_live.py || echo "WARN: refresh_live.py failed (live overlay only)"

echo ">>> export_bootstrap.py"
"${PYTHON_BIN}" scripts/export_bootstrap.py

# Re-apply the network MemberCoins forward-links (compiled coins/receipts linked
# from their EntitySlug). The Python specs don't emit these, so a fresh ingest
# drops them — this makes the regen self-healing. Idempotent + dedupes symbol
# collisions. Patches both the committed bundle and the local disk store.
echo ">>> backfill-member-coins.py (network MemberCoins forward-links)"
"${PYTHON_BIN}" "${REPO_ROOT}/frontend/scripts/backfill-member-coins.py" "${BACKEND_DIR}/data/store.json"
"${PYTHON_BIN}" "${REPO_ROOT}/frontend/scripts/backfill-member-coins.py" "${REPO_ROOT}/frontend/data/bootstrap-store.json"

echo "Done. Commit frontend/data/bootstrap-store.json after review."
