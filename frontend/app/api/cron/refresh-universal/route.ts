import { GET as refresh } from "../refresh/route";

// Scheduled alias for /api/cron/refresh?only=universal (Vercel cron paths are
// query-free). Runs the universal Tier-1 pass (DeFi Llama TVL + CoinGecko
// mkt cap/vol for all networks) on its own budget so the visible headline
// columns refresh nightly even when the full pass exceeds its window
// (CAN-102: the full run 504'd at maxDuration on 2026-07-27).
export const dynamic = "force-dynamic";
export const maxDuration = 800;

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  url.pathname = "/api/cron/refresh";
  url.searchParams.set("only", "universal");
  return refresh(new Request(url, { headers: req.headers }));
}
