import { NextResponse } from "next/server";

import { getCombinedVerdict } from "@/lib/agent/memory";
import { YIELD_DEMO_AGENTS } from "@/lib/agent/verdictRunner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ASSET_ENTITY: Record<string, string> = {
  sUSDe: "ethena",
  sUSDai: "usd-ai",
};

/**
 * Public combined verdict for an entity's yield-bearing stablecoin pair.
 * Query: ?asset=sUSDe | sUSDai  OR  ?entity=ethena | usd-ai
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  let asset = searchParams.get("asset");
  const entity = searchParams.get("entity");

  if (!asset && entity) {
    const match = YIELD_DEMO_AGENTS.find((a) => a.entitySlug === entity);
    asset = match?.asset ?? null;
  }

  if (!asset || !(asset in ASSET_ENTITY)) {
    return NextResponse.json(
      { ok: false, error: "Provide ?asset=sUSDe|sUSDai or ?entity=ethena|usd-ai" },
      { status: 400 },
    );
  }

  const combined = await getCombinedVerdict(asset);
  const stableAgent = YIELD_DEMO_AGENTS.find((a) => a.asset === asset && a.type === "stablecoin");
  const yieldAgent = YIELD_DEMO_AGENTS.find((a) => a.asset === asset && a.type === "yield");

  return NextResponse.json({
    ok: true,
    asset,
    entitySlug: ASSET_ENTITY[asset],
    combined,
    agents: {
      stablecoin: stableAgent?.agentId ?? null,
      yield: yieldAgent?.agentId ?? null,
    },
  });
}
