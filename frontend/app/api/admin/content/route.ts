import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/auth/admin";
import { fieldKey, getRedisClient, hasUpstash, parseItem, STORE_KEY } from "@/lib/server/redis";
import { readNetworkItemLocal, writeNetworkItemLocal } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Admin content editor API — read + write CURATED network fields only.
 *
 * SAFETY: `CURATED_KEYS` is an allowlist. Nothing else is ever written, so the
 * data-pipeline blocks (UniversalMetrics, Market, ProtocolFeesRevenue, DexVolume,
 * CurrentScale, sector metric blocks, *TagMetrics) can never be clobbered here.
 */
const CURATED_KEYS = [
  // Basics / editorial copy
  "Tagline",
  "Description",
  "LongDescription",
  "Differentiator",
  // Identity links
  "Website",
  "Twitter",
  "Discord",
  "GitHub",
  "OfficialDocs",
  // Classification
  "Sector",
  "SecondarySectors",
  "SubSector",
  "Tags",
  "StakingSubSector",
  "StakingSecondaryTags",
  "LiquiditySubSector",
  "LiquiditySecondaryTags",
  "DerivativesSubSector",
  "DerivativesSecondaryTags",
  "OtherSubSector",
  "OtherSecondaryTags",
  "RwaSubSector",
  "RwaSecondaryTags",
  "StablecoinSubSector",
  "StablecoinSecondaryTags",
  "DexSubSector",
  "DexSecondaryTags",
  // Research
  "Faq",
  "Timeline",
  "Tokenomics",
  "OrgStructure",
  "InvestmentRounds",
  "TradFiComparison",
  "Sources",
  "OffchainFacts",
  "Audits",
  // Risks
  "TypedRisks",
  "Risks",
  // Relationships
  "Competitors",
  "Partnerships",
] as const;

const CURATED_KEY_SET = new Set<string>(CURATED_KEYS);

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Read a network store item, trying "Network" then legacy "Entity". Uses Upstash
 * when configured, else the on-disk offline-dev store.
 */
async function readNetworkItem(
  slug: string,
): Promise<{ field: string; item: Record<string, any> } | null> {
  if (!hasUpstash()) return readNetworkItemLocal(slug);
  const redis = getRedisClient();
  for (const category of ["Network", "Entity"]) {
    const field = fieldKey(category, slug);
    const item = parseItem(await redis.hget(STORE_KEY, field));
    if (item) return { field, item };
  }
  return null;
}

/** Persist a network item back to Upstash, or the on-disk store in offline dev. */
async function writeNetworkItem(field: string, item: Record<string, any>): Promise<void> {
  if (!hasUpstash()) {
    writeNetworkItemLocal(field, item);
    return;
  }
  await getRedisClient().hset(STORE_KEY, { [field]: JSON.stringify(item) });
}

function curatedSubset(item: Record<string, any>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of CURATED_KEYS) {
    if (item[key] !== undefined) out[key] = item[key];
  }
  return out;
}

export async function GET(req: Request): Promise<NextResponse> {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ ok: false, error: "Missing ?slug=." }, { status: 400 });
  }
  const found = await readNetworkItem(slug);
  if (!found) {
    return NextResponse.json({ ok: false, error: `No network "${slug}".` }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    slug,
    updatedAt: found.item.UpdatedAt ?? null,
    fields: curatedSubset(found.item),
  });
}

interface ContentPatchBody {
  slug?: string;
  patch?: Record<string, unknown>;
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: ContentPatchBody;
  try {
    body = (await req.json()) as ContentPatchBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const slug = body.slug?.trim();
  const patch = body.patch;
  if (!slug || !patch || typeof patch !== "object") {
    return NextResponse.json(
      { ok: false, error: "Body must be { slug, patch }." },
      { status: 400 },
    );
  }

  const found = await readNetworkItem(slug);
  if (!found) {
    return NextResponse.json({ ok: false, error: `No network "${slug}".` }, { status: 404 });
  }
  const { field, item } = found;

  // Only ever merge allowlisted curated keys; ignore everything else, and reject
  // any structured key whose value arrives in the wrong shape (defense in depth
  // against a buggy UI or script corrupting typed data — see isValidCuratedShape).
  const applied: string[] = [];
  const rejected: string[] = [];
  for (const [key, value] of Object.entries(patch)) {
    if (!CURATED_KEY_SET.has(key)) {
      rejected.push(key);
      continue;
    }
    const sanitized = sanitizeCuratedValue(key, value, slug);
    if (!isValidCuratedShape(key, sanitized)) {
      rejected.push(key);
      continue;
    }
    item[key] = sanitized;
    applied.push(key);
  }

  if (applied.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No curated fields in patch.", rejected },
      { status: 400 },
    );
  }

  item.UpdatedAt = nowIso();
  await writeNetworkItem(field, item);

  revalidatePath(`/networks/${slug}`);
  revalidatePath("/networks");

  return NextResponse.json({ ok: true, slug, applied, rejected, updatedAt: item.UpdatedAt });
}

/**
 * Defensive server-side cleanup for relationship arrays: drop self-referential
 * competitor/partnership links (an entity can't be its own competitor).
 */
function sanitizeCuratedValue(key: string, value: unknown, ownSlug: string): unknown {
  if ((key === "Competitors" || key === "Partnerships") && Array.isArray(value)) {
    return value.map((row) => {
      if (row && typeof row === "object" && (row as any).slug === ownSlug) {
        return { ...(row as Record<string, unknown>), slug: null };
      }
      return row;
    });
  }
  return value;
}

/** Structured keys whose items must be objects (never bare/`[object Object]` strings). */
const OBJECT_ARRAY_KEYS = new Set([
  "Competitors",
  "Partnerships",
  "TypedRisks",
  "Faq",
  "OrgStructure",
  "Timeline",
  "InvestmentRounds",
  "TradFiComparison",
  "Sources",
  "Audits",
  "OffchainFacts",
]);

/** Classification keys that must be arrays of plain strings. */
const STRING_ARRAY_KEYS = new Set([
  "Tags",
  "SecondarySectors",
  "StakingSecondaryTags",
  "LiquiditySecondaryTags",
  "DerivativesSecondaryTags",
  "OtherSecondaryTags",
  "RwaSecondaryTags",
  "StablecoinSecondaryTags",
  "DexSecondaryTags",
]);

function isPlainObject(v: unknown): boolean {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** A value that got String()-coerced from an object — the classic corruption. */
function looksStringified(v: unknown): boolean {
  return typeof v === "string" && v.trim() === "[object Object]";
}

/**
 * Reject structured curated values arriving in the wrong primitive shape, so no
 * UI or script can overwrite typed data (risk objects, competitor rows, …) with
 * bare strings or scalars. Clearing a key (null/undefined) is always allowed;
 * legacy `Risks` accepts BOTH string[] and object[]. Scalar keys pass through.
 */
function isValidCuratedShape(key: string, value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (OBJECT_ARRAY_KEYS.has(key)) {
    return Array.isArray(value) && value.every(isPlainObject);
  }
  if (STRING_ARRAY_KEYS.has(key)) {
    return Array.isArray(value) && value.every((it) => typeof it === "string" && !looksStringified(it));
  }
  if (key === "Risks") {
    return (
      Array.isArray(value) &&
      value.every((it) => (typeof it === "string" && !looksStringified(it)) || isPlainObject(it))
    );
  }
  if (key === "Tokenomics") {
    return isPlainObject(value);
  }
  return true;
}
