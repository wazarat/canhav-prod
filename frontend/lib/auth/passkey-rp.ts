/**
 * Resolve the WebAuthn Relying Party ID (RP ID) for the passkey ceremony.
 *
 * Passkeys are permanently bound to their RP ID (a domain), and a credential is
 * invisible on any other RP ID. To keep sign-in stable across `canhav.co`,
 * `www.canhav.co`, and any future subdomain, pin the RP ID to the registrable
 * apex via `NEXT_PUBLIC_PASSKEY_RP_ID` (e.g. `canhav.co`).
 *
 * The WebAuthn spec requires the RP ID to equal the current origin host or be a
 * registrable parent suffix of it. So we only use the configured value when it
 * actually matches the current host; otherwise (localhost, a preview URL, the
 * old *.vercel.app domain) we fall back to the live hostname so those origins
 * keep working instead of throwing a SecurityError.
 */
export function resolvePasskeyRpId(): string {
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const configured = process.env.NEXT_PUBLIC_PASSKEY_RP_ID?.trim();
  if (!configured) return host;
  if (host === configured || host.endsWith(`.${configured}`)) {
    return configured;
  }
  return host;
}
