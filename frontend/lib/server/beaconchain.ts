import "server-only";

import { fetchJson, nowIso } from "@/lib/server/http";

/**
 * Ethereum consensus-layer (Beacon Chain) live metrics — network-wide, keyless.
 *
 * NOTE ON THE SOURCE NAME
 * -----------------------
 * The plan targeted `beaconcha.in`, but as of 2026 every `beaconcha.in/api/v1`
 * data endpoint returns HTTP 401 ("a valid API key is required") — the free
 * keyless tier was retired on 2026-05-26 and replaced by a 30-day trial key
 * (20 req/min, 30k/day). It is therefore no longer a keyless Tier-1 source.
 *
 * To keep the same Ethereum-consensus data set keyless, this client sources the
 * identical figures from two public, keyless, pre-aggregated upstreams that
 * beaconcha.in itself indexes off:
 *
 *   1. ultrasound.money  — tiny pre-aggregated consensus JSON:
 *        GET /api/v2/fees/effective-balance-sum  -> { sum }        (Gwei)
 *        GET /api/v2/fees/eth-supply-parts        -> { beaconBalancesSum } (Gwei)
 *        GET /api/v2/fees/validator-rewards       -> { issuance:{ apr } }
 *   2. Standard Beacon Node API (publicnode.com mirror) — the canonical
 *      consensus API, keyless:
 *        GET /eth/v1/beacon/states/finalized/finality_checkpoints
 *        GET /eth/v1/beacon/states/head/pending_partial_withdrawals
 *        GET /eth/v1/beacon/states/head/pending_consolidations
 *
 * UNITS: `sum` / `beaconBalancesSum` are Gwei. Convert to ETH via `/ 1e9`.
 *
 * Fields that genuinely require a heavyweight (40 MB) full-validator-set walk
 * or the key-gated beaconcha.in `/epoch/latest` aggregate are left null and
 * documented as Tier-2 below (active validator count, global participation
 * rate, slashing-event count, activation-queue length).
 */

const ULTRASOUND_API = "https://ultrasound.money/api/v2/fees";
const BEACON_NODE_API = "https://ethereum-beacon-api.publicnode.com";

const GWEI_PER_ETH = 1e9;

export interface BeaconchainLiveMetrics {
  /** Total ETH staked (effective balance sum, Gwei→ETH). */
  totalEthStaked: number | null;
  /** Total ETH staked (actual beacon balance sum, Gwei→ETH). */
  totalEthStakedActual: number | null;
  /** Network staking APR (%) — issuance reward APR. */
  stakingAprPct: number | null;
  /** Exit-side withdrawal queue length (pending partial withdrawals count). */
  withdrawalQueueLength: number | null;
  /** Pending validator consolidations count (Electra queue). */
  consolidationQueueLength: number | null;
  /** Latest finalized consensus epoch (liveness / finality proxy). */
  finalizedEpoch: number | null;

  /* --- Tier-2 (unavailable keyless & lightweight → always null) --- */
  /** Active validator count — needs the ~40 MB validator set or a key. */
  activeValidatorCount: number | null;
  /** Global participation rate — needs attestation aggregation or a key. */
  participationRate: number | null;
  /** Slashing-event count — key-gated on beaconcha.in. */
  slashingEventCount: number | null;
  /** Activation-queue length — pending_deposits is a ~19 MB payload. */
  activationQueueLength: number | null;
}

function num(v: string | number | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Count entries in a `{ data: [...] }` Beacon API list envelope. */
function listCount(data: unknown): number | null {
  const arr = (data as { data?: unknown })?.data;
  return Array.isArray(arr) ? arr.length : null;
}

/**
 * Fetch keyless Ethereum consensus-layer metrics. Fails soft: any single
 * upstream that errors leaves its field(s) null rather than aborting. Returns
 * null only if every upstream is unreachable (no field could be populated).
 */
export async function fetchBeaconchainLiveMetrics(
  revalidate?: number,
): Promise<BeaconchainLiveMetrics | null> {
  const [ebs, parts, rewards, finality, withdrawals, consolidations] = await Promise.all([
    fetchJson(`${ULTRASOUND_API}/effective-balance-sum`, { revalidate }),
    fetchJson(`${ULTRASOUND_API}/eth-supply-parts`, { revalidate }),
    fetchJson(`${ULTRASOUND_API}/validator-rewards`, { revalidate }),
    fetchJson(`${BEACON_NODE_API}/eth/v1/beacon/states/finalized/finality_checkpoints`, {
      revalidate,
    }),
    fetchJson(`${BEACON_NODE_API}/eth/v1/beacon/states/head/pending_partial_withdrawals`, {
      revalidate,
    }),
    fetchJson(`${BEACON_NODE_API}/eth/v1/beacon/states/head/pending_consolidations`, {
      revalidate,
    }),
  ]);

  // Total ETH staked (effective balance, Gwei → ETH).
  const effectiveGwei = ebs.status === 200 ? num(ebs.data?.sum) : null;
  const totalEthStaked = effectiveGwei != null ? effectiveGwei / GWEI_PER_ETH : null;

  // Total ETH staked (actual beacon balance, Gwei → ETH).
  const actualGwei = parts.status === 200 ? num(parts.data?.beaconBalancesSum) : null;
  const totalEthStakedActual = actualGwei != null ? actualGwei / GWEI_PER_ETH : null;

  // Issuance APR is a 0–1 fraction → percent.
  const aprFraction = rewards.status === 200 ? num(rewards.data?.issuance?.apr) : null;
  const stakingAprPct = aprFraction != null ? aprFraction * 100 : null;

  // Latest finalized epoch (string in envelope).
  const finalizedEpoch =
    finality.status === 200 ? num(finality.data?.data?.finalized?.epoch) : null;

  const withdrawalQueueLength = withdrawals.status === 200 ? listCount(withdrawals.data) : null;
  const consolidationQueueLength =
    consolidations.status === 200 ? listCount(consolidations.data) : null;

  const anyLive =
    totalEthStaked != null ||
    totalEthStakedActual != null ||
    stakingAprPct != null ||
    finalizedEpoch != null ||
    withdrawalQueueLength != null ||
    consolidationQueueLength != null;

  if (!anyLive) return null;

  return {
    totalEthStaked,
    totalEthStakedActual,
    stakingAprPct,
    withdrawalQueueLength,
    consolidationQueueLength,
    finalizedEpoch,
    // Tier-2 — unavailable keyless & lightweight.
    activeValidatorCount: null,
    participationRate: null,
    slashingEventCount: null,
    activationQueueLength: null,
  };
}

/**
 * Map consensus metrics to a plain inferred `Sourced<T>` overlay for the Staking
 * sector. These are network-wide Ethereum figures (not per-protocol), so the
 * caller attaches this to the Ethereum-consensus staking rollup, not to an LST
 * protocol row. Spread-conditional on non-null keeps null fields Tier-2.
 */
export function beaconchainMetricsToTagOverlay(metrics: BeaconchainLiveMetrics) {
  const sourced = <T>(value: T, label = "beaconcha.in") => ({
    value,
    dataSource: "live" as const,
    sourceLabel: label,
    updatedAt: nowIso(),
  });

  const withdrawalQueue =
    metrics.withdrawalQueueLength != null
      ? `${metrics.withdrawalQueueLength} pending partial withdrawals` +
        (metrics.consolidationQueueLength != null
          ? `, ${metrics.consolidationQueueLength} consolidations`
          : "")
      : null;

  return {
    ...(metrics.totalEthStaked != null
      ? { totalEthStaked: sourced(metrics.totalEthStaked) }
      : {}),
    ...(metrics.totalEthStakedActual != null
      ? { totalEthStakedActual: sourced(metrics.totalEthStakedActual) }
      : {}),
    ...(metrics.stakingAprPct != null ? { stakingAprPct: sourced(metrics.stakingAprPct) } : {}),
    ...(metrics.finalizedEpoch != null
      ? { finalizedEpoch: sourced(metrics.finalizedEpoch) }
      : {}),
    ...(withdrawalQueue != null ? { withdrawalQueue } : {}),
  };
}
