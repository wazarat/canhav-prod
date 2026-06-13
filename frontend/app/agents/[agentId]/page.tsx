import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, CircleDot, Rocket, Sparkles } from "lucide-react";

import { AgentFrameworkPanel } from "@/components/agent/AgentFrameworkPanel";
import { AgentLabPanel } from "@/components/agent/AgentLabPanel";
import { AgentNameEditor } from "@/components/agent/AgentNameEditor";
import { AgentSuggestions } from "@/components/agent/AgentSuggestions";
import { AgentIdentityCard } from "@/components/agent/AgentIdentityCard";
import { AgentMemoryPanel } from "@/components/agent/AgentMemoryPanel";
import { AgentPerformanceCard } from "@/components/agent/AgentPerformanceCard";
import { AttachSkillPanel } from "@/components/agent/AttachSkillPanel";
import { CollabSettingsPanel } from "@/components/agent/CollabSettingsPanel";
import { SkillShelf } from "@/components/agent/SkillShelf";
import { Badge } from "@/components/ui/Badge";
import { AgentToolPanel } from "@/components/agent/AgentToolPanel";
import { CustomToolsPanel } from "@/components/agent/CustomToolsPanel";
import { DataFramesPanel } from "@/components/agent/DataFramesPanel";
import { KnowledgePanel } from "@/components/agent/KnowledgePanel";
import { agentConfigStatus, hasEmbeddings } from "@/lib/agent/config";
import {
  CUSTOM_TOOL_LIMITS,
  customToolHttpAllowlist,
  listCustomTools,
} from "@/lib/agent/customTools";
import { frameMetricOptionsForProducts } from "@/lib/agent/dataframes";
import { KNOWLEDGE_LIMITS, knowledgeUrlAllowlist, listKnowledgeDocs } from "@/lib/agent/knowledge";
import {
  agentLevel,
  confirmAgentOnChain,
  getAgentSnapshot,
  listDataFrames,
  MAX_DATA_FRAMES,
} from "@/lib/agent/memory";
import { OWNER_CORRECTION_SOURCE } from "@/lib/agent/prompt";
import { buildAgentSuggestions, type AgentSuggestion } from "@/lib/agent/suggestions";
import { readAgentLedger, verifyAgentOnChain } from "@/lib/agent/onchain";
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

  // Enrichment state feeds the level for everyone; the editing surfaces
  // (options + suggestions) are owner-only.
  const [frames, knowledgeDocs, customTools] = await Promise.all([
    listDataFrames(agentId),
    listKnowledgeDocs(agentId),
    listCustomTools(agentId),
  ]);
  const [frameOptions, suggestions] = isOwner
    ? await Promise.all([
        frameMetricOptionsForProducts(profile.associatedProducts),
        buildAgentSuggestions(agentId, profile),
      ])
    : [[], [] as AgentSuggestion[]];

  const corrections = memory.filter((f) => f.source === OWNER_CORRECTION_SOURCE).length;
  const level = agentLevel(memory.length, studiedSkills.length, {
    frames: frames.length,
    knowledgeDocs: knowledgeDocs.length,
    customTools: customTools.length,
    corrections,
  });
  const arbiscanUrl = profile.agentAddress
    ? `https://sepolia.arbiscan.io/address/${profile.agentAddress}`
    : null;

  // Verify the ERC-8004 identity on-chain (ownerOf matches the smart account)
  // for the live "Verified on-chain" badge. Attempt it for any numeric tokenId —
  // including mints still pending server-side reconciliation — so the badge
  // reflects chain truth, not just the stored flag.
  const isNumericId = /^\d+$/.test(profile.agentId);
  const verification =
    isNumericId && (profile.onChain || profile.pendingVerification)
      ? await verifyAgentOnChain(agentId, profile.agentAddress)
      : undefined;
  // Self-heal the stored flag when a pending mint is confirmed on-chain.
  if (verification?.verified && (!profile.onChain || profile.pendingVerification)) {
    await confirmAgentOnChain(agentId);
    profile.onChain = true;
    profile.pendingVerification = false;
  }
  // The badge trusts the live read when we have one, falling back to the flag.
  const verifiedOnChain = verification ? verification.verified : profile.onChain;
  const agentCardJsonUrl = profile.agentAddress
    ? `/api/agent/by-address/${profile.agentAddress}/agent-card`
    : null;
  const cardPageUrl = `/agents/${encodeURIComponent(agentId)}/card`;
  // Arbiscan-first: a direct link to the minted ERC-721 token on the registry,
  // plus the platform's own on-chain verification endpoint.
  const registry = verification?.registry ?? null;
  const isMinted = verifiedOnChain && isNumericId;
  const tokenUrl =
    registry && isMinted
      ? `https://sepolia.arbiscan.io/token/${registry}?a=${profile.agentId}`
      : null;
  const verifyUrl = isMinted ? `/api/agent/${encodeURIComponent(agentId)}/verify` : null;

  // Objective, behavior-derived merit from the on-chain ledger (null when no
  // ledger / factory unset) — complements the subjective reputation score.
  const ledgerStats = isNumericId ? await readAgentLedger(agentId) : null;
  const ledgerExplorerUrl = ledgerStats
    ? `https://sepolia.arbiscan.io/address/${ledgerStats.ledger}`
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
          <AgentNameEditor
            agentId={agentId}
            name={profile.name}
            category={profile.category}
            isOwner={isOwner}
          />
          <Badge tone="neon">
            <Sparkles className="h-3 w-3" /> Level {level}
          </Badge>
          <Badge tone="signal">Arbitrum Sepolia · Testnet</Badge>
          {verifiedOnChain ? (
            <Badge tone="positive">
              <CircleDot className="h-3 w-3 animate-pulse-soft" /> verified
            </Badge>
          ) : profile.pendingVerification ? (
            <Badge tone="neutral">verifying…</Badge>
          ) : (
            <Badge tone="neutral">draft</Badge>
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
        {!verifiedOnChain && (
          <div className="flex flex-wrap items-start gap-3 rounded-xl border border-ink-700/80 bg-ink-900/40 px-4 py-3">
            <Rocket className="mt-0.5 h-4 w-4 shrink-0 text-electric-400" />
            <p className="text-sm text-ink-300">
              This agent is <span className="font-medium text-ink-100">local only</span> — it has
              no ERC-8004 token yet, so there is nothing to scan on Arbiscan.{" "}
              <Link
                href="/agents#create"
                className="font-medium text-electric-400 hover:text-electric-300"
              >
                Launch a new agent on the Agents tab
              </Link>{" "}
              to mint a wallet-owned ERC-8004 token on Arbitrum Sepolia.
            </p>
          </div>
        )}
      </header>

      {isOwner && suggestions.length > 0 && (
        <AgentSuggestions agentId={agentId} suggestions={suggestions} />
      )}

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
                onChain: verifiedOnChain,
              }}
              verification={verification}
              agentCardUrl={agentCardJsonUrl}
              cardPageUrl={cardPageUrl}
              verifyUrl={verifyUrl}
            />
          )}
          {isMinted && <AgentPerformanceCard stats={ledgerStats} explorerUrl={ledgerExplorerUrl} />}
          {isOwner && (
            <div id="panel-tools">
              <AgentToolPanel
                agentId={agentId}
                entitySlug={profile.entitySlug}
                entityName={profile.name.replace(/ — Research Skill$/, "")}
                associatedProducts={profile.associatedProducts}
                frames={frames.map((f) => ({ id: f.id, title: f.title }))}
              />
            </div>
          )}
          <AgentMemoryPanel memory={memory} studiedSkills={studiedSkills} />
          <SkillShelf
            agentId={agentId}
            allSkills={skills.map((s) => ({
              id: s.id,
              title: s.title,
              summary: s.summary,
              group: s.group,
            }))}
            studied={studiedSkills}
          />
          {isOwner && (
            <>
              <div id="panel-framework">
                <AgentFrameworkPanel agentId={agentId} config={profile.config} />
              </div>
              <div id="panel-frames">
                <DataFramesPanel
                  agentId={agentId}
                  frames={frames}
                  options={frameOptions}
                  max={MAX_DATA_FRAMES}
                />
              </div>
              <div id="panel-knowledge">
                <KnowledgePanel
                  agentId={agentId}
                  docs={knowledgeDocs}
                  max={KNOWLEDGE_LIMITS.docsMax}
                  embeddings={hasEmbeddings()}
                  urlIngestionEnabled={knowledgeUrlAllowlist().length > 0}
                />
              </div>
              <div id="panel-custom-tools">
                <CustomToolsPanel
                  agentId={agentId}
                  tools={customTools}
                  max={CUSTOM_TOOL_LIMITS.toolsMax}
                  httpEnabled={customToolHttpAllowlist().length > 0}
                />
              </div>
              <AttachSkillPanel agentId={agentId} onChain={profile.onChain} />
              <CollabSettingsPanel
                agentId={agentId}
                discoverable={profile.discoverable}
                collabPriceUsdc={profile.collabPriceUsdc}
                description={profile.description}
                collabMaxUnits={profile.collabMaxUnits}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
