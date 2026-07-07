/**
 * GMX V2 (Synthetics) contract addresses on Arbitrum Sepolia.
 *
 * ⚠️ Re-verify before integrating — GMX testnet contracts are redeployed
 * frequently. Confirm against https://github.com/gmx-io/gmx-synthetics
 * docs/arbitrumSepolia-deployments.md at build/deploy time.
 *
 * Architecture: V2 only (no V1 Vault/GLP). Perps open via ExchangeRouter
 * multicall (sendWnt + sendTokens + createOrder) after Router approval.
 */

export const GMX_CHAIN_ID = 421614 as const;

/** Primary trade target — createOrder for open long/short. */
export const EXCHANGE_ROUTER = "0xEd50B2A1eF0C35DAaF08Da6486971180237909c3" as const;

/** ERC-20 approval spender before creating orders. */
export const ROUTER = "0x72F13a44C8ba16a678CAD549F17bc9e06d2B8bD2" as const;

/** Collateral + execution fee destination on order creation. Must be allowlisted. */
export const ORDER_VAULT = "0x1b8AC606de71686fd2a1AEDEcb6E0EFba28909a2" as const;

/** Off-chain reads: positions, markets, pricing. */
export const READER = "0x4750376b9378294138Cf7B7D69a2d243f4940f71" as const;

export const DATA_STORE = "0xCF4c2C4c53157BcC01A596e3788fFF69cBBCD201" as const;

export const ORACLE = "0x0dC4e24C63C24fE898Dda574C962Ba7Fbb146964" as const;

/**
 * Circle USDC on Arbitrum Sepolia — common GMX testnet collateral.
 * Re-verify if trades fail on collateral transfer.
 */
export const SEPOLIA_USDC =
  "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" as const;

/** v1 fixed leverage cap. */
export const MAX_LEVERAGE = 2;

/** v1 fixed trade size ceiling (USD, 30 decimals internally). */
export const MAX_SIZE_USD = 50n * 10n ** 30n;

/** Default execution fee (wei) for keeper — small testnet amount. */
export const DEFAULT_EXECUTION_FEE = 500_000_000_000_000n; // 0.0005 ETH
