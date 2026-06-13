import { NextResponse } from "next/server";

import { getSellerDetail } from "@/lib/server/sellerDetail";
import { getSession } from "@/lib/auth/session";

/**
 * Seller marketplace detail: description, exchange-verified reviews, creator
 * identity + account age, and on-chain verification links. This is the "is this
 * a legit person who has been on the platform a while?" trust view a buyer
 * inspects before transacting.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { agentId: string } }) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to view this seller." }, { status: 401 });
  }

  const agentId = decodeURIComponent(params.agentId);
  const detail = await getSellerDetail(agentId);
  if (!detail) {
    return NextResponse.json({ error: `Unknown agent "${agentId}".` }, { status: 404 });
  }
  return NextResponse.json({ seller: detail });
}
