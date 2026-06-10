#!/usr/bin/env bash
# Securely set PRIVATE_KEY in contracts/.env (testnet deployer only).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RPC="${ARBITRUM_SEPOLIA_RPC_URL:-https://sepolia-rollup.arbitrum.io/rpc}"
ARBiscan="${ARBISCAN_API_KEY:-}"

echo "Paste your MetaMask private key (MetaMask exports it WITHOUT 0x — that's fine)."
echo "Input is hidden. Testnet only — never use a mainnet key."
read -rsp "PRIVATE_KEY: " PK
echo ""

# Normalize: strip whitespace and any surrounding quotes.
PK="${PK//[[:space:]]/}"
PK="${PK//\"/}"
PK="${PK//\'/}"
# MetaMask exports 64 hex chars without a prefix — add 0x automatically.
if [[ "$PK" =~ ^[0-9a-fA-F]{64}$ ]]; then
  PK="0x$PK"
fi

if [[ ! "$PK" =~ ^0x[0-9a-fA-F]{64}$ ]]; then
  echo "Invalid format — expected 64 hex characters (with or without 0x prefix)."
  exit 1
fi

ADDR="$(cast wallet address --private-key "$PK")"
BAL="$(cast balance "$ADDR" --rpc-url "$RPC")"
BAL_ETH="$(cast from-wei "$BAL" eth 2>/dev/null || echo "$BAL wei")"

echo "Address: $ADDR"
echo "Balance: $BAL_ETH"

cat > .env <<EOF
# Local deploy secrets — gitignored. Testnet deployer only.

PRIVATE_KEY=$PK
ARBITRUM_SEPOLIA_RPC_URL=$RPC
ARBISCAN_API_KEY=$ARBiscan
EOF

chmod 600 .env 2>/dev/null || true

echo ""
if [[ "$BAL" == "0" ]]; then
  echo "Saved .env, but balance is still 0. Fund $ADDR on Arbitrum Sepolia before deploying."
  exit 1
fi

echo "Saved .env. Run: npm run deploy:arbitrum-sepolia"
