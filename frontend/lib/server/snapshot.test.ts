/**
 * Integration test for the Snapshot governance client.
 *
 * Guarded by RUN_INTEGRATION (hits the live keyless Snapshot GraphQL hub).
 * Suite self-skips when RUN_INTEGRATION is unset, and per-field assertions
 * self-skip only when the hub is unreachable (network error). Wrong SHAPES
 * fail loudly.
 *
 *   RUN_INTEGRATION=1 npx jest lib/server/snapshot.test.ts
 */
import {
  fetchSnapshotLiveMetrics,
  snapshotMetricsToTagOverlay,
  type SnapshotLiveMetrics,
} from "./snapshot";

const RUN = process.env.RUN_INTEGRATION === "1";
const d = RUN ? describe : describe.skip;

// Stable, high-activity space with active + closed proposals.
const SPACE = "uniswapgovernance.eth";

const ISO_RE = /^\d{4}-\d{2}-\d{2}T/;

function isNullableFiniteNumber(v: unknown): boolean {
  return v === null || (typeof v === "number" && Number.isFinite(v));
}

d("fetchSnapshotLiveMetrics (integration)", () => {
  let reachable = false;
  let metrics: SnapshotLiveMetrics | null = null;

  beforeAll(async () => {
    metrics = await fetchSnapshotLiveMetrics(SPACE);
    // null with a working network still means "reachable but no space" — but
    // for this known-good space a null result means the hub was unreachable.
    reachable = metrics !== null;
  });

  test("returns a metrics object (or skips on unreachable hub)", () => {
    if (!reachable) {
      console.warn("Snapshot hub unreachable — skipping shape assertions.");
      return;
    }
    expect(metrics).not.toBeNull();
    expect(typeof metrics).toBe("object");
  });

  test("totalProposals is a nullable finite number and positive for this space", () => {
    if (!reachable) return;
    expect(isNullableFiniteNumber(metrics!.totalProposals)).toBe(true);
    // Uniswap governance has many lifetime proposals.
    expect(metrics!.totalProposals).toBeGreaterThan(0);
  });

  test("activeProposals is a nullable finite number", () => {
    if (!reachable) return;
    expect(isNullableFiniteNumber(metrics!.activeProposals)).toBe(true);
    if (metrics!.activeProposals != null) {
      expect(metrics!.activeProposals).toBeGreaterThanOrEqual(0);
    }
  });

  test("totalVotesRecent is a nullable finite number", () => {
    if (!reachable) return;
    expect(isNullableFiniteNumber(metrics!.totalVotesRecent)).toBe(true);
    if (metrics!.totalVotesRecent != null) {
      expect(metrics!.totalVotesRecent).toBeGreaterThan(0);
    }
  });

  test("uniqueVoters is a nullable finite number", () => {
    if (!reachable) return;
    expect(isNullableFiniteNumber(metrics!.uniqueVoters)).toBe(true);
    if (metrics!.uniqueVoters != null) {
      expect(metrics!.uniqueVoters).toBeGreaterThan(0);
    }
  });

  test("avgVotesPerProposal is a nullable finite number", () => {
    if (!reachable) return;
    expect(isNullableFiniteNumber(metrics!.avgVotesPerProposal)).toBe(true);
  });

  test("avgVoteWeightPerProposal is a nullable finite number", () => {
    if (!reachable) return;
    expect(isNullableFiniteNumber(metrics!.avgVoteWeightPerProposal)).toBe(true);
  });

  test("followers is a nullable finite number", () => {
    if (!reachable) return;
    expect(isNullableFiniteNumber(metrics!.followers)).toBe(true);
  });

  test("lastProposalEndIso is null or an ISO timestamp string", () => {
    if (!reachable) return;
    const v = metrics!.lastProposalEndIso;
    expect(v === null || typeof v === "string").toBe(true);
    if (typeof v === "string") {
      expect(v).toMatch(ISO_RE);
      expect(Number.isNaN(Date.parse(v))).toBe(false);
    }
  });

  test("overlay cells conform to Sourced<T> and only expose non-null metrics", () => {
    if (!reachable) return;
    const overlay = snapshotMetricsToTagOverlay(metrics!) as Record<
      string,
      { value: number | null; dataSource: string; sourceLabel?: string; updatedAt?: string | null }
    >;
    for (const [key, cell] of Object.entries(overlay)) {
      expect(cell).toHaveProperty("value");
      expect(isNullableFiniteNumber(cell.value)).toBe(true);
      // Spread-conditional means only non-null metrics appear.
      expect(cell.value).not.toBeNull();
      expect(cell.dataSource).toBe("live");
      expect(cell.sourceLabel).toBe("Snapshot");
      expect(typeof cell.updatedAt).toBe("string");
      expect(cell.updatedAt as string).toMatch(ISO_RE);
      expect(key.length).toBeGreaterThan(0);
    }
  });
});
