/**
 * Shared WebAuthn key serialization between client passkey ceremonies and
 * server auth/spawn routes.
 */

export interface SerializedWebAuthnKey {
  pubX: string;
  pubY: string;
  authenticatorId: string;
  authenticatorIdHash: string;
  rpID: string;
}

export interface WebAuthnKeyPayload {
  pubX: bigint;
  pubY: bigint;
  authenticatorId: string;
  authenticatorIdHash: `0x${string}`;
  rpID: string;
}

/** Reconstruct a WebAuthn key from JSON sent by the client. */
export function reconstructWebAuthnKey(raw: unknown): WebAuthnKeyPayload | null {
  const k = raw as Partial<SerializedWebAuthnKey> | undefined;
  if (
    !k ||
    k.pubX == null ||
    k.pubY == null ||
    !k.authenticatorId ||
    !k.authenticatorIdHash ||
    !k.rpID
  ) {
    return null;
  }
  if (!/^0x[0-9a-fA-F]+$/.test(k.authenticatorIdHash)) return null;
  return {
    pubX: BigInt(k.pubX),
    pubY: BigInt(k.pubY),
    authenticatorId: k.authenticatorId,
    authenticatorIdHash: k.authenticatorIdHash as `0x${string}`,
    rpID: k.rpID,
  };
}

/** Stable user id derived from the passkey authenticator hash. */
export function userIdFromWebAuthnKey(key: WebAuthnKeyPayload): string {
  return key.authenticatorIdHash.toLowerCase();
}
