import { GET as refresh } from "../refresh/route";

// Scheduled alias for /api/cron/refresh?only=tags (Vercel cron paths are
// query-free). Runs the credit tag-metrics pass — the Supplied writer the
// /networks Credit table reads — on its own budget so it lands nightly even
// when the full pass exceeds its window (CAN-102).
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  url.pathname = "/api/cron/refresh";
  url.searchParams.set("only", "tags");
  return refresh(new Request(url, { headers: req.headers }));
}
