import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/auth/admin";
import { fieldKey, getRedisClient, hasUpstash, parseItem, STORE_KEY } from "@/lib/server/redis";
import { isValidSlug } from "@/lib/slug";
import {
  readStoreItemLocal,
  STORE_CACHE_TAG,
  writeNetworkItemLocal,
} from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Admin content editor API — read + write CURATED / seeded fields only, per
 * entity class (networks, coins, receipts).
 *
 * SAFETY: each category has an allowlist. Nothing outside it is ever written, so
 * the Tier-1 data-pipeline blocks (UniversalMetrics, Market, Peg, Receipt live
 * metrics, ProtocolFeesRevenue, CurrentScale, sector metric blocks) can never be
 * clobbered here. Identity keys that form the store primary key (Slug, and any
 * CoinType change that crosses the Token↔Stablecoin category boundary) are
 * rejected — those are re-keys, done via seed scripts, not field patches.
 */

// --- Networks (existing) ---------------------------------------------------
const NETWORK_KEYS = [
  "Tagline", "Description", "LongDescription", "Differentiator",
  "Website", "Twitter", "Discord", "GitHub", "OfficialDocs",
  "Sector", "SecondarySectors", "SubSector", "Tags",
  "StakingSubSector", "StakingSecondaryTags",
  "LiquiditySubSector", "LiquiditySecondaryTags",
  "DerivativesSubSector", "DerivativesSecondaryTags",
  "OtherSubSector", "OtherSecondaryTags",
  "RwaSubSector", "RwaSecondaryTags",
  "StablecoinSubSector", "StablecoinSecondaryTags",
  "DexSubSector", "DexSecondaryTags",
  "Faq", "Timeline", "Tokenomics", "OrgStructure", "InvestmentRounds",
  "TradFiComparison", "Sources", "OffchainFacts", "Audits",
  "TypedRisks", "Risks",
  "Competitors", "Partnerships",
] as const;

// --- Coins (Token / Stablecoin / RWA) --------------------------------------
// Slug is intentionally omitted (part of the store key → locked).
const COIN_KEYS = [
  "Name", "Symbol", "Sector", "Tag", "EntitySlug", "HasNativeToken",
  "CoingeckoId", "Backing", "BackingApy", "LockDuration", "Notes", "CoinType",
] as const;

// --- Receipts --------------------------------------------------------------
const RECEIPT_KEYS = [
  "Name", "Symbol", "Sector", "Tag", "EntitySlug", "BaseAsset", "Notes",
  "CoingeckoId", "ReceiptType", "AvsCount", "NavPerShare", "UnderlyingAssets",
  "UnderlyingYield", "MaturityDate", "TrancheSize", "AssetClass", "Custodian",
  "Regulatory", "LockDuration", "NavUsd", "Members",
] as const;

const NETWORK_KEY_SET = new Set<string>(NETWORK_KEYS);
const COIN_KEY_SET = new Set<string>(COIN_KEYS);
const RECEIPT_KEY_SET = new Set<string>(RECEIPT_KEYS);

const COIN_TYPES = new Set([
  "Governance", "GovernanceUtility", "NativeStablecoin", "SyntheticDollar", "LockedEscrow", "NoToken",
]);
const RECEIPT_TYPES = new Set([
  "LiquidStaking", "LiquidRestaking", "LendingReceipt", "YieldVault",
  "StakedStablecoin", "FixedIncomeTranche", "TokenizedRWA", "LockedEscrowReceipt",
]);
const STABLE_COIN_TYPES = new Set(["NativeStablecoin", "SyntheticDollar"]);

const NUMBER_KEYS = new Set(["BackingApy", "AvsCount", "NavPerShare", "UnderlyingYield", "NavUsd"]);
const BOOLEAN_KEYS = new Set(["HasNativeToken"]);

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** Store categories to probe for a given request category (network legacy alias). */
function categoriesFor(category: string): string[] {
  if (category === "Network" || category === "Networks" || category === "Entity") {
    return ["Network", "Entity"];
  }
  return [category];
}

function allowlistFor(category: string): Set<string> {
  if (category === "Token" || category === "Stablecoin" || category === "RWA") return COIN_KEY_SET;
  if (category === "Receipt") return RECEIPT_KEY_SET;
  return NETWORK_KEY_SET;
}

/** Read a store item by category + slug (Upstash, or the on-disk offline store). */
async function readItem(
  category: string,
  slug: string,
): Promise<{ field: string; item: Record<string, any> } | null> {
  const cats = categoriesFor(category);
  if (!hasUpstash()) return readStoreItemLocal(cats, slug);
  const redis = getRedisClient();
  for (const cat of cats) {
    const field = fieldKey(cat, slug);
    const item = parseItem(await redis.hget(STORE_KEY, field));
    if (item) return { field, item };
  }
  return null;
}

/** Persist a store item back to Upstash, or the on-disk store in offline dev. */
async function writeItem(field: string, item: Record<string, any>): Promise<void> {
  if (!hasUpstash()) {
    writeNetworkItemLocal(field, item);
    return;
  }
  await getRedisClient().hset(STORE_KEY, { [field]: JSON.stringify(item) });
}

function subset(item: Record<string, any>, keys: Set<string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (item[key] !== undefined) out[key] = item[key];
  }
  return out;
}

function looksStringified(v: unknown): boolean {
  return typeof v === "string" && v.trim() === "[object Object]";
}

/**
 * Validate a coin/receipt patch value against its key's expected shape. Clearing
 * (null) is always allowed. Rejects wrong-typed values so a buggy UI can't
 * corrupt numeric/boolean fields with strings.
 */
function isValidCoinReceiptShape(key: string, value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (NUMBER_KEYS.has(key)) return typeof value === "number" && Number.isFinite(value);
  if (BOOLEAN_KEYS.has(key)) return typeof value === "boolean";
  if (key === "Members") {
    return Array.isArray(value) && value.every((it) => typeof it === "string" && !looksStringified(it));
  }
  if (key === "CoinType") return typeof value === "string" && COIN_TYPES.has(value);
  if (key === "ReceiptType") return typeof value === "string" && RECEIPT_TYPES.has(value);
  return typeof value === "string" && !looksStringified(value);
}

export async function GET(req: Request): Promise<NextResponse> {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const category = url.searchParams.get("category") ?? "Network";
  if (!slug) {
    return NextResponse.json({ ok: false, error: "Missing ?slug=." }, { status: 400 });
  }
  const found = await readItem(category, slug);
  if (!found) {
    return NextResponse.json({ ok: false, error: `No "${category}" item "${slug}".` }, { status: 404 });
  }
  const keys = allowlistFor(category);
  return NextResponse.json({
    ok: true,
    slug,
    category: found.item.Category ?? category,
    coinType: found.item.CoinType ?? null,
    receiptType: found.item.ReceiptType ?? null,
    updatedAt: found.item.UpdatedAt ?? null,
    fields: subset(found.item, keys),
  });
}

interface ContentPatchBody {
  slug?: string;
  category?: string;
  patch?: Record<string, unknown>;
  // Linkage op (mutates the PARENT network's MemberCoins, not this item):
  op?: "linkMemberCoin" | "unlinkMemberCoin" | "createCoin";
  networkSlug?: string;
  setEntity?: boolean;
  // createCoin op:
  name?: string;
  symbol?: string;
  coinType?: string;
  entitySlug?: string;
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
  if (!slug) {
    return NextResponse.json({ ok: false, error: "Missing slug." }, { status: 400 });
  }
  const category = (body.category ?? "Network").trim();

  // --- Create op: mint a minimal Token item + attach to its parent network ---
  if (body.op === "createCoin") {
    return handleCreateCoin(body, slug);
  }

  // --- Linkage op: mutate the parent network's MemberCoins -------------------
  if (body.op === "linkMemberCoin" || body.op === "unlinkMemberCoin") {
    return handleLinkageOp(body, slug, category);
  }

  // --- Field patch -----------------------------------------------------------
  const patch = body.patch;
  if (!patch || typeof patch !== "object") {
    return NextResponse.json({ ok: false, error: "Body must be { slug, category, patch }." }, { status: 400 });
  }

  const found = await readItem(category, slug);
  if (!found) {
    return NextResponse.json({ ok: false, error: `No "${category}" item "${slug}".` }, { status: 404 });
  }
  const { field, item } = found;
  const isNetwork = allowlistFor(category) === NETWORK_KEY_SET;

  const applied: string[] = [];
  const rejected: string[] = [];

  if (isNetwork) {
    for (const [key, value] of Object.entries(patch)) {
      if (!NETWORK_KEY_SET.has(key)) { rejected.push(key); continue; }
      const sanitized = sanitizeNetworkValue(key, value, slug);
      if (!isValidNetworkShape(key, sanitized)) { rejected.push(key); continue; }
      item[key] = sanitized;
      applied.push(key);
    }
  } else {
    const keys = allowlistFor(category);
    const currentCategory = String(item.Category ?? category);
    for (const [key, value] of Object.entries(patch)) {
      if (!keys.has(key)) { rejected.push(key); continue; }
      if (!isValidCoinReceiptShape(key, value)) { rejected.push(key); continue; }
      // Guard: a CoinType change that would cross the Token↔Stablecoin boundary
      // is a re-key, not a field patch — reject it (do it via seed scripts).
      if (key === "CoinType" && typeof value === "string") {
        const implied = STABLE_COIN_TYPES.has(value) ? "Stablecoin" : "Token";
        if ((currentCategory === "Token" || currentCategory === "Stablecoin") && implied !== currentCategory) {
          rejected.push(key);
          continue;
        }
      }
      item[key] = value;
      applied.push(key);
    }
  }

  if (applied.length === 0) {
    return NextResponse.json({ ok: false, error: "No editable fields in patch.", rejected }, { status: 400 });
  }

  item.UpdatedAt = nowIso();
  await writeItem(field, item);

  revalidateTag(STORE_CACHE_TAG);
  if (isNetwork) revalidatePath(`/networks/${slug}`);
  revalidatePath("/networks");

  return NextResponse.json({ ok: true, slug, category, applied, rejected, updatedAt: item.UpdatedAt });
}

/** A network MemberCoins ref (mirrors MemberCoinRef in lib/types.ts). */
interface MemberCoinRef {
  slug: string;
  name: string;
  symbol: string;
  category: string;
  role: string;
}

/** Categories a new slug must not collide with (all share the /tokens-style key space). */
const CREATE_COLLISION_CATEGORIES = ["Token", "Stablecoin", "RWA", "Receipt", "Network"];

/**
 * Create a minimal APPROVED Token item and attach it to its parent network's
 * MemberCoins[]. EntitySlug is set at creation, so no separate setEntity write.
 * CoinType is deliberately omitted: the reader treats it as null (which passes
 * the NoToken filter) and it stays patchable later via the coin editor.
 */
async function handleCreateCoin(body: ContentPatchBody, slug: string): Promise<NextResponse> {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const symbol = typeof body.symbol === "string" ? body.symbol.trim().toUpperCase() : "";
  const entitySlug = body.entitySlug?.trim();

  if (body.coinType !== "Token") {
    return NextResponse.json({ ok: false, error: 'coinType must be "Token".' }, { status: 400 });
  }
  if (!name || !symbol) {
    return NextResponse.json({ ok: false, error: "Missing name or symbol." }, { status: 400 });
  }
  if (!isValidSlug(slug)) {
    return NextResponse.json(
      { ok: false, error: "Slug must be lowercase letters, digits, and single hyphens (2-64 chars)." },
      { status: 400 },
    );
  }
  if (!entitySlug) {
    return NextResponse.json({ ok: false, error: "Missing entitySlug." }, { status: 400 });
  }
  if (entitySlug === slug) {
    return NextResponse.json(
      { ok: false, error: "A token can't share its parent network's slug." },
      { status: 400 },
    );
  }

  const net = await readItem("Network", entitySlug);
  if (!net) {
    return NextResponse.json({ ok: false, error: `No network "${entitySlug}".` }, { status: 404 });
  }
  for (const cat of CREATE_COLLISION_CATEGORIES) {
    if (await readItem(cat, slug)) {
      return NextResponse.json({ ok: false, error: `Slug "${slug}" already exists.` }, { status: 409 });
    }
  }

  const now = nowIso();
  const item: Record<string, unknown> = {
    PK: "CATEGORY#Token",
    SK: `PROTOCOL#${slug}`,
    Category: "Token",
    Status: "APPROVED",
    Slug: slug,
    Name: name,
    Symbol: symbol,
    TokenType: "Governance",
    SubCategory: "Governance Token",
    Description: `${name} is a token in the ${String(net.item.Name ?? entitySlug)} ecosystem.`,
    EntitySlug: entitySlug,
    CreatedAt: now,
    UpdatedAt: now,
  };
  await writeItem(fieldKey("Token", slug), item);

  // Attach to the parent network's MemberCoins (mirrors handleLinkageOp's link branch).
  const members: MemberCoinRef[] = Array.isArray(net.item.MemberCoins)
    ? [...(net.item.MemberCoins as MemberCoinRef[])]
    : [];
  const idx = members.findIndex((m) => m?.slug === slug);
  const ref: MemberCoinRef = { slug, name, symbol, category: "Token", role: "" };
  if (idx >= 0) members[idx] = { ...members[idx], ...ref };
  else members.push(ref);
  net.item.MemberCoins = members;
  net.item.UpdatedAt = nowIso();
  await writeItem(net.field, net.item);

  revalidateTag(STORE_CACHE_TAG);
  revalidatePath(`/networks/${entitySlug}`);
  revalidatePath("/networks");
  revalidatePath(`/tokens/${slug}`);

  return NextResponse.json({
    ok: true,
    op: "createCoin",
    slug,
    category: "Token",
    entitySlug,
    memberCount: members.length,
  });
}

/**
 * Link / unlink a coin or receipt to a parent network's MemberCoins[]. Idempotent:
 * re-adding updates the ref in place; removing an absent slug is a no-op. On link,
 * optionally set the coin's own EntitySlug (primary parent). Blocks self-reference.
 */
async function handleLinkageOp(
  body: ContentPatchBody,
  coinSlug: string,
  coinCategory: string,
): Promise<NextResponse> {
  const networkSlug = body.networkSlug?.trim();
  if (!networkSlug) {
    return NextResponse.json({ ok: false, error: "Missing networkSlug." }, { status: 400 });
  }
  if (networkSlug === coinSlug) {
    return NextResponse.json({ ok: false, error: "A coin can't be its own parent network." }, { status: 400 });
  }

  const coin = await readItem(coinCategory, coinSlug);
  if (!coin) {
    return NextResponse.json({ ok: false, error: `No "${coinCategory}" item "${coinSlug}".` }, { status: 404 });
  }
  const net = await readItem("Network", networkSlug);
  if (!net) {
    return NextResponse.json({ ok: false, error: `No network "${networkSlug}".` }, { status: 404 });
  }

  const members: MemberCoinRef[] = Array.isArray(net.item.MemberCoins)
    ? [...(net.item.MemberCoins as MemberCoinRef[])]
    : [];
  const idx = members.findIndex((m) => m?.slug === coinSlug);

  if (body.op === "unlinkMemberCoin") {
    if (idx >= 0) members.splice(idx, 1);
  } else {
    const ref: MemberCoinRef = {
      slug: coinSlug,
      name: String(coin.item.Name ?? coinSlug),
      symbol: String(coin.item.Symbol ?? ""),
      category: String(coin.item.Category ?? coinCategory),
      role: idx >= 0 ? String(members[idx].role ?? "") : "",
    };
    if (idx >= 0) members[idx] = { ...members[idx], ...ref };
    else members.push(ref);

    // Primary parent: also set the coin's reverse EntitySlug link.
    if (body.setEntity) {
      coin.item.EntitySlug = networkSlug;
      coin.item.UpdatedAt = nowIso();
      await writeItem(coin.field, coin.item);
    }
  }

  net.item.MemberCoins = members;
  net.item.UpdatedAt = nowIso();
  await writeItem(net.field, net.item);

  revalidateTag(STORE_CACHE_TAG);
  revalidatePath(`/networks/${networkSlug}`);
  revalidatePath("/networks");

  return NextResponse.json({
    ok: true,
    op: body.op,
    coinSlug,
    networkSlug,
    memberCount: members.length,
    entitySet: body.op === "linkMemberCoin" ? Boolean(body.setEntity) : false,
  });
}

/* -------------------------------------------------------------------------- */
/* Network value sanitize/validate (unchanged from the original route)        */
/* -------------------------------------------------------------------------- */

function sanitizeNetworkValue(key: string, value: unknown, ownSlug: string): unknown {
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

const OBJECT_ARRAY_KEYS = new Set([
  "Competitors", "Partnerships", "TypedRisks", "Faq", "OrgStructure",
  "Timeline", "InvestmentRounds", "TradFiComparison", "Sources", "Audits", "OffchainFacts",
]);

const STRING_ARRAY_KEYS = new Set([
  "Tags", "SecondarySectors", "StakingSecondaryTags", "LiquiditySecondaryTags",
  "DerivativesSecondaryTags", "OtherSecondaryTags", "RwaSecondaryTags",
  "StablecoinSecondaryTags", "DexSecondaryTags",
]);

function isPlainObject(v: unknown): boolean {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isValidNetworkShape(key: string, value: unknown): boolean {
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
