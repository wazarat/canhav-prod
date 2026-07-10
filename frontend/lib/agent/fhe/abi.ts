/** Minimal ABI for contracts/src/privacy/EncryptedIntents.sol. */
export const encryptedIntentsAbi = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "sizeUsdMicro",
        type: "tuple",
        components: [
          { name: "ctHash", type: "uint256" },
          { name: "securityZone", type: "uint8" },
          { name: "utype", type: "uint8" },
          { name: "signature", type: "bytes" },
        ],
      },
    ],
    outputs: [{ name: "handle", type: "uint256" }],
  },
  {
    type: "event",
    name: "IntentRegistered",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "handle", type: "uint256", indexed: false },
    ],
  },
] as const;
