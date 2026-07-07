import { NextResponse } from "next/server";

import {
  collabSettlement,
  hasTcnhv,
  parseAmountToBaseUnits,
  TCNHV_DECIMALS,
  tcnhvAssetAddress,
} from "@/lib/agent/collab-config";
import { hasPrivyWallet } from "@/lib/agent/config";
import { getAgentProfile } from "@/lib/agent/memory";
import { userOwnsAgent } from "@/lib/agent/ownership";
import { getSession } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/auth/users";
import { readSecret } from "@/lib/server/env";
import {
  recordWalletTransfer,
  type WalletTransferKind,
} from "@/lib/server/walletLog";

/**
 * Wallet treasury transfer.
 *
 * POST (preflight)  body { to, amount }            -> resolves the recipient
 *   address (raw 0x / agent id / user id) and returns the params the browser
 *   needs to sign a plain ERC-20 `transfer` from the user's Privy wallet.
 * POST (confirm)    body { to, amount, txHash, .. } -> records the settled
 *   transfer in the user's `wallet:transfers` log.
 *
 * No funds move server-side: the transfer is client-signed. The treasury wallet
 * is allowlisted at signup, so a transfer from it always clears the tCNHV
 * merit-signal transfer rule.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

interface ResolvedRecipient {
  address: string;
  kind: WalletTransferKind;
  label: string | null;
}

async function resolveRecipient(raw: string): Promise<ResolvedRecipient | null> {
  const to = raw.trim();
  if (!to) return null;

  if (ADDRESS_RE.test(to)) {
    return { address: to, kind: "address", label: null };
  }

  // Agent id -> its on-chain smart account (where it holds spendable credits).
  const agent = await getAgentProfile(to);
  if (agent?.agentAddress && ADDRESS_RE.test(agent.agentAddress)) {
    return { address: agent.agentAddress, kind: "agent", label: agent.name ?? to };
  }

  // User id (Privy DID) -> their canonical treasury wallet.
  const user = await getUserProfile(to);
  if (user?.address && ADDRESS_RE.test(user.address)) {
    return { address: user.address, kind: "user", label: user.displayName ?? user.email ?? to };
  }

  return null;
}

export async function POST(req: Request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in." }, { status: 401 });
  }
  if (!hasTcnhv()) {
    return NextResponse.json({ ok: false, error: "Credits aren't configured." }, { status: 400 });
  }

  let body: { to?: unknown; amount?: unknown; txHash?: unknown; toLabel?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const to = typeof body.to === "string" ? body.to.trim() : "";
  const amountHuman = typeof body.amount === "string" ? body.amount.trim() : "";
  if (!to) {
    return NextResponse.json({ ok: false, error: "A recipient is required." }, { status: 400 });
  }

  let amount: bigint;
  try {
    amount = parseAmountToBaseUnits(amountHuman, TCNHV_DECIMALS);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid amount." }, { status: 400 });
  }
  if (amount <= 0n) {
    return NextResponse.json({ ok: false, error: "Amount must be greater than zero." }, {
      status: 400,
    });
  }

  const recipient = await resolveRecipient(to);
  if (!recipient) {
    return NextResponse.json(
      { ok: false, error: "Could not resolve that recipient. Use a wallet address, agent id, or user id." },
      { status: 404 },
    );
  }

  if (recipient.kind === "agent" && !(await userOwnsAgent(session.userId, to))) {
    return NextResponse.json(
      { ok: false, error: "That agent isn't yours." },
      { status: 403 },
    );
  }

  // Confirm path: a settled tx hash means record it and return.
  const txHash = typeof body.txHash === "string" ? body.txHash.trim() : "";
  if (txHash) {
    await recordWalletTransfer(session.userId, {
      to: recipient.address,
      toLabel:
        (typeof body.toLabel === "string" && body.toLabel.trim()) || recipient.label || null,
      kind: recipient.kind,
      amount: amountHuman,
      asset: collabSettlement().name,
      txHash,
      at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, recorded: true });
  }

  // Preflight path: return the signing params for a client-signed transfer.
  const rpcUrl =
    readSecret("ARBITRUM_SEPOLIA_RPC_URL") ?? "https://sepolia-rollup.arbitrum.io/rpc";
  if (!hasPrivyWallet()) {
    return NextResponse.json(
      { ok: false, error: "On-chain transfers aren't available in this environment." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    payTo: recipient.address,
    kind: recipient.kind,
    label: recipient.label,
    token: tcnhvAssetAddress(),
    asset: collabSettlement().name,
    amount: amount.toString(),
    humanAmount: amountHuman,
    rpcUrl,
  });
}
