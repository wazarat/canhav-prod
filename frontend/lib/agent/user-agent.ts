/**
 * Derive a stable, user-scoped agent id from a passkey user id (authenticator hash).
 * Replaces the shared "sandbox" agent in authenticated sessions.
 */
export function userAgentId(userId: string): string {
  const hex = userId.startsWith("0x") ? userId.slice(2) : userId;
  const slug = hex.replace(/[^a-f0-9]/gi, "").slice(0, 16) || "anon";
  return `user_${slug}`;
}
