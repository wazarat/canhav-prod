import "server-only";

import { PrivyClient } from "@privy-io/server-auth";

import { readSecret } from "@/lib/server/env";

/**
 * Server-side Privy access-token verification.
 *
 * Privy issues each social-login user a self-custodial embedded wallet and a
 * signed access token. We verify that token here (replacing the old WebAuthn
 * ceremony) and use the Privy DID as the stable CanHav user id. A verified token
 * is what mints the httpOnly session cookie in `/api/auth/privy`.
 */

let cached: PrivyClient | null = null;

/** True when both the public app id and the server secret are configured. */
export function hasPrivyServer(): boolean {
  return Boolean(readSecret("NEXT_PUBLIC_PRIVY_APP_ID") && readSecret("PRIVY_APP_SECRET"));
}

function getClient(): PrivyClient | null {
  const appId = readSecret("NEXT_PUBLIC_PRIVY_APP_ID");
  const appSecret = readSecret("PRIVY_APP_SECRET");
  if (!appId || !appSecret) return null;
  if (!cached) cached = new PrivyClient(appId, appSecret);
  return cached;
}

export interface VerifiedPrivyUser {
  /** Stable CanHav user id = the Privy DID (e.g. `did:privy:...`). */
  userId: string;
}

/** Verify a Privy access token; returns the user id (DID) or null. */
export async function verifyPrivyToken(accessToken: string): Promise<VerifiedPrivyUser | null> {
  const client = getClient();
  if (!client || !accessToken) return null;
  try {
    const claims = await client.verifyAuthToken(accessToken);
    if (!claims?.userId) return null;
    return { userId: claims.userId };
  } catch {
    return null;
  }
}
