import { NextResponse } from "next/server";

import { defaultCollabPriceUsdc } from "@/lib/agent/collab-config";
import { getAgentProfile } from "@/lib/agent/memory";
import { userAgentId } from "@/lib/agent/user-agent";
import { getSession } from "@/lib/auth/session";
import { listUserAgentIds } from "@/lib/auth/users";
import {
  DEFAULT_COOLDOWN_SECONDS,
  HARD_MAX_INSTALLMENTS,
  HARD_MAX_UNITS,
  listAgreementsForUser,
  proposeAgreement,
  type AgreementCadence,
  type AgreementMode,
} from "@/lib/server/collabAgreements";

/**
 * Human-in-the-loop collaboration agreements.
 *   GET  -> the caller's agreements, split into { asBuyer, asSeller }.
 *   POST -> the buyer proposes an agreement against a seller agent. The seller's
 *           human owner must then approve it via POST /api/collab/agreements/[id].
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in." }, { status: 401 });
  }
  const { asBuyer, asSeller } = await listAgreementsForUser(session.userId);
  return NextResponse.json({ ok: true, asBuyer, asSeller });
}

interface ProposeBody {
  buyerAgentId?: string;
  sellerAgentId?: string;
  objective?: string;
  maxUnitsPerInteraction?: number;
  totalInstallments?: number;
  cooldownSeconds?: number;
  mode?: string;
  cadence?: string;
}

const VALID_CADENCES: AgreementCadence[] = ["none", "daily", "weekly", "monthly"];

export async function POST(req: Request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in." }, { status: 401 });
  }

  let body: ProposeBody;
  try {
    body = (await req.json()) as ProposeBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const buyerAgentId = (body.buyerAgentId ?? "").trim();
  const sellerAgentId = (body.sellerAgentId ?? "").trim();
  const objective = (body.objective ?? "").trim();
  if (!buyerAgentId || !sellerAgentId) {
    return NextResponse.json(
      { ok: false, error: "buyerAgentId and sellerAgentId are required." },
      { status: 400 },
    );
  }
  if (buyerAgentId === sellerAgentId) {
    return NextResponse.json(
      { ok: false, error: "An agent cannot contract with itself." },
      { status: 400 },
    );
  }
  if (!objective) {
    return NextResponse.json(
      { ok: false, error: "Describe what you want to learn (objective)." },
      { status: 400 },
    );
  }

  const ownedIds = new Set([
    userAgentId(session.userId),
    ...(await listUserAgentIds(session.userId)),
  ]);
  if (!ownedIds.has(buyerAgentId)) {
    return NextResponse.json({ ok: false, error: "Buyer agent isn't yours." }, { status: 403 });
  }

  const seller = await getAgentProfile(sellerAgentId);
  if (!seller) {
    return NextResponse.json({ ok: false, error: "Seller agent not found." }, { status: 404 });
  }
  if (!seller.discoverable) {
    return NextResponse.json(
      { ok: false, error: "Seller agent is not open for collaboration." },
      { status: 409 },
    );
  }

  const buyer = await getAgentProfile(buyerAgentId);

  // The seller's configured ceiling caps what the buyer can request per interaction.
  const sellerCeiling = seller.collabMaxUnits ?? HARD_MAX_UNITS;
  const requestedMax = clampInt(body.maxUnitsPerInteraction ?? sellerCeiling, 1, HARD_MAX_UNITS);
  const maxUnitsPerInteraction = Math.min(requestedMax, sellerCeiling);
  const totalInstallments = clampInt(
    body.totalInstallments ?? 4,
    1,
    HARD_MAX_INSTALLMENTS,
  );
  const cooldownSeconds = clampInt(
    body.cooldownSeconds ?? DEFAULT_COOLDOWN_SECONDS,
    0,
    86_400,
  );

  // One-time vs recurring shape. Validate the cadence; recurring requires one.
  const mode: AgreementMode = body.mode === "recurring" ? "recurring" : "one_time";
  let cadence: AgreementCadence = "none";
  if (mode === "recurring") {
    if (body.cadence != null && !VALID_CADENCES.includes(body.cadence as AgreementCadence)) {
      return NextResponse.json(
        { ok: false, error: "cadence must be one of: daily, weekly, monthly." },
        { status: 400 },
      );
    }
    cadence = (body.cadence as AgreementCadence) ?? "weekly";
    if (cadence === "none") cadence = "weekly";
  }

  const agreement = await proposeAgreement({
    buyerAgentId,
    sellerAgentId,
    buyerUserId: session.userId,
    sellerUserId: seller.ownerUserId,
    buyerAgentName: buyer?.name ?? buyerAgentId,
    sellerAgentName: seller.name,
    objective,
    maxUnitsPerInteraction,
    totalInstallments,
    mode,
    cadence,
    pricePerInstallmentUsdc: seller.collabPriceUsdc ?? defaultCollabPriceUsdc(),
    cooldownSeconds,
  });

  return NextResponse.json({ ok: true, agreement }, { status: 201 });
}

function clampInt(value: number, min: number, max: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}
