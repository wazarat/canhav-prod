import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Lead capture → Instantly.ai campaign.
 *
 * The Instantly API key is server-only; the contact modal posts here and this
 * route forwards to Instantly API v2. Without a key configured the lead is
 * accepted-but-dropped (logged) so dev/preview stays fully clickable.
 */

const DEFAULT_CAMPAIGN_ID = "f6fbbf5c-b4fe-4249-aeaa-8fffdcfea3dd";
const INSTANTLY_LEADS_URL = "https://api.instantly.ai/api/v2/leads";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function bad(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return bad("invalid_body");
  }
  if (typeof raw !== "object" || raw === null) return bad("invalid_body");
  const body = raw as Record<string, unknown>;

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const leadType = body.leadType;
  const comments =
    typeof body.comments === "string" ? body.comments.trim().slice(0, 2000) : "";
  const sourcePage =
    typeof body.sourcePage === "string" ? body.sourcePage.slice(0, 100) : "unknown";
  const honeypot = typeof body.website === "string" ? body.website.trim() : "";

  // Bots fill the hidden field; accept silently so they can't tell.
  if (honeypot) return NextResponse.json({ ok: true });

  if (!fullName || fullName.length > 200) return bad("invalid_name");
  if (email.length > 320 || !EMAIL_RE.test(email)) return bad("invalid_email");
  if (leadType !== "individual" && leadType !== "team") return bad("invalid_lead_type");

  const apiKey = process.env.INSTANTLY_API_KEY;
  if (!apiKey) {
    console.warn("[leads] INSTANTLY_API_KEY not set; lead not delivered", { email });
    return NextResponse.json({ ok: true });
  }

  const [firstName, ...rest] = fullName.split(/\s+/);
  const campaign = process.env.INSTANTLY_CAMPAIGN_ID ?? DEFAULT_CAMPAIGN_ID;

  try {
    const res = await fetch(INSTANTLY_LEADS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        campaign,
        email,
        first_name: firstName,
        last_name: rest.join(" "),
        custom_variables: {
          lead_type: leadType,
          comments,
          source_page: sourcePage,
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[leads] Instantly rejected lead", res.status, detail.slice(0, 500));
      return NextResponse.json({ ok: false, error: "delivery_failed" }, { status: 502 });
    }
  } catch (err) {
    console.error("[leads] Instantly request failed", err);
    return NextResponse.json({ ok: false, error: "delivery_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
