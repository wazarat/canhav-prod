/**
 * Minimal ABIs for the on-chain calls the agent-service makes. Kept narrow and
 * `as const` so viem fully types args/returns. Mirrors `contracts/src`.
 */

export const identityRegistryAbi = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentURI", type: "string" },
      {
        name: "metadata",
        type: "tuple[]",
        components: [
          { name: "metadataKey", type: "string" },
          { name: "metadataValue", type: "bytes" },
        ],
      },
    ],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
  {
    type: "function",
    name: "setMetadata",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "metadataKey", type: "string" },
      { name: "metadataValue", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setAgentWallet",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "newWallet", type: "address" },
      { name: "deadline", type: "uint256" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getAgentWallet",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "totalAgents",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "Registered",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "agentURI", type: "string", indexed: false },
      { name: "owner", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "AgentWalletSet",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "newWallet", type: "address", indexed: true },
      { name: "owner", type: "address", indexed: true },
    ],
  },
] as const;

export const securityRegistryAbi = [
  {
    type: "function",
    name: "isAllowed",
    stateMutability: "view",
    inputs: [{ name: "target", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "statusOf",
    stateMutability: "view",
    inputs: [{ name: "target", type: "address" }],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

/** ReputationRegistry — signed feedback about agents (ERC-8004). */
export const reputationRegistryAbi = [
  {
    type: "function",
    name: "giveFeedback",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "value", type: "int128" },
      { name: "valueDecimals", type: "uint8" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
      { name: "endpoint", type: "string" },
      { name: "feedbackURI", type: "string" },
      { name: "feedbackHash", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;

/** CollabRegistry — on-chain attestation of agent-to-agent collaborations. */
export const collabRegistryAbi = [
  {
    type: "function",
    name: "recordCollab",
    stateMutability: "nonpayable",
    inputs: [
      { name: "fromAgentId", type: "uint256" },
      { name: "toAgentId", type: "uint256" },
      { name: "skillHash", type: "bytes32" },
      { name: "paymentRef", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getCollab",
    stateMutability: "view",
    inputs: [{ name: "collabId", type: "uint256" }],
    outputs: [
      { name: "fromAgentId", type: "uint256" },
      { name: "toAgentId", type: "uint256" },
      { name: "skillHash", type: "bytes32" },
      { name: "paymentRef", type: "bytes32" },
      { name: "recorder", type: "address" },
      { name: "timestamp", type: "uint64" },
    ],
  },
  {
    type: "function",
    name: "collabCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "paymentRefUsed",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "event",
    name: "CollabRecorded",
    inputs: [
      { name: "collabId", type: "uint256", indexed: true },
      { name: "fromAgentId", type: "uint256", indexed: true },
      { name: "toAgentId", type: "uint256", indexed: true },
      { name: "skillHash", type: "bytes32", indexed: false },
      { name: "paymentRef", type: "bytes32", indexed: false },
      { name: "recorder", type: "address", indexed: false },
    ],
  },
] as const;
