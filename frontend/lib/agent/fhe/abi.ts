/** Minimal ABI for contracts/src/privacy/EncryptedIntents.sol. */

const IN_EUINT64 = [
  { name: "ctHash", type: "uint256" },
  { name: "securityZone", type: "uint8" },
  { name: "utype", type: "uint8" },
  { name: "signature", type: "bytes" },
] as const;

export const encryptedIntentsAbi = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [{ name: "sizeUsdMicro", type: "tuple", components: IN_EUINT64 }],
    outputs: [{ name: "handle", type: "uint256" }],
  },
  {
    type: "function",
    name: "setCaps",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentKey", type: "bytes32" },
      { name: "perTradeCapMicro", type: "tuple", components: IN_EUINT64 },
      { name: "cumulativeCapMicro", type: "tuple", components: IN_EUINT64 },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "registerAndCheck",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentKey", type: "bytes32" },
      { name: "sizeUsdMicro", type: "tuple", components: IN_EUINT64 },
    ],
    outputs: [
      { name: "sizeHandle", type: "uint256" },
      { name: "okHandle", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "recordSpend",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentKey", type: "bytes32" },
      { name: "sizeHandle", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "hasCaps",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "agentKey", type: "bytes32" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "capWindowStart",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "agentKey", type: "bytes32" },
    ],
    outputs: [{ type: "uint64" }],
  },
  {
    type: "function",
    name: "capCheckOf",
    stateMutability: "view",
    inputs: [{ name: "sizeHandle", type: "uint256" }],
    outputs: [
      { name: "owner", type: "address" },
      { name: "agentKey", type: "bytes32" },
      { name: "okHandle", type: "uint256" },
      { name: "spendRecorded", type: "bool" },
    ],
  },
  {
    type: "event",
    name: "IntentRegistered",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "handle", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "CapsSet",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "agentKey", type: "bytes32", indexed: true },
    ],
  },
  {
    type: "event",
    name: "CapChecked",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "agentKey", type: "bytes32", indexed: true },
      { name: "sizeHandle", type: "uint256", indexed: false },
      { name: "okHandle", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "SpendRecorded",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "agentKey", type: "bytes32", indexed: true },
      { name: "sizeHandle", type: "uint256", indexed: false },
    ],
  },
] as const;

/**
 * CoFHE TaskManager (same address on every CoFHE chain — hardcoded in
 * FHE.sol). The server verifies threshold-decrypt attestations against
 * decryptResultSigner(); confirmed nonzero on Arbitrum Sepolia.
 */
export const COFHE_TASK_MANAGER = "0xeA30c4B8b44078Bbf8a6ef5b9f1eC1626C7848D9" as const;

export const cofheTaskManagerAbi = [
  {
    type: "function",
    name: "decryptResultSigner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;
