/**
 * FHE privacy switch (roadmap D1 / FHE Phase 1). When ON, Trade Desk proposal
 * sizes are encrypted client-side with CoFHE (euint64 micro-USD) before they
 * reach the server, stored as ciphertext envelopes, and revealed only by the
 * owner (permit + threshold decrypt) or at Privy signing time.
 *
 * Default OFF: the plaintext trade flow is byte-identical to pre-FHE behavior.
 * Set NEXT_PUBLIC_FHE_ENABLED=1 (build-time env — Next.js inlines
 * NEXT_PUBLIC_* values, so a redeploy is required) to enable. Safe to import
 * from both server and client modules.
 */
export function fheEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FHE_ENABLED === "1";
}
