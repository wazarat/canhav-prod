import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/auth/admin";
import { verifyCoinId } from "@/lib/server/coingecko";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Admin "Verify" eyeball for a curated CoinGecko id. Bearer/admin-gated. Returns
 * the coin's name/symbol/logo/price so the admin can confirm they pinned the
 * right token BEFORE saving. Never fuzzy-matches — the id must be exact.
 */
export async function GET(req: Request): Promise<NextResponse> {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing ?id=." }, { status: 400 });
  }
  const coin = await verifyCoinId(id);
  if (!coin) {
    return NextResponse.json(
      { ok: false, error: `No CoinGecko coin found for id "${id}".` },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, coin });
}
