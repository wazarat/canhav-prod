import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import {
  actOnAgreement,
  getAgreement,
  type AgreementAction,
} from "@/lib/server/collabAgreements";

/**
 * Single agreement:
 *   GET  -> read it (must be a party).
 *   POST -> lifecycle action { action: "approve" | "reject" | "cancel" }.
 *           approve/reject is the seller's; cancel is either party's.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS: AgreementAction[] = ["approve", "reject", "cancel"];

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in." }, { status: 401 });
  }
  const { id } = await params;
  const agreement = await getAgreement(id);
  if (!agreement) {
    return NextResponse.json({ ok: false, error: "Agreement not found." }, { status: 404 });
  }
  if (agreement.buyerUserId !== session.userId && agreement.sellerUserId !== session.userId) {
    return NextResponse.json({ ok: false, error: "Not your agreement." }, { status: 403 });
  }
  return NextResponse.json({ ok: true, agreement });
}

interface ActionBody {
  action?: string;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in." }, { status: 401 });
  }
  const { id } = await params;

  let body: ActionBody;
  try {
    body = (await req.json()) as ActionBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const action = (body.action ?? "").trim() as AgreementAction;
  if (!ACTIONS.includes(action)) {
    return NextResponse.json(
      { ok: false, error: `action must be one of: ${ACTIONS.join(", ")}.` },
      { status: 400 },
    );
  }

  const result = await actOnAgreement(id, action, session.userId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
  }
  return NextResponse.json({ ok: true, agreement: result.agreement });
}
