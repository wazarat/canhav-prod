import "server-only";

import { readSecret } from "@/lib/server/env";

/** ERC-8004 registration file MIME type (EIP-8004). */
export const ERC8004_REGISTRATION_TYPE =
  "https://eips.ethereum.org/EIPS/eip-8004#registration-v1" as const;

/**
 * Stable public origin for agent cards and minted tokenURIs.
 * Prefer `CANHAV_PUBLIC_URL` (e.g. https://canhav.co) so previews do not
 * pin tokenURI to a Vercel deployment URL.
 */
export function canhavPublicOrigin(fallbackOrigin: string): string {
  const configured = readSecret("CANHAV_PUBLIC_URL");
  const origin = (configured ?? fallbackOrigin).trim();
  return origin.replace(/\/+$/, "");
}
