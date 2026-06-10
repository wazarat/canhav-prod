import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, CircleDot, Sparkles } from "lucide-react";

import { AgentLabPanel } from "@/components/agent/AgentLabPanel";
import { AgentIdentityCard } from "@/components/agent/AgentIdentityCard";
import { AgentMemoryPanel } from "@/components/agent/AgentMemoryPanel";
import { SkillShelf } from "@/components/agent/SkillShelf";
import { Badge } from "@/components/ui/Badge";
import { agentConfigStatus } from "@/lib/agent/config";
import { agentLevel, getAgentSnapshot } from "@/lib/agent/memory";
import { verifyAgentOnChain } from "@/lib/agent/onchain";
import { getAgentSkills } from "@/lib/agent/skills";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { agentId: string } }) {
  const snapshot = await getAgentSnapshot(decodeURIComponent(params.agentId));
  return { title: snapshot.profile ? snapshot.profile.name : "Agent" };
}

export default async function AgentHomePage({ params }: { params: { agentId: string } }) {
  const agentId = decodeURIComponent(params.agentId);
  const [snapshot, skills] = await Promise.all([getAgentSnapshot(agentId), getAgentSkills()]);
  const status = agentConfigStatus();

  const { profile, memory, studiedSkills } = snapshot;
  if (!profile) notFound();

  const level = agentLevel(memory.length, studiedSkills.length);
  const arbiscanUrl = profile.agentAddress
    ? `https://sepolia.arbiscan.io/address/${profile.agentAddress}`
    : null;

  // Verify the ERC-8004 identity on-chain (ownerOf matches the smart account)
  // for the live "Verified on-chain" badge. Only attempt it for minted agents.
  const verification = profile.onChain
    ? await verifyAgentOnChain(agentId, profile.agentAddress)
    : undefined;
  const agentCardUrl = profile.agentAddress
    ? `/api/agent/by-address/${profile.agentAddress}/agent-card`
    : null;

  return (
    <div className="container space-y-8 py-12">
      <nav className="flex items-center gap-1.5 text-sm text-ink-300">
        <Link href="/" className="transition-colors hover:text-ink-50">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <Link href="/agents" className="transition-colors hover:text-ink-50">
          Agents
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <span className="text-ink-100">{profile.name}</span>
      </nav>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
            {profile.name}
          </h1>
          <Badge tone="neon">
            <Sparkles className="h-3 w-3" /> Level {level}
          </Badge>
          <Badge tone="signal">Arbitrum Sepolia · Testnet</Badge>
          {profile.onChain ? (
            <Badge tone="positive">
              <CircleDot className="h-3 w-3 animate-pulse-soft" /> on-chain
            </Badge>
          ) : (
            <Badge tone="neutral">local</Badge>
          )}
        </div>
        <p className="font-mono text-xs text-ink-500">
          agent {profile.agentId}
          {profile.entitySlug ? ` · project ${profile.entitySlug}` : ""}
          {profile.skillId ? ` · skill ${profile.skillId}` : ""}
        </p>
        {profile.entitySlug && (
          <p className="text-sm text-ink-300">
            <Link
              href={`/entities/${profile.entitySlug}`}
              className="font-medium text-electric-400 hover:text-electric-300"
            >
              {profile.name.replace(/ — Research Skill$/, "")}
            </Link>
            {profile.associatedProducts.length > 0 && (
              <span className="text-ink-400">
                {" "}
                · scoped to {profile.associatedProducts.map((p) => p.symbol).join(", ")}
              </span>
            )}
          </p>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AgentLabPanel agentId={agentId} llmConfigured={status.llm} />
        </div>
        <div className="space-y-6">
          {profile.agentAddress && (
            <AgentIdentityCard
              identity={{
                agentId: profile.agentId,
                agentAddress: profile.agentAddress,
                agentURI: profile.agentURI,
                arbiscanUrl,
                skillTitle: profile.name,
                onChain: profile.onChain,
              }}
              verification={verification}
              agentCardUrl={agentCardUrl}
            />
          )}
          <AgentMemoryPanel memory={memory} studiedSkills={studiedSkills} />
          <SkillShelf
            agentId={agentId}
            allSkills={skills.map((s) => ({ id: s.id, title: s.title }))}
            studied={studiedSkills}
          />
        </div>
      </div>
    </div>
  );
}
