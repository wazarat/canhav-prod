import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, CircleDot, Rocket, Sparkles } from "lucide-react";

import { AgentLabPanel } from "@/components/agent/AgentLabPanel";
import { AgentIdentityCard } from "@/components/agent/AgentIdentityCard";
import { AgentMemoryPanel } from "@/components/agent/AgentMemoryPanel";
import { AttachSkillPanel } from "@/components/agent/AttachSkillPanel";
import { CollabSettingsPanel } from "@/components/agent/CollabSettingsPanel";
import { SkillShelf } from "@/components/agent/SkillShelf";
import { Badge } from "@/components/ui/Badge";
import { agentConfigStatus } from "@/lib/agent/config";
import { agentLevel, getAgentSnapshot } from "@/lib/agent/memory";
import { verifyAgentOnChain } from "@/lib/agent/onchain";
import { getAgentSkills } from "@/lib/agent/skills";
import { getSession } from "@/lib/auth/session";
import { listUserAgentIds } from "@/lib/auth/users";
import { userAgentId } from "@/lib/agent/user-agent";

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

  // Only the owner can attach skills / toggle discoverability.
  const session = getSession();
  const ownedIds = session
    ? new Set([userAgentId(session.userId), ...(await listUserAgentIds(session.userId))])
    : new Set<string>();
  const isOwner = ownedIds.has(agentId);

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
  // Arbiscan-first: a direct link to the minted ERC-721 token on the registry,
  // plus the platform's own on-chain verification endpoint.
  const registry = verification?.registry ?? null;
  const isMinted = profile.onChain && /^\d+$/.test(profile.agentId);
  const tokenUrl =
    registry && isMinted
      ? `https://sepolia.arbiscan.io/token/${registry}?a=${profile.agentId}`
      : null;
  const verifyUrl = isMinted ? `/api/agent/${encodeURIComponent(agentId)}/verify` : null;

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
        {!profile.onChain && (
          <div className="flex flex-wrap items-start gap-3 rounded-xl border border-ink-700/80 bg-ink-900/40 px-4 py-3">
            <Rocket className="mt-0.5 h-4 w-4 shrink-0 text-electric-400" />
            <p className="text-sm text-ink-300">
              This agent is <span className="font-medium text-ink-100">local only</span> — it has
              no ERC-8004 token yet, so there is nothing to scan on Arbiscan.{" "}
              {profile.entitySlug ? (
                <Link
                  href={`/entities/${profile.entitySlug}`}
                  className="font-medium text-electric-400 hover:text-electric-300"
                >
                  Create its on-chain identity on the {profile.entitySlug} page
                </Link>
              ) : (
                <Link
                  href="/entities"
                  className="font-medium text-electric-400 hover:text-electric-300"
                >
                  Open an entity page
                </Link>
              )}{" "}
              to mint a wallet-owned ERC-8004 token on Arbitrum Sepolia.
            </p>
          </div>
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
                tokenUrl,
                skillTitle: profile.name,
                onChain: profile.onChain,
              }}
              verification={verification}
              agentCardUrl={agentCardUrl}
              verifyUrl={verifyUrl}
            />
          )}
          <AgentMemoryPanel memory={memory} studiedSkills={studiedSkills} />
          <SkillShelf
            agentId={agentId}
            allSkills={skills.map((s) => ({ id: s.id, title: s.title }))}
            studied={studiedSkills}
          />
          {isOwner && (
            <>
              <AttachSkillPanel agentId={agentId} onChain={profile.onChain} />
              <CollabSettingsPanel
                agentId={agentId}
                discoverable={profile.discoverable}
                collabPriceUsdc={profile.collabPriceUsdc}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
