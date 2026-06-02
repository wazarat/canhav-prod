import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { readSecret } from "@/lib/server/env";
import { hasUpstash, setStatus } from "@/lib/server/redis";
import { setStatusLocal } from "@/lib/server/store";

/**
 * Restricted approval endpoint (Goal A2/A3).
 *
 * Writes the status flip directly to the store in TypeScript — no Python at
 * runtime. Production uses Upstash Redis (`setStatus`, an HSET on the
 * `canhav:store` hash); offline dev without Upstash env falls back to editing
 * `backend/data/store.json` (`setStatusLocal`), mirroring the Python
 * LocalAdapter. Then it revalidates the dynamic /staging page and the public
 * list/detail paths so the flip is reflected.
 *
 * Auth: a shared bearer token (`APPROVAL_TOKEN`). This is a single-user internal
 * action, so a constant-time token check is sufficient.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_CATEGORIES = new Set(["Stablecoin", "RWA"]);
const SLUG_RE = /^[a-z0-9-]{1,64}$/;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function extractToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  const header = req.headers.get("x-approval-token");
  return header && header.trim() !== "" ? header.trim() : null;
}

function basePath(category: string): string {
  return category === "RWA" ? "/rwas" : "/stablecoins";
}

export async function POST(req: Request): Promise<NextResponse> {
  const expected = readSecret("APPROVAL_TOKEN");
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "Server is missing APPROVAL_TOKEN (set it in env / backend/.env)." },
      { status: 500 },
    );
  }

  const provided = extractToken(req);
  if (!provided || !timingSafeEqual(provided, expected)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { category, slug, action } = (body ?? {}) as {
    category?: string;
    slug?: string;
    action?: string;
  };

  if (!category || !VALID_CATEGORIES.has(category)) {
    return NextResponse.json(
      { ok: false, error: "category must be 'Stablecoin' or 'RWA'." },
      { status: 400 },
    );
  }
  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json(
      { ok: false, error: "slug must match ^[a-z0-9-]{1,64}$." },
      { status: 400 },
    );
  }

  const status: "APPROVED" | "PENDING_APPROVAL" =
    action === "revert" ? "PENDING_APPROVAL" : "APPROVED";

  try {
    const item = hasUpstash()
      ? await setStatus(category, slug, status)
      : setStatusLocal(category, slug, status);

    if (!item) {
      return NextResponse.json(
        { ok: false, error: `No ${category} found with slug '${slug}'.` },
        { status: 404 },
      );
    }

    // Reflect on the dynamic staging page and the public list/detail pages.
    revalidatePath("/staging");
    revalidatePath(basePath(category));
    revalidatePath(`${basePath(category)}/${slug}`);

    return NextResponse.json({ ok: true, category, slug, status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: "Approval write failed.", detail: message },
      { status: 500 },
    );
  }
}
