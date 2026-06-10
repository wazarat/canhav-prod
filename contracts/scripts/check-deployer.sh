#!/usr/bin/env bash
# Print deployer address + Arbitrum Sepolia balance from contracts/.env
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env — copy .env.example to .env and set PRIVATE_KEY."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

if [[ -z "${PRIVATE_KEY:-}" ]]; then
  echo "PRIVATE_KEY is empty in .env"
  exit 1
fi

RPC="${ARBITRUM_SEPOLIA_RPC_URL:-https://sepolia-rollup.arbitrum.io/rpc}"
ADDR="$(cast wallet address --private-key "$PRIVATE_KEY")"
BAL="$(cast balance "$ADDR" --rpc-url "$RPC")"
BAL_ETH="$(cast from-wei "$BAL" eth 2>/dev/null || echo "$BAL wei")"

echo "Deployer address: $ADDR"
echo "Arbitrum Sepolia balance: $BAL_ETH"

if [[ "$BAL" == "0" ]]; then
  echo ""
  echo "ERROR: balance is 0 — forge --broadcast will fail with 'insufficient funds'."
  echo "Fund this address on Arbitrum Sepolia, or run: ./scripts/set-deployer-key.sh"
  exit 1
fi

echo ""
echo "OK — ready to deploy."
