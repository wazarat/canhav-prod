import { keccak256, stringToBytes } from "viem";

/**
 * On-chain namespace key for an agent's encrypted caps (FHE Phase 2).
 * keccak256 of the platform agent id — deliberately NOT the ERC-8004 uint256
 * id, so agents without an on-chain identity still get encrypted caps. The
 * contract scopes every cap by (owner address, agentKey), so a colliding or
 * forged key from another wallet can never touch this owner's caps.
 *
 * Shared by the browser (setCaps / registerAndCheck args) and the server
 * (capCheckOf binding verification) — a jest test pins the derivation.
 */
export function agentCapKey(agentId: string): `0x${string}` {
  return keccak256(stringToBytes(agentId));
}
