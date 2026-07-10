/**
 * EncryptedIntents contract address (FHE Phase 1). Importable from both server
 * and client modules — contract addresses are not secrets, and the register()
 * tx is signed client-side by the owner's Privy wallet (gmx.ts ships trade
 * addresses to the client the same way).
 *
 * Deployed on Arbitrum Sepolia via contracts/script/DeployEncryptedIntents.s.sol;
 * override with NEXT_PUBLIC_FHE_INTENTS_ADDRESS (build-time env).
 */

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/** Filled from the DeployEncryptedIntents broadcast. Empty = not yet deployed. */
const FHE_INTENTS_FALLBACK = "";

export function fheIntentsAddress(): `0x${string}` | null {
  const fromEnv = process.env.NEXT_PUBLIC_FHE_INTENTS_ADDRESS;
  if (fromEnv && ADDRESS_RE.test(fromEnv)) return fromEnv as `0x${string}`;
  if (ADDRESS_RE.test(FHE_INTENTS_FALLBACK)) return FHE_INTENTS_FALLBACK as `0x${string}`;
  return null;
}
