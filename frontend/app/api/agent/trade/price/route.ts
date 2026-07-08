import "server-only";

import { NextResponse } from "next/server";

import { getTradeCoin } from "@/lib/agent/trade/coins";
import { resolveCoin } from "@/lib/server/coingecko";

/**
 * Live spot reference price for a tradable major — public market data used by
 * TradeProposalForm for order sizing. GMX's on-chain oracle still prices the
 * actual fill; this is display-only and never enters TradeIntent.
 *
 * GET ?symbol=ETH → { ok, symbol, priceUsd, asOf }; non-tradable symbols 404.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Short CoinGecko cache so the form can poll without burning free-tier quota. */
const PRICE_REVALIDATE_S = 60;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") ?? "").trim();
  if (!symbol) {
    return NextResponse.json({ ok: false, error: "symbol is required." }, { status: 400 });
  }

  const coin = getTradeCoin(symbol);
  if (!coin) {
    return NextResponse.json(
      { ok: false, error: `${symbol} is not a tradable coin.` },
      { status: 404 },
    );
  }

  const resolved = await resolveCoin(coin.geckoId, PRICE_REVALIDATE_S);
  if (!resolved || resolved.priceUsd == null) {
    return NextResponse.json(
      { ok: false, error: "Live price unavailable. Try again shortly." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    symbol: coin.symbol,
    priceUsd: resolved.priceUsd,
    asOf: new Date().toISOString(),
  });
}
