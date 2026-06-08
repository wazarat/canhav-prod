import type { SecurityInfo } from "./types";

/**
 * Inputs for deriving a protocol's {@link SecurityInfo}. Structural so it works
 * across Stablecoin / RWA / Token / Entity profiles (which expose different
 * subsets of audit metadata).
 */
export interface SecurityInputs {
  isPubliclyAudited?: boolean | null;
  auditUrl?: string | null;
  audits?: { url: string | null }[] | null;
}

/**
 * Derive the OZ-style security badge from existing audit metadata. This mirrors
 * the on-chain `SecurityRegistry` enum (Unverified < Audited < Verified):
 *   - `verified`   — a public audit link is on file (independently checkable),
 *   - `audited`    — the protocol reports an audit but no link is available,
 *   - `unverified` — no audit signal (agents are gated from these on-chain).
 */
export function deriveSecurityStatus(input: SecurityInputs): SecurityInfo {
  const auditLink =
    (input.auditUrl && input.auditUrl.trim()) ||
    input.audits?.find((a) => a.url)?.url ||
    null;
  const claimsAudited = Boolean(input.isPubliclyAudited) || (input.audits?.length ?? 0) > 0;

  if (auditLink) {
    return {
      status: "verified",
      auditUrl: auditLink,
      source: "OZ-derived · public audit on file",
    };
  }
  if (claimsAudited) {
    return {
      status: "audited",
      auditUrl: null,
      source: "OZ-derived · reported audited (no public link)",
    };
  }
  return {
    status: "unverified",
    auditUrl: null,
    source: "OZ-derived · unverified — agents are gated from interacting on-chain",
  };
}
