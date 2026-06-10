import { readFileSync } from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

import { readSecret, repoRoot } from "@/lib/server/env";
import { hasUpstash, STORE_KEY, readAllItemsFromRedis } from "@/lib/server/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const token = readSecret("APPROVAL_TOKEN");
  if (!token) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${token}`;
}

function countByCategory(items: Record<string, unknown>[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const cat = String(item.Category ?? "?");
    out[cat] = (out[cat] ?? 0) + 1;
  }
  return out;
}

function readDiskItems(): Record<string, unknown>[] {
  const file = path.join(repoRoot(), "backend", "data", "store.json");
  try {
    const parsed = JSON.parse(readFileSync(file, "utf-8")) as {
      items?: Record<string, Record<string, unknown>>;
    };
    return Object.values(parsed.items ?? {});
  } catch {
    return [];
  }
}

export async function GET(req: Request): Promise<NextResponse> {
  if (!authorized(req)) {
    const status = readSecret("APPROVAL_TOKEN") ? 401 : 500;
    const error =
      status === 500
        ? "APPROVAL_TOKEN is not set on this deployment."
        : "Unauthorized. Send Authorization: Bearer <APPROVAL_TOKEN>.";
    return NextResponse.json({ ok: false, error }, { status });
  }

  const upstashConfigured = hasUpstash();
  let redisItems: Record<string, unknown>[] = [];
  let redisError: string | null = null;

  if (upstashConfigured) {
    try {
      redisItems = await readAllItemsFromRedis();
    } catch (err) {
      redisError = err instanceof Error ? err.message : "Redis read failed";
    }
  }

  const diskItems = readDiskItems();

  let source: "redis" | "disk" | "empty";
  let activeItems: Record<string, unknown>[];

  if (redisItems.length > 0) {
    source = "redis";
    activeItems = redisItems;
  } else if (diskItems.length > 0) {
    source = "disk";
    activeItems = diskItems;
  } else {
    source = "empty";
    activeItems = [];
  }

  return NextResponse.json({
    ok: true,
    hash: STORE_KEY,
    hasUpstash: upstashConfigured,
    source,
    itemCount: activeItems.length,
    byCategory: countByCategory(activeItems),
    redis: {
      configured: upstashConfigured,
      itemCount: redisItems.length,
      error: redisError,
    },
    disk: {
      itemCount: diskItems.length,
      path: "backend/data/store.json",
    },
    restoreHint:
      activeItems.length === 0
        ? "Run ingest_*.py locally, then ./scripts/seed-prod.sh or deploy with empty Upstash hash to auto-bootstrap."
        : null,
  });
}
