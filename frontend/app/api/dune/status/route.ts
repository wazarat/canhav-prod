import { NextResponse } from "next/server";

import { duneNamespace, hasDune, hasDuneWrite } from "@/lib/server/dune";

/**
 * Dune connection readout for the owner UI.
 *
 * Reports whether a Dune key is present and whether writes are enabled in this
 * environment, plus the namespace verdicts publish under. Never returns the key
 * itself — the platform uses a single operator key set in env, not per-user.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    connected: hasDune(),
    writeEnabled: hasDuneWrite(),
    namespace: duneNamespace(),
  });
}
