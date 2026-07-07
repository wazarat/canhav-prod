import { NextResponse } from "next/server";

import { getCombinedVerdict } from "@/lib/agent/memory";
import { requireOwnedAgent } from "@/lib/agent/ownership";
import { TRADE_COINS } from "@/lib/agent/trade/coins";
import { evaluateVerdictGate, VERDICT_MAX_AGE_MS } from "@/lib/agent/trade/gate";
import { refreshAssetCombinedVerdict } from "@/lib/agent/verdictRunner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Trade Desk readiness readout: per supported coin, the latest combined
 * research verdict and whether the (chain-free) verdict gate is open. The
 * on-chain SecurityRegistry allowlist check still runs server-side at
 * proposal/execution time — this endpoint is for surfacing gate state in the
 * UI, not enforcing it.
 */
export async function GET(_req: Request, { params }: { params: { agentId: string } }) {
  const agentId = decodeURIComponent(params.agentId);
  const guard = await requireOwnedAgent(agentId);
  if (guard.error) return guard.error;

  const now = Date.now();
  const coins = await Promise.all(
    TRADE_COINS.map(async (coin) => {
      const verdict = await getCombinedVerdict(coin.symbol);
      const gate = evaluateVerdictGate(verdict, now);
      const ts = verdict ? Date.parse(verdict.ts) : NaN;
      return {
        symbol: coin.symbol,
        entitySlug: coin.entitySlug,
        verdict: verdict
          ? {
              signal: verdict.signal,
              severity: verdict.severity,
              confidence: verdict.confidence,
              ts: verdict.ts,
            }
          : null,
        gateOpen: gate.ok,
        reason: gate.ok ? null : gate.reason,
        ageMs: Number.isFinite(ts) ? now - ts : null,
        maxAgeMs: VERDICT_MAX_AGE_MS,
      };
    }),
  );

  return NextResponse.json({ ok: true, coins });
}

/**
 * Refresh the combined research verdict for one supported asset — the Trade
 * Desk's "Refresh research" action that unblocks stale-verdict proposals
 * outside chat (the /verdicts POST only serves the demo agent ids).
 */
export async function POST(req: Request, { params }: { params: { agentId: string } }) {
  const agentId = decodeURIComponent(params.agentId);
  const guard = await requireOwnedAgent(agentId);
  if (guard.error) return guard.error;

  let body: { asset?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const asset = typeof body.asset === "string" ? body.asset.trim() : "";
  if (!asset) {
    return NextResponse.json({ ok: false, error: "asset is required." }, { status: 400 });
  }

  const result = await refreshAssetCombinedVerdict(asset, guard.session?.userId ?? null);
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
