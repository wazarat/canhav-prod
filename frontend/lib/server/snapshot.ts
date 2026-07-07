import "server-only";

import { fetchJson, nowIso } from "@/lib/server/http";

/**
 * Snapshot governance client (keyless Tier-1).
 *
 * NOTE ON SIGNATURE: unlike the protocol clients (Morpho, Kamino) which fetch a
 * single fixed market, Snapshot data is PER GOVERNANCE SPACE. So the fetcher
 * takes a `space` id (an ENS-style handle such as "aavedao.eth" or
 * "uniswapgovernance.eth"). The caller must source that space id from the
 * network seed/profile (see wiring spec).
 */

const SNAPSHOT_GRAPHQL = "https://hub.snapshot.org/graphql";

/** How many recent proposals we aggregate turnout / vote counts over. */
const RECENT_PROPOSALS = 30;
/** How many recent votes we sample to estimate the unique-voter set. */
const RECENT_VOTES_SAMPLE = 1000;

export interface SnapshotLiveMetrics {
  /** Lifetime proposals count for the space (from space.proposalsCount). */
  totalProposals: number | null;
  /** Proposals currently in the "active" voting state (recent window). */
  activeProposals: number | null;
  /** Sum of `votes` (ballots cast) across the recent proposals window. */
  totalVotesRecent: number | null;
  /** Unique voter addresses seen in the recent votes sample. */
  uniqueVoters: number | null;
  /** Average ballots cast per proposal across the recent window. */
  avgVotesPerProposal: number | null;
  /** Average vote weight (scores_total) per proposal across the recent window. */
  avgVoteWeightPerProposal: number | null;
  /** Space follower count (from space.followersCount). */
  followers: number | null;
  /** ISO timestamp of the most recent proposal's end (voting close). */
  lastProposalEndIso: string | null;
}

interface SnapshotSpaceRow {
  id?: string;
  name?: string;
  proposalsCount?: number | null;
  followersCount?: number | null;
  votesCount?: number | null;
}

interface SnapshotProposalRow {
  id?: string;
  state?: string | null;
  scores_total?: number | null;
  votes?: number | null;
  end?: number | null;
  start?: number | null;
}

interface SnapshotVoteRow {
  voter?: string | null;
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

const SPACE_QUERY = `
  query SnapshotSpace($space: String!) {
    space(id: $space) {
      id
      name
      proposalsCount
      followersCount
      votesCount
    }
  }
`;

const PROPOSALS_QUERY = `
  query SnapshotProposals($space: String!, $first: Int!) {
    proposals(
      first: $first
      where: { space: $space }
      orderBy: "created"
      orderDirection: desc
    ) {
      id
      state
      scores_total
      votes
      end
      start
    }
  }
`;

const VOTES_QUERY = `
  query SnapshotVotes($space: String!, $first: Int!) {
    votes(
      first: $first
      where: { space: $space }
      orderBy: "created"
      orderDirection: desc
    ) {
      voter
    }
  }
`;

async function gql<T>(query: string, variables: Record<string, unknown>, revalidate?: number) {
  const { status, data } = await fetchJson(SNAPSHOT_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    revalidate,
  });
  return { status, data: (data?.data ?? null) as T | null };
}

/**
 * Aggregate governance activity for a single Snapshot space via the keyless
 * public GraphQL hub. Fails soft: returns `null` if the space query is
 * unreachable or the space does not exist.
 */
export async function fetchSnapshotLiveMetrics(
  space: string,
  revalidate?: number,
): Promise<SnapshotLiveMetrics | null> {
  if (!space) return null;

  const spaceRes = await gql<{ space: SnapshotSpaceRow | null }>(
    SPACE_QUERY,
    { space },
    revalidate,
  );
  if (spaceRes.status !== 200 || !spaceRes.data?.space) return null;
  const spaceRow = spaceRes.data.space;

  const [proposalsRes, votesRes] = await Promise.all([
    gql<{ proposals: SnapshotProposalRow[] | null }>(
      PROPOSALS_QUERY,
      { space, first: RECENT_PROPOSALS },
      revalidate,
    ),
    gql<{ votes: SnapshotVoteRow[] | null }>(
      VOTES_QUERY,
      { space, first: RECENT_VOTES_SAMPLE },
      revalidate,
    ),
  ]);

  const proposals =
    proposalsRes.status === 200 && Array.isArray(proposalsRes.data?.proposals)
      ? proposalsRes.data!.proposals
      : [];

  let activeProposals = 0;
  let totalVotesRecent = 0;
  let voteWeightSum = 0;
  let voteWeightCount = 0;
  let lastEnd: number | null = null;

  for (const p of proposals) {
    if (p.state === "active") activeProposals += 1;
    const v = num(p.votes);
    if (v != null) totalVotesRecent += v;
    const w = num(p.scores_total);
    if (w != null) {
      voteWeightSum += w;
      voteWeightCount += 1;
    }
    const end = num(p.end);
    if (end != null && (lastEnd == null || end > lastEnd)) lastEnd = end;
  }

  const proposalCount = proposals.length;

  // Unique voters from the recent votes sample.
  const voterRows =
    votesRes.status === 200 && Array.isArray(votesRes.data?.votes)
      ? votesRes.data!.votes
      : [];
  const voterSet = new Set<string>();
  for (const row of voterRows) {
    const addr = row.voter?.toLowerCase().trim();
    if (addr) voterSet.add(addr);
  }

  return {
    totalProposals: num(spaceRow.proposalsCount),
    activeProposals: proposalCount > 0 ? activeProposals : null,
    totalVotesRecent: proposalCount > 0 ? totalVotesRecent : null,
    uniqueVoters: voterSet.size > 0 ? voterSet.size : null,
    avgVotesPerProposal:
      proposalCount > 0 ? totalVotesRecent / proposalCount : null,
    avgVoteWeightPerProposal:
      voteWeightCount > 0 ? voteWeightSum / voteWeightCount : null,
    followers: num(spaceRow.followersCount),
    lastProposalEndIso:
      lastEnd != null ? new Date(lastEnd * 1000).toISOString().replace(/\.\d{3}Z$/, "Z") : null,
  };
}

/**
 * Build a plain (inferred) overlay object of `Sourced<>` cells for the
 * numeric governance metrics. Spread-conditional so only non-null cells appear.
 * The consuming collector maps these into `GovernanceActivityDetail`
 * (proposals / voterTurnoutPct) — see wiring spec.
 */
export function snapshotMetricsToTagOverlay(metrics: SnapshotLiveMetrics) {
  const sourced = (value: number | null) => ({
    value,
    dataSource: "live" as const,
    sourceLabel: "Snapshot",
    updatedAt: nowIso(),
  });

  return {
    ...(metrics.totalProposals != null ? { totalProposals: sourced(metrics.totalProposals) } : {}),
    ...(metrics.activeProposals != null ? { activeProposals: sourced(metrics.activeProposals) } : {}),
    ...(metrics.totalVotesRecent != null ? { totalVotesRecent: sourced(metrics.totalVotesRecent) } : {}),
    ...(metrics.uniqueVoters != null ? { uniqueVoters: sourced(metrics.uniqueVoters) } : {}),
    ...(metrics.avgVotesPerProposal != null
      ? { avgVotesPerProposal: sourced(metrics.avgVotesPerProposal) }
      : {}),
    ...(metrics.avgVoteWeightPerProposal != null
      ? { avgVoteWeightPerProposal: sourced(metrics.avgVoteWeightPerProposal) }
      : {}),
    ...(metrics.followers != null ? { followers: sourced(metrics.followers) } : {}),
  };
}
