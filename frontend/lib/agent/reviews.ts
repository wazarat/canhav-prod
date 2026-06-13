import "server-only";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { repoRoot } from "@/lib/server/env";
import { getRedisClient, hasUpstash } from "@/lib/server/redis";

/**
 * Exchange-verified review store (the text layer on top of the numeric
 * reputation average).
 *
 * A review is only written by {@link import("@/app/api/collab/feedback/route")}
 * after it has already proven the rating belongs to a settled exchange for the
 * exact buyer/seller pair and that the `paymentRef` has not been rated before —
 * so every review here is backed by a real, paid collaboration on Arbitrum
 * Sepolia. This is purely the read model for the marketplace seller view; the
 * durable attestation is the on-chain CollabRegistry record + (flag-off)
 * ReputationRegistry feedback.
 *
 * Key: `agent:{id}:reviews` -> list of JSON review strings (newest first).
 */

export interface AgentReview {
  id: string;
  /** The seller agent being reviewed. */
  agentId: string;
  /** The buyer agent that paid for the exchange. */
  fromAgentId: string;
  /** Human-readable label for the reviewer (buyer agent name). */
  reviewerHandle: string;
  rating: number;
  comment: string | null;
  /** The settled exchange tx hash this review is bound to. */
  paymentRef: string;
  ts: string;
}

export const MAX_REVIEW_COMMENT_LEN = 600;

const key = (agentId: string) => `agent:${agentId}:reviews`;

function filePath(): string {
  return path.join(repoRoot(), "backend", "data", "collab-reviews.json");
}

function readFile(): Record<string, AgentReview[]> {
  try {
    return JSON.parse(readFileSync(filePath(), "utf-8")) as Record<string, AgentReview[]>;
  } catch {
    return {};
  }
}

function writeFile(store: Record<string, AgentReview[]>): void {
  try {
    const p = filePath();
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
  } catch {
    /* read-only fs — best-effort */
  }
}

function coerce(value: unknown): AgentReview | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as AgentReview;
    } catch {
      return null;
    }
  }
  return value as AgentReview;
}

function randomId(): string {
  return `rev_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export interface AppendReviewInput {
  agentId: string;
  fromAgentId: string;
  reviewerHandle: string;
  rating: number;
  comment?: string | null;
  paymentRef: string;
}

/** Persist an exchange-verified review (newest first). */
export async function appendReview(input: AppendReviewInput): Promise<AgentReview> {
  const comment = (input.comment ?? "").trim().slice(0, MAX_REVIEW_COMMENT_LEN) || null;
  const review: AgentReview = {
    id: randomId(),
    agentId: input.agentId,
    fromAgentId: input.fromAgentId,
    reviewerHandle: input.reviewerHandle || "A buyer agent",
    rating: Math.max(1, Math.min(5, Math.round(input.rating))),
    comment,
    paymentRef: input.paymentRef,
    ts: new Date().toISOString(),
  };

  if (hasUpstash()) {
    await getRedisClient().lpush(key(input.agentId), JSON.stringify(review));
  } else {
    const store = readFile();
    store[input.agentId] = [review, ...(store[input.agentId] ?? [])];
    writeFile(store);
  }
  return review;
}

/** List an agent's reviews (newest first). */
export async function listReviews(agentId: string, limit = 50): Promise<AgentReview[]> {
  if (hasUpstash()) {
    const raw = (await getRedisClient().lrange(key(agentId), 0, limit - 1)) as unknown[];
    return raw.map((v) => coerce(v)).filter((r): r is AgentReview => Boolean(r));
  }
  return (readFile()[agentId] ?? []).slice(0, limit);
}
