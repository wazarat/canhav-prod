import "server-only";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";

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
  consumedUnits: number;
  interactionCount: number;
  lastInteractionAt: string | null;
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
 * Backfill mode/cadence on legacy records (written before recurring tasks
 * existed) so the rest of the app can rely on the fields being present.
 */
function withDefaults(agreement: CollabAgreement): CollabAgreement {
  if (agreement.mode && agreement.cadence) return agreement;
  const mode: AgreementMode =
    agreement.mode ?? (agreement.totalInstallments > 1 ? "recurring" : "one_time");
  const cadence: AgreementCadence = agreement.cadence ?? "none";
  return { ...agreement, mode, cadence };
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

  const agreement: CollabAgreement = {
    agreementId: newAgreementId(),
    buyerAgentId: input.buyerAgentId,
    sellerAgentId: input.sellerAgentId,
    buyerUserId: input.buyerUserId,
    sellerUserId: input.sellerUserId,
    buyerAgentName: input.buyerAgentName,
    sellerAgentName: input.sellerAgentName,
    objective: input.objective.slice(0, MAX_OBJECTIVE_LEN),
    maxUnitsPerInteraction: clampInt(input.maxUnitsPerInteraction, 1, HARD_MAX_UNITS),
    totalInstallments,
    mode,
    cadence,
    pricePerInstallmentUsdc: input.pricePerInstallmentUsdc,
    cooldownSeconds,
    consumedUnits: 0,
    interactionCount: 0,
    lastInteractionAt: null,
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
  /** 0-based index of the interaction just consumed. */
  installmentIndex?: number;
}

/**
 * Validate (without mutating) that a buyer may consume one interaction of
 * `units` against an agreement. Returns the installment index it WOULD use.
 * Used before the buyer pays so funds aren't spent on a rejected interaction.
 */
export function validateInteraction(
  agreement: CollabAgreement,
  units: number,
  byUserId: string,
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
  if (agreement.interactionCount >= agreement.totalInstallments) {
    return { ok: false, error: "All installments for this agreement are exhausted." };
  }
  if (agreement.cooldownSeconds > 0 && agreement.lastInteractionAt) {
    const last = Date.parse(agreement.lastInteractionAt);
    const availableAt = last + agreement.cooldownSeconds * 1000;
    if (Date.now() < availableAt) {
      return {
        ok: false,
        error: "Cooldown active — wait before the next interaction.",
        retryAt: new Date(availableAt).toISOString(),
      };
    }
  }
  return { ok: true, agreement, installmentIndex: agreement.interactionCount };
}

/**
 * Enforce + record one interaction against an active agreement. Returns the
 * updated agreement (with incremented counters) or a structured error when a
 * cap / cooldown / status check fails. The caller is the buyer.
 */
export async function consumeAgreementInteraction(
  agreementId: string,
  units: number,
  byUserId: string,
): Promise<ConsumeResult> {
  const agreement = await getAgreement(agreementId);
  if (!agreement) return { ok: false, error: "Agreement not found." };

  const check = validateInteraction(agreement, units, byUserId);
  if (!check.ok) return check;

  const requested = Math.floor(units);
  const installmentIndex = agreement.interactionCount;
  agreement.consumedUnits += requested;
  agreement.interactionCount += 1;
  agreement.lastInteractionAt = nowIso();
  if (agreement.interactionCount >= agreement.totalInstallments) {
    agreement.status = "completed";
  }
  agreement.updatedAt = nowIso();
  await persist(agreement, false);
  return { ok: true, agreement, installmentIndex };
}

function clampInt(value: number, min: number, max: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}
