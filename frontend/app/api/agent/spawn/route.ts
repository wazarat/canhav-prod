import { NextResponse } from "next/server";

import { hasZeroDev } from "@/lib/agent/config";
import { deriveAccountIndex } from "@/lib/agent/account-index";
import { canhavPublicOrigin } from "@/lib/agent/public-url";
import { resolveEntityBinding } from "@/lib/agent/entity-binding";
import { getAgentProfile, markSkillStudied, seedAgentProfile } from "@/lib/agent/memory";
import { getAgentSkillById } from "@/lib/agent/skills";
import { reconstructWebAuthnKey } from "@/lib/auth/webauthn";
import { getSession } from "@/lib/auth/session";
import { getUserEntityAgent, linkAgentToUser, setUserEntityAgent } from "@/lib/auth/users";
import { readSecret } from "@/lib/server/env";

/**
 * ERC-8004 spawn bridge.
 *
 * Given a passkey `webAuthnKey` (from the client WebAuthn ceremony) and a
 * `skillId`, mints the agent's on-chain identity by dynamically importing the
 * standalone `agent-service` and calling `spawnAgentFromSkill`. The agent's
 * smart account is passkey-owned (no seed phrase) and the mint is gas-sponsored
 * by ZeroDev. On success the agent is seeded into memory so it has a home.
 *
 * Returns 503 { configured: false } until ZeroDev + the registries are
 * provisioned — the build and every other surface never depend on it.
 */

export const runtime = "nodejs";
// Vercel Hobby (free) plan caps function duration at 60s. The passkey → ZeroDev
// sponsored mint is a single user-op and completes well within this.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const REGISTRY_ENV = [
  "ZERODEV_RPC",
  "IDENTITY_REGISTRY_ADDRESS",
  "SECURITY_REGISTRY_ADDRESS",
  "ARBITRUM_SEPOLIA_RPC_URL",
  "ARBISCAN_API_KEY",
] as const;

/**
 * agent-service `loadConfig()` reads `process.env`; locally these may live in
 * backend/.env (read via readSecret). Mirror them into process.env so the
 * dynamically-imported service sees them without changing its contract.
 */
function hydrateEnvFromSecrets(): void {
  for (const name of REGISTRY_ENV) {
    if (!process.env[name]) {
      const value = readSecret(name);
      if (value) process.env[name] = value;
    }
  }
}

/**
 * Turn a raw spawn/ZeroDev failure into a clean, actionable message instead of
 * dumping the verbose viem RPC error (calldata, user-op, etc.) at the user.
 *
 * The ZeroDev paymaster can return `403 Unauthorized` on
 * `pm_getPaymasterStubData`. We confirmed via live RPC replay that this is
 * NOT (necessarily) a missing gas policy or exhausted credits: ZeroDev refuses
 * to sponsor userOps validated by the older UNPATCHED passkey validators,
 * returning the literal body `Unauthorized: wapk`. The account builder now
 * pins the PATCHED validator (V0_0_3_PATCHED), so a recurrence most likely
 * means a real policy/credit issue — but flag the validator version too.
 */
function describeSpawnError(e: unknown): { message: string; code?: string } {
  const raw = e instanceof Error ? e.message : String(e ?? "");
  const haystack = raw.toLowerCase();
  const looksLikePaymasterAuth =
    haystack.includes("getpaymasterstubdata") ||
    haystack.includes("getpaymasterdata") ||
    haystack.includes("wapk") ||
    (haystack.includes("paymaster") && haystack.includes("unauthorized")) ||
    ((haystack.includes("status: 403") || haystack.includes("status 403")) &&
      haystack.includes("zerodev"));

  if (looksLikePaymasterAuth) {
    const wapk = haystack.includes("wapk");
    return {
      code: "paymaster_unauthorized",
      message: wapk
        ? "Gas sponsorship was rejected by ZeroDev (paymaster 403 \"wapk\"). This means the " +
          "passkey validator contract is not sponsorable — the deployment must use the patched " +
          "validator (PasskeyValidatorContractVersion.V0_0_3_PATCHED). Redeploy with the fix, then mint again."
        : "Gas sponsorship was rejected by ZeroDev (paymaster 403). Add an active gas " +
          "policy for Arbitrum Sepolia (chain 421614) in your ZeroDev dashboard and confirm " +
          "the project still has testnet credits, then mint again.",
    };
  }

  if (haystack.includes("missing required env var") || haystack.includes("zerodev_rpc")) {
    return {
      code: "not_configured",
      message:
        "On-chain identity is not fully configured — set ZERODEV_RPC, " +
        "IDENTITY_REGISTRY_ADDRESS, and SECURITY_REGISTRY_ADDRESS for this environment.",
    };
  }

  return { message: raw || "Spawn failed." };
}

export async function POST(req: Request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Sign in with your passkey before launching an agent." },
      { status: 401 },
    );
  }

  if (!hasZeroDev()) {
    return NextResponse.json(
      {
        configured: false,
        error: "On-chain identity not configured (ZERODEV_RPC + registry addresses).",
      },
      { status: 503 },
    );
  }

  let body: { skillId?: string; entitySlug?: string; webAuthnKey?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const skillId = typeof body.skillId === "string" ? body.skillId : "";
  const webAuthnKey = reconstructWebAuthnKey(body.webAuthnKey);
  if (!skillId || !webAuthnKey) {
    return NextResponse.json(
      { ok: false, error: "skillId and a valid webAuthnKey are required." },
      { status: 400 },
    );
  }

  const skill = await getAgentSkillById(skillId);
  if (!skill) {
    return NextResponse.json({ ok: false, error: `Unknown skill "${skillId}".` }, { status: 404 });
  }

  // Skills are 1:1 with Entities, so the project slug defaults to the skill id.
  const entitySlug =
    typeof body.entitySlug === "string" && body.entitySlug ? body.entitySlug : skillId;
  const binding = await resolveEntityBinding(entitySlug);
  const associatedProducts = binding?.associatedProducts ?? [];

  // Idempotency: one agent per (wallet, project). If the wallet already has an
  // agent for this entity, return it instead of minting a duplicate identity.
  const existingAgentId = await getUserEntityAgent(session.userId, entitySlug);
  if (existingAgentId) {
    const existing = await getAgentProfile(existingAgentId);
    if (existing) {
      const reusedRegistry = readSecret("IDENTITY_REGISTRY_ADDRESS");
      return NextResponse.json({
        ok: true,
        reused: true,
        agentId: existing.agentId,
        agentAddress: existing.agentAddress,
        agentURI: existing.agentURI,
        arbiscanUrl: existing.agentAddress
          ? `https://sepolia.arbiscan.io/address/${existing.agentAddress}`
          : null,
        tokenUrl:
          reusedRegistry && /^\d+$/.test(existing.agentId)
            ? `https://sepolia.arbiscan.io/token/${reusedRegistry}?a=${existing.agentId}`
            : null,
      });
    }
  }

  const accountIndex = deriveAccountIndex(session.userId, entitySlug);

  hydrateEnvFromSecrets();

  // Prefer CANHAV_PUBLIC_URL so tokenURI stays on the stable apex (canhav.co).
  const baseUrl = canhavPublicOrigin(new URL(req.url).origin);

  try {
    const svc = await import("canhav-agent-service");
    const cfg = svc.loadConfig();
    const result = await svc.spawnAgentFromSkill({
      cfg,
      skill,
      webAuthnKey,
      index: BigInt(accountIndex),
      entity: binding?.entitySlug ?? entitySlug,
      associatedProducts,
      baseUrl,
    });

    const agentId = result.agentId.toString();
    const agentAddress = result.agentAddress;
    const agentURI = result.agentURI;
    const arbiscanUrl = `https://sepolia.arbiscan.io/address/${agentAddress}`;
    // Arbiscan-first: a direct link to the minted ERC-721 token on the registry.
    const registry = readSecret("IDENTITY_REGISTRY_ADDRESS");
    const tokenUrl = registry
      ? `https://sepolia.arbiscan.io/token/${registry}?a=${agentId}`
      : null;

    await seedAgentProfile({
      agentId,
      name: skill.title,
      skillId,
      entitySlug,
      associatedProducts,
      accountIndex,
      agentAddress,
      agentURI,
      onChain: true,
    });
    await markSkillStudied(agentId, skillId);
    await linkAgentToUser(session.userId, agentId);
    await setUserEntityAgent(session.userId, entitySlug, agentId);

    return NextResponse.json({ ok: true, agentId, agentAddress, agentURI, arbiscanUrl, tokenUrl });
  } catch (e) {
    // Log the verbatim failure so the TRUE paymaster reason (e.g. `Unauthorized:
    // wapk` vs `did not match any gas sponsoring policies` vs a request-limit
    // hit) is visible in Vercel function logs — the user-facing message below is
    // deliberately generic and hardcodes "403", which hides which failure it is.
    console.error("[agent/spawn] mint failed:", e instanceof Error ? e.stack ?? e.message : e);
    const { message, code } = describeSpawnError(e);
    return NextResponse.json({ ok: false, error: message, code }, { status: 500 });
  }
}
