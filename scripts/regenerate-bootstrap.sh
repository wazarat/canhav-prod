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

echo ">>> export_bootstrap.py"
"${PYTHON_BIN}" scripts/export_bootstrap.py

echo "Done. Commit frontend/data/bootstrap-store.json after review."
