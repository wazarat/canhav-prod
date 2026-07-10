/**
 * FHE Phase 2: the browser derives agentCapKey when calling setCaps /
 * registerAndCheck, and the server re-derives it to verify the on-chain
 * cap-check binding (fheCapCheck.ts). Pinned vectors keep the two sides —
 * and any future reimplementation — from silently drifting: a drift would
 * make every cap-check verification fail closed.
 */
import { agentCapKey } from "./agentKey";

describe("agentCapKey", () => {
  test("matches pinned keccak256(utf8(agentId)) vectors", () => {
    expect(agentCapKey("did:privy:local-b2-verify")).toBe(
      "0xc9338db4512dee5448634c80de190caab6778247be21e145e7c182c05007d6dd",
    );
    expect(agentCapKey("900105")).toBe(
      "0xb62294906aab929996b5d18c0dbebfc6403a7677627c4e4edb6d96de49ca97d8",
    );
  });

  test("is deterministic and id-sensitive", () => {
    expect(agentCapKey("agent-a")).toBe(agentCapKey("agent-a"));
    expect(agentCapKey("agent-a")).not.toBe(agentCapKey("agent-b"));
  });
});
