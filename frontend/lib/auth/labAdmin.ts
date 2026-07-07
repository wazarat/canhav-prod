import "server-only";

import { requireAdmin } from "@/lib/auth/admin";
import type { SessionPayload } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/auth/users";
import { readSecret } from "@/lib/server/env";

function envList(name: string): string[] {
  const raw = readSecret(name);
  if (!raw) return [];
  return raw
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Operator gate for Agent Lab internals (the provisioning readiness panel).
 * A user qualifies when:
 *  - their Privy-linked email is in ADMIN_EMAILS (comma-separated), or
 *  - their Privy DID is in ADMIN_USER_IDS (covers wallet-only logins that
 *    have no email on the profile), or
 *  - they hold a valid Supabase /admin session (the existing admins table).
 * Returns false on any gap — end users never see provisioning.
 */
export async function isLabAdmin(session: SessionPayload | null): Promise<boolean> {
  if (session) {
    const userIds = envList("ADMIN_USER_IDS");
    if (userIds.includes(session.userId.toLowerCase())) return true;

    const emails = envList("ADMIN_EMAILS");
    if (emails.length > 0) {
      const email = (await getUserProfile(session.userId))?.email?.trim().toLowerCase();
      if (email && emails.includes(email)) return true;
    }
  }

  return (await requireAdmin()) !== null;
}
