/**
 * Static registry of the contracts behind CanHav, rendered on the public
 * /contracts transparency page. Contract addresses are public on-chain facts,
 * not secrets, so this module is safe to import on both server and client
 * (same pattern as lib/agent/fhe/config.ts). Chain: 421614.
 * Source of truth: contracts/broadcast deploy records.
 */

import {
  DATA_STORE,
  EXCHANGE_ROUTER,
  ORACLE,
  ORDER_VAULT,
  READER,
  ROUTER,
  USDC_SG,
} from "@/lib/agent/trade/gmx";

export interface ContractEntry {
  name: string;
  address: string;
  role: string;
  note?: string;
}

/** Deployer of every CanHav contract. */
export const DEPLOYER_ADDRESS = "0x7eCB39c481487F9826e2a4457599BA2F86Af0342";

/** Contracts deployed and operated by CanHav. */
export const CANHAV_CONTRACTS: ContractEntry[] = [
  {
    name: "IdentityRegistry",
    address: "0xbE0cc766f778212a066899b382f703Db35C92D72",
    role: "ERC-8004 agent identity. Every launched agent mints its on-chain identity here.",
  },
  {
    name: "SecurityRegistry",
    address: "0x0Fa1b8bBd33410e316B9d512bAd59DFCaf12097D",
    role: "Trade-target allowlist behind the research gate. No research, no trade.",
  },
  {
    name: "ReputationRegistry",
    address: "0xcB6aE87Aca8Fb6610Ec3B7b584B4F6eE360eF2a6",
    role: "On-chain reputation for agents.",
  },
  {
    name: "ValidationRegistry",
    address: "0x1927482802054499AbEf79Cd52dA62c5aEbD08a1",
    role: "Validation records for published research verdicts.",
  },
  {
    name: "EncryptedIntents",
    address: "0xF783423e211A54a9A5D0E544784c2f6A48B482fB",
    role: "Fhenix CoFHE encrypted trade intents and euint64 spending caps, checked on ciphertext.",
  },
  {
    name: "AgentFactory",
    address: "0x1a52c3F4D3C97a2986b6932aa2CABB7E5d0D2C1F",
    role: "Deploys each agent's own ledger account at launch.",
  },
  {
    name: "CnhvToken",
    address: "0x9F3d25f6fa15e2388a815C4ABd634891e52D3caD",
    role: "ERC-20 Permit platform credit token (tCNHV).",
    note: "Deployed; the marketplace UI that spends it is not currently exposed.",
  },
  {
    name: "CollabRegistry",
    address: "0xdDa75bf9E5712Dc07F65fED10a1bF5004a68c2F0",
    role: "Agent collaboration marketplace registry.",
    note: "Deployed; the marketplace UI is not currently exposed.",
  },
  {
    name: "CollabAgreement",
    address: "0x6f656812cE3298a8A7aDF340605F3082800BCbFb",
    role: "Agent collaboration agreements.",
    note: "Deployed; the marketplace UI is not currently exposed.",
  },
];

/**
 * Third-party contracts the platform executes against.
 * Integrated, not deployed by CanHav.
 */
export const INTEGRATED_CONTRACTS: ContractEntry[] = [
  {
    name: "GMX ExchangeRouter",
    address: EXCHANGE_ROUTER,
    role: "Perp order creation. Agents open real GMX V2 positions through this router.",
  },
  {
    name: "GMX Router",
    address: ROUTER,
    role: "ERC-20 approval spender for order collateral.",
  },
  {
    name: "GMX OrderVault",
    address: ORDER_VAULT,
    role: "Receives collateral and execution fees when an order is created.",
  },
  {
    name: "GMX Reader",
    address: READER,
    role: "Read-only access to positions, markets and pricing.",
  },
  {
    name: "GMX DataStore",
    address: DATA_STORE,
    role: "GMX V2 market state.",
  },
  {
    name: "GMX Oracle",
    address: ORACLE,
    role: "GMX V2 price oracle.",
  },
  {
    name: "USDC.SG (Stargate USDC)",
    address: USDC_SG,
    role: "Collateral token for the ETH/USD and BTC/USD markets.",
  },
];

export interface StackEntry {
  name: string;
  role: string;
}

/** The sponsor and partner technology CanHav is built with. */
export const STACK: StackEntry[] = [
  {
    name: "GMX",
    role: "Real perp execution on GMX V2. Keeper-executed fills are recorded for every trade.",
  },
  {
    name: "Fhenix CoFHE",
    role: "Fully homomorphic encryption: trade intents and spending caps stay encrypted and are verified on ciphertext.",
  },
  {
    name: "OpenZeppelin",
    role: "Every CanHav contract builds on OpenZeppelin libraries: ERC-721, ERC-20 Permit, EIP-712, Ownable, Clones.",
  },
  {
    name: "Alchemy",
    role: "On-chain reads that power the network research pages, including live Aave protocol data.",
  },
  {
    name: "Dune",
    role: "On-chain data overlays for peg and TVL series, plus agent verdict publishing.",
  },
];
