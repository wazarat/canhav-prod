import "server-only";

import { NextResponse } from "next/server";

import { hasPrivyWallet } from "@/lib/agent/config";
import { defaultGmxTarget, getTradeCoin } from "@/lib/agent/trade/coins";
import { assertResearchGate } from "@/lib/agent/trade/gate";
import { buildOpenPositionCall, clampTradeIntent } from "@/lib/agent/trade/gmxAdapter";
import { resolveGmxMarket } from "@/lib/agent/trade/gmxReader";
import { EXCHANGE_ROUTER, MAX_LEVERAGE, MAX_SIZE_USD, ROUTER } from "@/lib/agent/trade/gmx";
import type { TradeIntent, TradeSide } from "@/lib/agent/trade/types";
import { checkSpendingCap } from "@/lib/agent/trade/spendingCap";
import { userOwnsAgent } from "@/lib/agent/ownership";
import { getSession } from "@/lib/auth/session";
import { readSecret } from "@/lib/server/env";
import { recordTrade } from "@/lib/server/tradeLog";

/**
 * Agent GMX trade route — mirror wallet/transfer preflight/confirm.
 *
 * POST preflight  { agentId, asset, side, sizeUsd, leverage, autoExecute?, humanApproved? }
 * POST confirm    { ...preflight fields, market, txHash, verdictRef }
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIDE_SET = new Set<TradeSide>(["long", "short"]);

function parseSizeUsd(raw: unknown): bigint | null {
  if (typeof raw === "string" && /^\d+$/.test(raw)) {
    try {
      return BigInt(raw);
    } catch {
      return null;
    }
  }
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return BigInt(Math.floor(raw)) * 10n ** 30n;
  }
  return null;
}

export async function POST(req: Request) {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in." }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const agentId = typeof body.agentId === "string" ? body.agentId.trim() : "";
  const asset = typeof body.asset === "string" ? body.asset.trim() : "";
  const side = typeof body.side === "string" ? (body.side.trim() as TradeSide) : null;
  const leverageRaw = typeof body.leverage === "number" ? body.leverage : Number(body.leverage);
  const leverage = Number.isFinite(leverageRaw) ? Math.min(Math.max(1, leverageRaw), MAX_LEVERAGE) : 1;
  const sizeUsd = parseSizeUsd(body.sizeUsd);
  const txHash = typeof body.txHash === "string" ? body.txHash.trim() : "";
  const market =
    typeof body.market === "string" && /^0x[0-9a-fA-F]{40}$/.test(body.market)
      ? (body.market as `0x${string}`)
      : null;
  const verdictRef = typeof body.verdictRef === "string" ? body.verdictRef.trim() : "";
  const humanApproved = body.humanApproved === true;
  const autoExecute = body.autoExecute === true;

  if (!agentId || !asset || !side || !SIDE_SET.has(side) || sizeUsd == null) {
    return NextResponse.json(
      { ok: false, error: "agentId, asset, side (long|short), and sizeUsd are required." },
      { status: 400 },
    );
  }

  if (!(await userOwnsAgent(session.userId, agentId))) {
    return NextResponse.json({ ok: false, error: "That agent isn't yours." }, { status: 403 });
  }

  const coin = getTradeCoin(asset);
  if (!coin) {
    return NextResponse.json(
      { ok: false, blocked: true, error: `Asset ${asset} is not in the trade coin list.` },
      { status: 400 },
    );
  }

  const gmxTarget = defaultGmxTarget();
  const gate = await assertResearchGate(asset, gmxTarget);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, blocked: true, error: gate.reason }, { status: 403 });
  }

  const capCheck = await checkSpendingCap({
    agentId,
    sizeUsd,
    humanApproved,
    autoExecute,
  });
  if (!capCheck.ok) {
    return NextResponse.json({ ok: false, blocked: true, error: capCheck.reason }, { status: 403 });
  }

  const clampedSize = sizeUsd > MAX_SIZE_USD ? MAX_SIZE_USD : sizeUsd;
  const intent: TradeIntent = {
    asset,
    side,
    sizeUsd: clampedSize,
    leverage,
    collateralToken: coin.collateralToken,
    verdictRef: gate.verdictRef,
    createdAt: new Date().toISOString(),
  };

  const resolvedMarket =
    market ??
    coin.gmxMarket ??
    (await resolveGmxMarket({
      marketIndexToken: coin.marketIndexToken,
      collateralToken: coin.collateralToken,
    }));

  if (!resolvedMarket) {
    return NextResponse.json(
      { ok: false, error: "Could not resolve GMX market. Try again or pass market address." },
      { status: 502 },
    );
  }

  if (txHash) {
    await recordTrade({
      agentId,
      userId: session.userId,
      asset,
      side,
      sizeUsd: clampedSize.toString(),
      leverage,
      collateralToken: coin.collateralToken,
      gmxTarget,
      market: resolvedMarket,
      verdictRef: verdictRef || gate.verdictRef,
      txHash,
      at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, recorded: true, txHash });
  }

  const rpcUrl =
    readSecret("ARBITRUM_SEPOLIA_RPC_URL") ?? "https://sepolia-rollup.arbitrum.io/rpc";

  if (!hasPrivyWallet()) {
    return NextResponse.json(
      { ok: false, error: "On-chain trades aren't available in this environment." },
      { status: 400 },
    );
  }

  const collateralAmount = (clampedSize / 10n ** 24n / BigInt(leverage)) || 1_000_000n;
  const call = buildOpenPositionCall(clampTradeIntent(intent), {
    receiver: "0x0000000000000000000000000000000000000000",
    market: resolvedMarket,
    collateralAmount,
  });

  return NextResponse.json({
    ok: true,
    preflight: true,
    agentId,
    asset,
    side,
    sizeUsd: clampedSize.toString(),
    leverage,
    collateralToken: coin.collateralToken,
    collateralAmount: collateralAmount.toString(),
    gmxTarget,
    market: resolvedMarket,
    router: ROUTER,
    exchangeRouter: EXCHANGE_ROUTER,
    verdictRef: gate.verdictRef,
    rpcUrl,
    call: {
      target: call.target,
      data: call.data,
      value: call.value.toString(),
    },
    hitlMethod: capCheck.hitlMethod,
  });
}
