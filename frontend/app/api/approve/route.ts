import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { readSecret, repoRoot } from "@/lib/server/env";

/**
 * Restricted approval endpoint (Step 4, Goal A2/A3).
 *
 * Drives the SAME Python engine the CLI uses: it shells out to
 * `backend/scripts/approve.py` (flip status) and then `export_store.py`
 * (refresh the build-time JSON), so there is exactly one source of approval
 * logic. The `/staging` page reads `store.json` live, so the flip shows there
 * instantly; public pages are static and refresh on the next `npm run build`.
 *
 * Auth: a shared bearer token (`APPROVAL_TOKEN` in backend/.env). This is a
 * single-user internal action, so a constant-time token check is sufficient.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);

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

export async function POST(req: Request): Promise<NextResponse> {
  const expected = readSecret("APPROVAL_TOKEN");
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "Server is missing APPROVAL_TOKEN (set it in backend/.env)." },
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
  const revert = action === "revert";

  const root = repoRoot();
  const approveArgs = [
    path.join("backend", "scripts", "approve.py"),
    "--category",
    category,
    "--slug",
    slug,
    ...(revert ? ["--revert"] : []),
  ];

  try {
    // 1) Flip the status via the Python engine (no shell — args are passed
    //    directly to execFile, and slug/category are validated above).
    const { stdout: approveOut } = await execFileAsync("python3", approveArgs, {
      cwd: root,
      timeout: 20_000,
    });
    // 2) Refresh the build-time export so a subsequent build is correct.
    await execFileAsync("python3", [path.join("backend", "scripts", "export_store.py")], {
      cwd: root,
      timeout: 20_000,
    });

    // Make the dynamic staging page and (on next render) public pages reflect it.
    revalidatePath("/staging");
    revalidatePath("/stablecoins");
    revalidatePath("/rwas");

    const status = revert ? "PENDING_APPROVAL" : "APPROVED";
    return NextResponse.json({ ok: true, category, slug, status, detail: approveOut.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: "Approval command failed.", detail: message },
      { status: 500 },
    );
  }
}
