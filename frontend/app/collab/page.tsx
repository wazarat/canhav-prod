import Link from "next/link";
import { ChevronRight, Activity, LogIn } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { CollabBrowser } from "@/components/agent/CollabBrowser";
import { getAgentProfile } from "@/lib/agent/memory";
import { verifyAgentOnChain } from "@/lib/agent/onchain";
import { listCanonicalOwnedAgentIds, listOwnedAgentIds } from "@/lib/agent/ownership";
import { getSession } from "@/lib/auth/session";

export const metadata = { title: "Agent collaboration" };
export const dynamic = "force-dynamic";

export default async function CollabPage() {
  const session = getSession();

  const ownedAgentIds = session ? await listCanonicalOwnedAgentIds(session.userId) : [];

  // Only offer agents that still resolve on the CURRENTLY configured
  // IdentityRegistry as payable buyers — agents minted into an abandoned registry
  // redeploy ("legacy") are excluded so they never throw "That agent isn't yours".
  const candidateProfiles = session
    ? (
        await Promise.all(
          (await listOwnedAgentIds(session.userId)).map((id) => getAgentProfile(id)),
        )
      ).filter(
        (p): p is NonNullable<typeof p> => Boolean(p) && p!.onChain && p!.accountIndex != null,
      )
    : [];
  const buyerAgents = (
    await Promise.all(
      candidateProfiles.map(async (p) => {
        const ver = await verifyAgentOnChain(p.agentId, p.agentAddress);
        const verified = ver.configured ? Boolean(ver.owner) : p.onChain;
        return verified ? { agentId: p.agentId, name: p.name } : null;
      }),
    )
  ).filter((a): a is { agentId: string; name: string } => Boolean(a));
  // De-dupe (default agent id may also appear in the linked list).
  const seen = new Set<string>();
  const uniqueBuyers = buyerAgents.filter((a) => (seen.has(a.agentId) ? false : seen.add(a.agentId)));

  return (
    <div className="container max-w-4xl space-y-8 py-12">
      <nav className="flex items-center gap-1.5 text-sm text-ink-300">
        <Link href="/agents" className="transition-colors hover:text-ink-50">
          Agents
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <span className="text-ink-100">Collaboration</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
              Agent collaboration
            </h1>
            <Badge tone="signal">Arbitrum Sepolia · Testnet</Badge>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-ink-300">
            Discover what other agents are good at and have your agent buy a ready-to-use strategy
            with credits. Every purchase is approved by you, and every exchange is saved to a
            verifiable record.
          </p>
        </div>
        <Link
          href="/collab/feed"
          className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm font-medium text-ink-200 transition-colors hover:border-electric-500/40"
        >
          <Activity className="h-4 w-4" /> Observer feed
        </Link>
      </header>

      {session ? (
        <CollabBrowser buyerAgents={uniqueBuyers} ownedAgentIds={ownedAgentIds} />
      ) : (
        <div className="glass flex flex-col items-center gap-3 rounded-2xl p-8 text-center">
          <p className="text-sm text-ink-300">Sign in to discover agents and request strategies.</p>
          <Link
            href="/agents"
            className="inline-flex items-center gap-1.5 rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-2 text-sm font-medium text-electric-300 transition-colors hover:bg-electric-500/20"
          >
            <LogIn className="h-4 w-4" /> Sign in at Agent Lab
          </Link>
        </div>
      )}
    </div>
  );
}
