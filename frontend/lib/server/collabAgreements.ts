import "server-only";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";

import { keccak256, toBytes } from "viem";

import { repoRoot } from "@/lib/server/env";
import { getRedisClient, hasUpstash } from "@/lib/server/redis";

/**
 * Human-in-the-loop collaboration agreements (off-chain store).
 *
 * A buyer proposes an agreement against a seller agent: an objective, the
 * maximum interaction `units` per exchange (the ceiling both humans sign off
 * on), the number of `installments` (max interactions), price per installment,
 * and a cooldown between interactions. The seller (the human owner) approves or
 * rejects. Once active, every paid interaction is consumed against the
 * agreement, enforcing the anti-extraction limits:
 *
 *   - units must be 0 < units <= maxUnitsPerInteraction (the agreed ceiling),
 *   - the buyer can never exceed `totalInstallments` interactions (the buyer
 *     can't drain the seller — only the agreed slices drip out),
 *   - a per-agreement cooldown throttles the cadence.
 *
 * The off-chain agreement mirrors `CollabAgreement.sol`; when that contract is
 * deployed and the agreement is anchored, the same ceiling is enforced on-chain.
 *
 * Persistence: Upstash Redis in production; a local JSON file for offline dev
 * (gitignored). One record per agreement plus per-user index sets.
 */

export type AgreementStatus =
  | "proposed"
  | "active"
  | "rejected"
  | "cancelled"
  | "completed";

/** Whether the collaboration is a single task or a recurring engagement. */
export type AgreementMode = "one_time" | "recurring";

/** Recurring cadence — drives the on-chain-enforced cooldown between periods. */
export type AgreementCadence = "none" | "daily" | "weekly" | "monthly";

/** Cadence -> seconds between allowed check-ins (the cooldown the contract enforces). */
export const CADENCE_COOLDOWN_SECONDS: Record<AgreementCadence, number> = {
  none: 0,
  daily: 86_400,
  weekly: 604_800,
  monthly: 2_592_000,
};

export function cooldownForCadence(cadence: AgreementCadence): number {
  return CADENCE_COOLDOWN_SECONDS[cadence] ?? 0;
}

export interface CollabAgreement {
  agreementId: string;
  buyerAgentId: string;
  sellerAgentId: string;
  /** Owner (Privy user id) of the buyer agent — proposes + approves each interaction. */
  buyerUserId: string;
  /** Owner of the seller agent — approves/rejects the proposal. Null = seeded/legacy. */
  sellerUserId: string | null;
  buyerAgentName: string;
  sellerAgentName: string;
  objective: string;
  /** The agreed per-interaction ceiling (data slices / units). */
  maxUnitsPerInteraction: number;
  /** Number of allowed interactions (installments / periods / check-ins). */
  totalInstallments: number;
  /** One-time task vs a recurring engagement. */
  mode: AgreementMode;
  /** Recurring cadence (daily/weekly/monthly); "none" for one-time. */
  cadence: AgreementCadence;
  /** Human USDC price the buyer pays per interaction. */
  pricePerInstallmentUsdc: string;
  /** Minimum seconds between interactions (anti-extraction throttle; derived from cadence). */
  cooldownSeconds: number;
  /* --- Richer terms (committed via termsHash on-chain) --- */
  /** The specific seller service the buyer picked (title), or null for the general objective. */
  selectedJobTitle: string | null;
  /** The chosen service's description, captured at proposal time. */
  selectedJobDescription: string | null;
  /**
   * Max agent CALLS allowed within one period. 0 = legacy mode (exactly one call
   * per period, gated by the cooldown — preserves prior behaviour).
   */
  callBudgetPerPeriod: number;
  /**
   * Max tokens/credits the buyer may consume within one period (the chatbot-style
   * allowance). 0 = no token accounting / unlimited.
   */
  tokenBudgetPerPeriod: number;
  /** How many updates the seller commits to deliver per period (informational). */
  updatesPerPeriod: number;
  /** Whether the deliverable is connected to a Dune dashboard. */
  duneLinked: boolean;
  /** Optional Dune dashboard URL when `duneLinked`. */
  duneUrl: string | null;
  /** keccak256 of the canonical terms JSON — the on-chain commitment to all terms. */
  termsHash: string | null;
  consumedUnits: number;
  interactionCount: number;
  lastInteractionAt: string | null;
  /* --- Per-period budget accounting (resets each period) --- */
  /** 0-based index of the current budget period. */
  periodIndex: number;
  /** ISO timestamp the current period opened (null until the first call). */
  periodStartedAt: string | null;
  /** Calls consumed in the current period. */
  periodCalls: number;
  /** Tokens consumed in the current period. */
  periodTokens: number;
  status: AgreementStatus;
  createdAt: string;
  updatedAt: string;
  /** Optional on-chain anchor in CollabAgreement.sol (bytes32 hex). */
  onChainAgreementId: string | null;
  establishTx: string | null;
}

export const MAX_OBJECTIVE_LEN = 600;
export const DEFAULT_MAX_UNITS = 3;
export const HARD_MAX_UNITS = 20;
export const DEFAULT_INSTALLMENTS = 4;
export const HARD_MAX_INSTALLMENTS = 52;
export const DEFAULT_COOLDOWN_SECONDS = 30;
export const HARD_MAX_CALL_BUDGET = 100_000;
export const HARD_MAX_TOKEN_BUDGET = 100_000_000;
export const HARD_MAX_UPDATES = 1_000;
export const MAX_JOB_TITLE_LEN = 80;
export const MAX_JOB_DESC_LEN = 300;
export const MAX_DUNE_URL_LEN = 300;

/**
 * Canonical, deterministic terms object used to derive `termsHash`. Both the
 * off-chain store and the on-chain anchor commit to this exact shape so the hash
 * verifies the full human-readable terms (jobs, budgets, Dune linkage) even
 * though only the numeric/flag fields live on-chain.
 */
export interface CanonicalTerms {
  buyerAgentId: string;
  sellerAgentId: string;
  objective: string;
  selectedJobTitle: string;
  selectedJobDescription: string;
  maxUnitsPerInteraction: number;
  totalInstallments: number;
  mode: AgreementMode;
  cadence: AgreementCadence;
  pricePerInstallmentUsdc: string;
  callBudgetPerPeriod: number;
  tokenBudgetPerPeriod: number;
  updatesPerPeriod: number;
  duneLinked: boolean;
  duneUrl: string;
}

/** Stable-key JSON so the hash is reproducible regardless of property order. */
function canonicalize(terms: CanonicalTerms): string {
  const ordered: CanonicalTerms = {
    buyerAgentId: terms.buyerAgentId,
    sellerAgentId: terms.sellerAgentId,
    objective: terms.objective,
    selectedJobTitle: terms.selectedJobTitle,
    selectedJobDescription: terms.selectedJobDescription,
    maxUnitsPerInteraction: terms.maxUnitsPerInteraction,
    totalInstallments: terms.totalInstallments,
    mode: terms.mode,
    cadence: terms.cadence,
    pricePerInstallmentUsdc: terms.pricePerInstallmentUsdc,
    callBudgetPerPeriod: terms.callBudgetPerPeriod,
    tokenBudgetPerPeriod: terms.tokenBudgetPerPeriod,
    updatesPerPeriod: terms.updatesPerPeriod,
    duneLinked: terms.duneLinked,
    duneUrl: terms.duneUrl,
  };
  return JSON.stringify(ordered);
}

/** keccak256 of the canonical terms JSON (bytes32 hex). */
export function computeTermsHash(terms: CanonicalTerms): `0x${string}` {
  return keccak256(toBytes(canonicalize(terms)));
}

const aKey = (id: string) => `collab:agreement:${id}`;
const buyerIndexKey = (userId: string) => `collab:agreements:buyer:${userId}`;
const sellerIndexKey = (userId: string) => `collab:agreements:seller:${userId}`;

function nowIso(): string {
  return new Date().toISOString();
}

function newAgreementId(): string {
  return `agr_${randomBytes(9).toString("hex")}`;
}

/* ----------------------------- file fallback ----------------------------- */

interface FileStore {
  agreements: Record<string, CollabAgreement>;
}

function filePath(): string {
  return path.join(repoRoot(), "backend", "data", "collab-agreements.json");
}

function readFileStore(): FileStore {
  try {
    const parsed = JSON.parse(readFileSync(filePath(), "utf-8")) as Partial<FileStore>;
    return { agreements: parsed.agreements ?? {} };
  } catch {
    return { agreements: {} };
  }
}

function writeFileStore(store: FileStore): void {
  try {
    const p = filePath();
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
  } catch {
    /* read-only fs — best-effort */
  }
}

function coerce(value: unknown): CollabAgreement | null {
  if (value == null) return null;
  if (typeof value === "object") return withDefaults(value as CollabAgreement);
  if (typeof value === "string") {
    try {
      return withDefaults(JSON.parse(value) as CollabAgreement);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Backfill mode/cadence + the richer-terms / per-period fields on legacy records
 * (written before these existed) so the rest of the app can rely on the fields
 * being present. Idempotent and additive.
 */
function withDefaults(agreement: CollabAgreement): CollabAgreement {
  const mode: AgreementMode =
    agreement.mode ?? (agreement.totalInstallments > 1 ? "recurring" : "one_time");
  const cadence: AgreementCadence = agreement.cadence ?? "none";
  return {
    ...agreement,
    mode,
    cadence,
    selectedJobTitle: agreement.selectedJobTitle ?? null,
    selectedJobDescription: agreement.selectedJobDescription ?? null,
    callBudgetPerPeriod: agreement.callBudgetPerPeriod ?? 0,
    tokenBudgetPerPeriod: agreement.tokenBudgetPerPeriod ?? 0,
    updatesPerPeriod: agreement.updatesPerPeriod ?? 0,
    duneLinked: agreement.duneLinked ?? false,
    duneUrl: agreement.duneUrl ?? null,
    termsHash: agreement.termsHash ?? null,
    periodIndex: agreement.periodIndex ?? 0,
    periodStartedAt: agreement.periodStartedAt ?? agreement.lastInteractionAt ?? null,
    periodCalls: agreement.periodCalls ?? 0,
    periodTokens: agreement.periodTokens ?? 0,
  };
}

/**
 * When the next check-in is allowed, or null if it's available now (first
 * period, no cooldown, or the agreement isn't active). Drives the UI countdown.
 */
export function nextDueAt(agreement: CollabAgreement): string | null {
  if (agreement.status !== "active") return null;
  if (!agreement.lastInteractionAt || agreement.cooldownSeconds <= 0) return null;
  return new Date(
    Date.parse(agreement.lastInteractionAt) + agreement.cooldownSeconds * 1000,
  ).toISOString();
}

async function persist(agreement: CollabAgreement, isNew: boolean): Promise<void> {
  if (hasUpstash()) {
    const redis = getRedisClient();
    await redis.set(aKey(agreement.agreementId), JSON.stringify(agreement));
    if (isNew) {
      await redis.sadd(buyerIndexKey(agreement.buyerUserId), agreement.agreementId);
      if (agreement.sellerUserId) {
        await redis.sadd(sellerIndexKey(agreement.sellerUserId), agreement.agreementId);
      }
    }
    return;
  }
  const store = readFileStore();
  store.agreements[agreement.agreementId] = agreement;
  writeFileStore(store);
}

/* -------------------------------- queries -------------------------------- */

export async function getAgreement(agreementId: string): Promise<CollabAgreement | null> {
  if (!agreementId) return null;
  if (hasUpstash()) {
    return coerce(await getRedisClient().get(aKey(agreementId)));
  }
  const stored = readFileStore().agreements[agreementId];
  return stored ? withDefaults(stored) : null;
}

async function getMany(ids: string[]): Promise<CollabAgreement[]> {
  const out: CollabAgreement[] = [];
  for (const id of ids) {
    const a = await getAgreement(id);
    if (a) out.push(a);
  }
  return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export interface UserAgreements {
  asBuyer: CollabAgreement[];
  asSeller: CollabAgreement[];
}

export async function listAgreementsForUser(userId: string): Promise<UserAgreements> {
  if (hasUpstash()) {
    const redis = getRedisClient();
    const buyerIds = ((await redis.smembers(buyerIndexKey(userId))) as string[] | null) ?? [];
    const sellerIds = ((await redis.smembers(sellerIndexKey(userId))) as string[] | null) ?? [];
    return { asBuyer: await getMany(buyerIds), asSeller: await getMany(sellerIds) };
  }
  const all = Object.values(readFileStore().agreements).map(withDefaults);
  return {
    asBuyer: all
      .filter((a) => a.buyerUserId === userId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    asSeller: all
      .filter((a) => a.sellerUserId === userId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  };
}

/* ------------------------------- mutations ------------------------------- */

export interface ProposeAgreementInput {
  buyerAgentId: string;
  sellerAgentId: string;
  buyerUserId: string;
  sellerUserId: string | null;
  buyerAgentName: string;
  sellerAgentName: string;
  objective: string;
  maxUnitsPerInteraction: number;
  totalInstallments: number;
  pricePerInstallmentUsdc: string;
  /** One-time task vs recurring engagement (defaults derived from installments). */
  mode?: AgreementMode;
  /** Recurring cadence; ignored for one-time. */
  cadence?: AgreementCadence;
  /** Only used as a fallback when mode is recurring but cadence is "none". */
  cooldownSeconds?: number;
  /* --- Richer terms --- */
  /** Chosen seller service title (one of the seller's advertised jobs). */
  selectedJobTitle?: string | null;
  /** Chosen seller service description. */
  selectedJobDescription?: string | null;
  /** Max calls per period (0 = one call per period, cooldown-gated). */
  callBudgetPerPeriod?: number;
  /** Max tokens/credits per period (0 = unlimited). */
  tokenBudgetPerPeriod?: number;
  /** Updates the seller delivers per period (informational). */
  updatesPerPeriod?: number;
  /** Whether the deliverable links to a Dune dashboard. */
  duneLinked?: boolean;
  /** Dune dashboard URL (when duneLinked). */
  duneUrl?: string | null;
}

export async function proposeAgreement(
  input: ProposeAgreementInput,
): Promise<CollabAgreement> {
  const now = nowIso();

  const requestedInstallments = clampInt(input.totalInstallments, 1, HARD_MAX_INSTALLMENTS);
  // Default the shape from the installment count when the caller didn't say.
  let mode: AgreementMode = input.mode ?? (requestedInstallments > 1 ? "recurring" : "one_time");
  let cadence: AgreementCadence = input.cadence ?? "none";
  let totalInstallments = requestedInstallments;
  let cooldownSeconds: number;

  if (mode === "one_time") {
    // A single task: exactly one period, no cadence/cooldown.
    totalInstallments = 1;
    cadence = "none";
    cooldownSeconds = 0;
  } else {
    // Recurring: the cadence drives the enforced cooldown between check-ins. If a
    // cadence wasn't chosen, fall back to the explicit cooldown (legacy callers).
    mode = "recurring";
    cooldownSeconds =
      cadence === "none"
        ? clampInt(input.cooldownSeconds ?? DEFAULT_COOLDOWN_SECONDS, 0, 86_400)
        : cooldownForCadence(cadence);
  }

  const objective = input.objective.slice(0, MAX_OBJECTIVE_LEN);
  const selectedJobTitle = (input.selectedJobTitle ?? "").trim().slice(0, MAX_JOB_TITLE_LEN) || null;
  const selectedJobDescription =
    (input.selectedJobDescription ?? "").trim().slice(0, MAX_JOB_DESC_LEN) || null;
  const callBudgetPerPeriod = clampInt(input.callBudgetPerPeriod ?? 0, 0, HARD_MAX_CALL_BUDGET);
  const tokenBudgetPerPeriod = clampInt(input.tokenBudgetPerPeriod ?? 0, 0, HARD_MAX_TOKEN_BUDGET);
  const updatesPerPeriod = clampInt(input.updatesPerPeriod ?? 0, 0, HARD_MAX_UPDATES);
  const duneUrl = (input.duneUrl ?? "").trim().slice(0, MAX_DUNE_URL_LEN) || null;
  const duneLinked = Boolean(input.duneLinked) || duneUrl != null;
  const maxUnitsPerInteraction = clampInt(input.maxUnitsPerInteraction, 1, HARD_MAX_UNITS);
  const pricePerInstallmentUsdc = input.pricePerInstallmentUsdc;

  const termsHash = computeTermsHash({
    buyerAgentId: input.buyerAgentId,
    sellerAgentId: input.sellerAgentId,
    objective,
    selectedJobTitle: selectedJobTitle ?? "",
    selectedJobDescription: selectedJobDescription ?? "",
    maxUnitsPerInteraction,
    totalInstallments,
    mode,
    cadence,
    pricePerInstallmentUsdc,
    callBudgetPerPeriod,
    tokenBudgetPerPeriod,
    updatesPerPeriod,
    duneLinked,
    duneUrl: duneUrl ?? "",
  });

  const agreement: CollabAgreement = {
    agreementId: newAgreementId(),
    buyerAgentId: input.buyerAgentId,
    sellerAgentId: input.sellerAgentId,
    buyerUserId: input.buyerUserId,
    sellerUserId: input.sellerUserId,
    buyerAgentName: input.buyerAgentName,
    sellerAgentName: input.sellerAgentName,
    objective,
    maxUnitsPerInteraction,
    totalInstallments,
    mode,
    cadence,
    pricePerInstallmentUsdc,
    cooldownSeconds,
    selectedJobTitle,
    selectedJobDescription,
    callBudgetPerPeriod,
    tokenBudgetPerPeriod,
    updatesPerPeriod,
    duneLinked,
    duneUrl,
    termsHash,
    consumedUnits: 0,
    interactionCount: 0,
    lastInteractionAt: null,
    periodIndex: 0,
    periodStartedAt: null,
    periodCalls: 0,
    periodTokens: 0,
    status: "proposed",
    createdAt: now,
    updatedAt: now,
    onChainAgreementId: null,
    establishTx: null,
  };
  await persist(agreement, true);
  return agreement;
}

export type AgreementAction = "approve" | "reject" | "cancel";

export interface ActionResult {
  ok: boolean;
  error?: string;
  agreement?: CollabAgreement;
}

/**
 * Apply a lifecycle action with authorization:
 *   - approve / reject: only the seller's owner, only from `proposed`.
 *   - cancel: either party, from `proposed` or `active`.
 */
export async function actOnAgreement(
  agreementId: string,
  action: AgreementAction,
  byUserId: string,
): Promise<ActionResult> {
  const agreement = await getAgreement(agreementId);
  if (!agreement) return { ok: false, error: "Agreement not found." };

  const isBuyer = agreement.buyerUserId === byUserId;
  const isSeller = agreement.sellerUserId === byUserId;

  if (action === "approve" || action === "reject") {
    if (!isSeller) return { ok: false, error: "Only the seller can respond to this proposal." };
    if (agreement.status !== "proposed") {
      return { ok: false, error: `Agreement is already ${agreement.status}.` };
    }
    agreement.status = action === "approve" ? "active" : "rejected";
  } else {
    if (!isBuyer && !isSeller) return { ok: false, error: "Not your agreement." };
    if (agreement.status !== "proposed" && agreement.status !== "active") {
      return { ok: false, error: `Agreement is already ${agreement.status}.` };
    }
    agreement.status = "cancelled";
  }

  agreement.updatedAt = nowIso();
  await persist(agreement, false);
  return { ok: true, agreement };
}

/** Record an on-chain anchor (CollabAgreement.establish) once available. */
export async function anchorAgreement(
  agreementId: string,
  onChainAgreementId: string,
  establishTx: string,
): Promise<CollabAgreement | null> {
  const agreement = await getAgreement(agreementId);
  if (!agreement) return null;
  agreement.onChainAgreementId = onChainAgreementId;
  agreement.establishTx = establishTx;
  agreement.updatedAt = nowIso();
  await persist(agreement, false);
  return agreement;
}

export interface ConsumeResult {
  ok: boolean;
  error?: string;
  /** When throttled, the ISO time the next interaction is allowed. */
  retryAt?: string;
  agreement?: CollabAgreement;
  /** 0-based index of the period the interaction WOULD use / used. */
  installmentIndex?: number;
}

/** Resolved view of the current budget period (after rolling forward if elapsed). */
interface PeriodView {
  index: number;
  startedAtMs: number | null;
  calls: number;
  tokens: number;
  /** True when this resolution opened a new period (counters reset). */
  rolled: boolean;
}

/**
 * Resolve the active budget period for `agreement` at time `atMs`. A period is
 * `cooldownSeconds` long: once that window elapses the call/token counters reset
 * and the index advances. The first call ever opens period 0. When there's no
 * cooldown (one-time tasks) there's a single open period that never rolls.
 */
function resolvePeriod(agreement: CollabAgreement, atMs: number): PeriodView {
  if (agreement.periodStartedAt == null) {
    return { index: 0, startedAtMs: null, calls: 0, tokens: 0, rolled: true };
  }
  const startedAtMs = Date.parse(agreement.periodStartedAt);
  const len = agreement.cooldownSeconds;
  if (len > 0 && Number.isFinite(startedAtMs) && atMs - startedAtMs >= len * 1000) {
    return { index: agreement.periodIndex + 1, startedAtMs: null, calls: 0, tokens: 0, rolled: true };
  }
  return {
    index: agreement.periodIndex,
    startedAtMs: Number.isFinite(startedAtMs) ? startedAtMs : null,
    calls: agreement.periodCalls,
    tokens: agreement.periodTokens,
    rolled: false,
  };
}

/** ISO time the current period ends (when the next period unlocks), or null. */
function periodEndsAt(agreement: CollabAgreement, period: PeriodView): string | null {
  if (agreement.cooldownSeconds <= 0 || period.startedAtMs == null) return null;
  return new Date(period.startedAtMs + agreement.cooldownSeconds * 1000).toISOString();
}

/** Per-period call ceiling: explicit budget, or 1 in legacy (cooldown-gated) mode. */
function callCeiling(agreement: CollabAgreement): number {
  return agreement.callBudgetPerPeriod > 0 ? agreement.callBudgetPerPeriod : 1;
}

/**
 * Validate (without mutating) that a buyer may consume one interaction of
 * `units` (optionally `tokens`) against an agreement. Returns the period index
 * it WOULD use. Used before the buyer pays so funds aren't spent on a rejected
 * interaction. Enforces, in order: the per-interaction unit ceiling, the total
 * number of periods, the per-period call budget (cooldown in legacy mode), and
 * the per-period token budget.
 */
export function validateInteraction(
  agreement: CollabAgreement,
  units: number,
  byUserId: string,
  tokens = 0,
): ConsumeResult {
  if (agreement.buyerUserId !== byUserId) {
    return { ok: false, error: "Only the buyer can transact on this agreement." };
  }
  if (agreement.status !== "active") {
    return { ok: false, error: `Agreement is ${agreement.status}, not active.` };
  }
  const requested = Math.floor(units);
  if (!Number.isFinite(requested) || requested < 1) {
    return { ok: false, error: "Units must be a positive integer." };
  }
  if (requested > agreement.maxUnitsPerInteraction) {
    return {
      ok: false,
      error: `Requested ${requested} units exceeds the agreed ceiling of ${agreement.maxUnitsPerInteraction}.`,
    };
  }

  const period = resolvePeriod(agreement, Date.now());
  if (period.index >= agreement.totalInstallments) {
    return { ok: false, error: "All periods for this agreement are exhausted." };
  }

  // Per-period call budget. In legacy mode (budget 0 -> ceiling 1) this is the
  // old "one interaction per cooldown" throttle; with a budget it's the cap on
  // calls within the period.
  if (period.calls >= callCeiling(agreement)) {
    const retryAt = periodEndsAt(agreement, period) ?? undefined;
    return {
      ok: false,
      error:
        agreement.callBudgetPerPeriod > 0
          ? `Call budget for this period reached (${agreement.callBudgetPerPeriod}). Wait for the next period.`
          : "Cooldown active — wait before the next interaction.",
      retryAt,
    };
  }

  // Per-period token budget (the chatbot-style allowance).
  const requestedTokens = Math.max(0, Math.floor(tokens));
  if (
    agreement.tokenBudgetPerPeriod > 0 &&
    period.tokens + requestedTokens > agreement.tokenBudgetPerPeriod
  ) {
    const retryAt = periodEndsAt(agreement, period) ?? undefined;
    return {
      ok: false,
      error: `Token budget for this period reached (${agreement.tokenBudgetPerPeriod}). Wait for the next period.`,
      retryAt,
    };
  }

  return { ok: true, agreement, installmentIndex: period.index };
}

/**
 * Enforce + record one interaction against an active agreement. Returns the
 * updated agreement (with incremented counters) or a structured error when a
 * cap / budget / cooldown / status check fails. The caller is the buyer.
 * `tokens` is the size of the token/credit draw for the per-period allowance.
 */
export async function consumeAgreementInteraction(
  agreementId: string,
  units: number,
  byUserId: string,
  tokens = 0,
): Promise<ConsumeResult> {
  const agreement = await getAgreement(agreementId);
  if (!agreement) return { ok: false, error: "Agreement not found." };

  const check = validateInteraction(agreement, units, byUserId, tokens);
  if (!check.ok) return check;

  const now = nowIso();
  const nowMs = Date.parse(now);
  const period = resolvePeriod(agreement, nowMs);
  const requested = Math.floor(units);
  const requestedTokens = Math.max(0, Math.floor(tokens));

  // Apply the resolved period (rolling forward resets the per-period counters).
  agreement.periodIndex = period.index;
  if (period.rolled) {
    agreement.periodStartedAt = now;
    agreement.periodCalls = 0;
    agreement.periodTokens = 0;
  }
  agreement.periodCalls += 1;
  agreement.periodTokens += requestedTokens;

  agreement.consumedUnits += requested;
  agreement.interactionCount += 1;
  agreement.lastInteractionAt = now;

  // Completed when the final period's call budget is fully consumed.
  const lastPeriod = agreement.periodIndex >= agreement.totalInstallments - 1;
  if (lastPeriod && agreement.periodCalls >= callCeiling(agreement)) {
    agreement.status = "completed";
  }

  agreement.updatedAt = now;
  await persist(agreement, false);
  return { ok: true, agreement, installmentIndex: period.index };
}

function clampInt(value: number, min: number, max: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}
