import "server-only";

import { createHash } from "node:crypto";

/**
 * Derive a stable, user-scoped agent id from a login user id.
 *
 * The user id is the Privy DID (e.g. `did:privy:...`) issued by social login.
 * We hash it to a short, collision-resistant slug so the default research agent
 * id is deterministic per user and safe across any id format.
 */
export function userAgentId(userId: string): string {
  const slug = createHash("sha256").update(userId).digest("hex").slice(0, 16);
  return `user_${slug}`;
}
