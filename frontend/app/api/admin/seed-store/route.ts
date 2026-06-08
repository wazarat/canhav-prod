import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { readSecret } from "@/lib/server/env";
import { hasUpstash, STORE_KEY, getRedisClient } from "@/lib/server/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LEGACY_FIELDS = ["CATEGORY#Stablecoin|PROTOCOL#usd-ai"];

interface SeedBody {
  items?: Record<string, Record<string, unknown>>;
  replace?: boolean;
}

function authorized(req: Request): boolean {
  const token = readSecret("APPROVAL_TOKEN");
  if (!token) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${token}`;
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!authorized(req)) {
    const status = readSecret("APPROVAL_TOKEN") ? 401 : 500;
    const error =
      status === 500
        ? "APPROVAL_TOKEN is not set on this deployment."
        : "Unauthorized. Send Authorization: Bearer <APPROVAL_TOKEN>.";
    return NextResponse.json({ ok: false, error }, { status });
  }

  if (!hasUpstash()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Upstash is not configured (KV_REST_API_URL/KV_REST_API_TOKEN missing at runtime).",
      },
      { status: 400 },
    );
  }

  let body: SeedBody;
  try {
    body = (await req.json()) as SeedBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const items = body.items;
  if (!items || typeof items !== "object" || Object.keys(items).length === 0) {
    return NextResponse.json(
      { ok: false, error: "Body must include a non-empty `items` object (store.json shape)." },
      { status: 400 },
    );
  }

  const redis = getRedisClient();
  const replace = body.replace !== false;

  if (replace) {
    await redis.del(STORE_KEY);
  }

  const payload: Record<string, string> = {};
  const byCategory: Record<string, number> = {};

  for (const [field, item] of Object.entries(items)) {
    if (!item || typeof item !== "object") continue;
    const published = { ...item, Status: "APPROVED" };
    payload[field] = JSON.stringify(published);
    const cat = String(item.Category ?? "?");
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
  }

  await redis.hset(STORE_KEY, payload);

  let legacyRemoved = 0;
  for (const field of LEGACY_FIELDS) {
    legacyRemoved += await redis.hdel(STORE_KEY, field);
  }

  revalidatePath("/");
  revalidatePath("/entities");
  revalidatePath("/stablecoins");
  revalidatePath("/rwas");
  revalidatePath("/tokens");

  return NextResponse.json({
    ok: true,
    hash: STORE_KEY,
    mode: replace ? "replace" : "additive",
    itemsWritten: Object.keys(payload).length,
    byCategory,
    legacyRemoved,
  });
}
