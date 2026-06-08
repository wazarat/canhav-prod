#!/usr/bin/env bash
#
# Push local backend/data/store.json to PRODUCTION Upstash via the deployed
# /api/admin/seed-store route. Use this when `vercel env pull` leaves Upstash
# integration vars empty locally (Vercel only injects them at runtime).
#
# Usage:
#   APPROVAL_TOKEN="<from Vercel dashboard>" ./scripts/push-store-prod.sh
#   APPROVAL_TOKEN=... ./scripts/push-store-prod.sh https://your-domain.vercel.app
#
# Vercel project (NOT canhav-prod):
#   https://vercel.com/wazarats-projects/canhav-prod-bvf7
# Production URL: https://canhav-prod-bvf7.vercel.app
#
# Get APPROVAL_TOKEN: canhav-prod-bvf7 → Settings → Environment Variables →
# APPROVAL_TOKEN → reveal (Production).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
STORE="${REPO_ROOT}/backend/data/store.json"
BASE_URL="${1:-https://canhav-prod-bvf7.vercel.app}"

if [ -z "${APPROVAL_TOKEN:-}" ]; then
  printf 'Paste APPROVAL_TOKEN (canhav-prod-bvf7 → Settings → Environment Variables → reveal): '
  read -rs APPROVAL_TOKEN
  echo
fi

if [ -z "${APPROVAL_TOKEN:-}" ]; then
  echo "ERROR: APPROVAL_TOKEN is required." >&2
  exit 1
fi

if [ ! -f "$STORE" ]; then
  echo "ERROR: $STORE not found. Run the ingest scripts first." >&2
  exit 1
fi

echo "Pushing store to ${BASE_URL}/api/admin/seed-store ..."
HTTP_CODE=""
RESP=""
if ! RESP="$(curl -sS -w "\n%{http_code}" -X POST "${BASE_URL}/api/admin/seed-store" \
  -H "Authorization: Bearer ${APPROVAL_TOKEN}" \
  -H "Content-Type: application/json" \
  --data-binary @"${STORE}")"; then
  echo "ERROR: curl failed (is ${BASE_URL} deployed with /api/admin/seed-store?)." >&2
  exit 1
fi

HTTP_CODE="$(echo "$RESP" | tail -1)"
BODY="$(echo "$RESP" | sed '$d')"

# #region agent log
python3 - <<'PY' "$HTTP_CODE" "$BODY" "$BASE_URL" 2>/dev/null || true
import json, sys, time, urllib.request
http_code, body, base = sys.argv[1], sys.argv[2], sys.argv[3]
payload = {
    "sessionId": "162226",
    "runId": "push-store",
    "hypothesisId": "H-seed-api",
    "location": "scripts/push-store-prod.sh",
    "message": "seed-store push result",
    "data": {"httpCode": int(http_code), "bodyPreview": body[:500], "baseUrl": base},
    "timestamp": int(time.time() * 1000),
}
try:
    req = urllib.request.Request(
        "http://127.0.0.1:7847/ingest/b307386e-41cb-4a3f-b3e7-4b589e3a6535",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "X-Debug-Session-Id": "162226"},
        method="POST",
    )
    urllib.request.urlopen(req, timeout=2)
except Exception:
    pass
PY
# #endregion

if [ "$HTTP_CODE" = "404" ]; then
  echo "ERROR: HTTP 404 — deploy canhav-prod-bvf7 with /api/admin/seed-store first." >&2
  echo "$BODY" >&2
  exit 1
fi

if [ "$HTTP_CODE" != "200" ]; then
  echo "ERROR: HTTP ${HTTP_CODE}" >&2
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY" >&2
  exit 1
fi

echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
echo ""
echo "Done. Spot-check: ${BASE_URL}/stablecoins/taud"
