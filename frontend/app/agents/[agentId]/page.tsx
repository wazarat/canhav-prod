import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, CircleDot, Rocket, Sparkles, Store } from "lucide-react";

import { AgentFrameworkPanel } from "@/components/agent/AgentFrameworkPanel";
import { AgentLabPanel } from "@/components/agent/AgentLabPanel";
import { AgentNameEditor } from "@/components/agent/AgentNameEditor";
import { AgentSuggestions } from "@/components/agent/AgentSuggestions";
import { AgentIdentityCard } from "@/components/agent/AgentIdentityCard";
import { AgentMemoryPanel } from "@/components/agent/AgentMemoryPanel";
import { AgentPerformanceCard } from "@/components/agent/AgentPerformanceCard";
import { VerdictFeed } from "@/components/agent/VerdictFeed";
import { ProposedTradesPanel } from "@/components/agent/ProposedTradesPanel";
import { AttachSkillPanel } from "@/components/agent/AttachSkillPanel";
import { CollabSettingsPanel } from "@/components/agent/CollabSettingsPanel";
import { DunePublishPanel } from "@/components/agent/DunePublishPanel";
import { PublishAgentCard } from "@/components/agent/PublishAgentCard";
import { SkillShelf } from "@/components/agent/SkillShelf";
import { TrainingChecklist } from "@/components/agent/detail/TrainingChecklist";
import { TradeDesk } from "@/components/agent/trade/TradeDesk";
import { Badge } from "@/components/ui/Badge";
import { SectionNav, type SectionNavItem } from "@/components/ui/SectionNav";
import { TabBar } from "@/components/ui/TabBar";
import { TabHashRedirect } from "@/components/ui/TabHashRedirect";
import {
  agentHashToTab,
  buildAgentTabs,
  DEFAULT_AGENT_TAB,
  resolveAgentTab,
} from "@/lib/agent/agentTabs";
import { AgentToolPanel } from "@/components/agent/AgentToolPanel";
import { CustomToolsPanel } from "@/components/agent/CustomToolsPanel";
import { DataFramesPanel } from "@/components/agent/DataFramesPanel";
import { KnowledgePanel } from "@/components/agent/KnowledgePanel";
import { agentConfigStatus, hasEmbeddings } from "@/lib/agent/config";
import { hasMeaningfulConfig } from "@/lib/agent/agentConfig";
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
  getAttachedSkillIds,
  listDataFrames,
  MAX_DATA_FRAMES,
} from "@/lib/agent/memory";
import { OWNER_CORRECTION_SOURCE } from "@/lib/agent/prompt";
import { buildAgentSuggestions } from "@/lib/agent/suggestions";
import { readAgentLedger, verifyAgentOnChain } from "@/lib/agent/onchain";
import { getAgentSkills } from "@/lib/agent/skills";
import { collabSettlement, hasTcnhv } from "@/lib/agent/collab-config";
import { getSession } from "@/lib/auth/session";
import { userOwnsAgent } from "@/lib/agent/ownership";
import { canMintTcnhv } from "@/lib/server/factory";
import { demoAgentConfig } from "@/lib/agent/verdictRunner";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { agentId: string } }) {
  const snapshot = await getAgentSnapshot(decodeURIComponent(params.agentId));
  return { title: snapshot.profile ? snapshot.profile.name : "Agent" };
}

export default async function AgentHomePage({
  params,
  searchParams,
}: {
  params: { agentId: string };
  searchParams: { tab?: string };
}) {
  const agentId = decodeURIComponent(params.agentId);
  const snapshot = await getAgentSnapshot(agentId);
  const status = agentConfigStatus();

  const { profile, memory, studiedSkills } = snapshot;
  if (!profile) notFound();

  // Only the owner can attach skills / toggle discoverability / trade / train.
  const session = getSession();
  const isOwner = session
    ? await userOwnsAgent(session.userId, agentId, profile.ownerUserId)
    : false;

  const activeTab = resolveAgentTab(searchParams.tab, { isOwner });
  const tabs = buildAgentTabs({ isOwner });
  const basePath = `/agents/${encodeURIComponent(agentId)}`;

  // Enrichment counts feed the level badge for everyone (and the Train tab's
  // checklist), so they stay unconditional. Heavier editing data is fetched
  // per-tab below.
  const [frames, knowledgeDocs, customTools] = await Promise.all([
    listDataFrames(agentId),
    listKnowledgeDocs(agentId),
    listCustomTools(agentId),
  ]);
  const suggestions = isOwner ? await buildAgentSuggestions(agentId, profile) : [];

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
  const cardPageUrl = `${basePath}/card`;
  // Arbiscan-first: a direct link to the minted ERC-721 token on the registry,
  // plus the platform's own on-chain verification endpoint.
  const registry = verification?.registry ?? null;
  const isMinted = verifiedOnChain && isNumericId;
  const tokenUrl =
    registry && isMinted
      ? `https://sepolia.arbiscan.io/token/${registry}?a=${profile.agentId}`
      : null;
  const verifyUrl = isMinted ? `/api/agent/${encodeURIComponent(agentId)}/verify` : null;

  const hasVerdictLoop = Boolean(demoAgentConfig(agentId));

  return (
    <div className="container space-y-8 py-12">
      <TabHashRedirect
        hashToTab={agentHashToTab({ isOwner })}
        activeTab={activeTab}
        basePath={basePath}
        defaultTab={DEFAULT_AGENT_TAB}
      />

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

      <header id="agent-overview" className="space-y-3 scroll-mt-32">
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
              href={`/networks/${profile.entitySlug}`}
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

      <TabBar
        basePath={basePath}
        activeTab={activeTab}
        tabs={tabs}
        defaultTab={DEFAULT_AGENT_TAB}
        trailing={
          <Link
            href="/collab"
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-neon-500/40 bg-neon-500/10 px-3 py-1.5 text-xs font-medium text-neon-400 transition-colors hover:bg-neon-500/20"
          >
            <Store className="h-3 w-3" /> Browse marketplace
          </Link>
        }
      />

      {isOwner && suggestions.length > 0 && (
        <AgentSuggestions agentId={agentId} suggestions={suggestions} />
      )}

      {activeTab === "trade" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {hasVerdictLoop && (
              <div id="panel-verdicts" className="scroll-mt-32">
                <VerdictFeed agentId={agentId} />
              </div>
            )}
            {isOwner && <ProposedTradesPanel agentId={agentId} />}
            <div id="panel-chat" className="scroll-mt-32">
              <AgentLabPanel agentId={agentId} llmConfigured={status.llm} />
            </div>
          </div>
          <div className="space-y-6">
            <TradeDesk agentId={agentId} config={profile.config} isOwner={isOwner} />
          </div>
        </div>
      )}

      {activeTab === "train" && isOwner && (
        <TrainTab
          agentId={agentId}
          profile={profile}
          memory={memory}
          studiedSkills={studiedSkills}
          frames={frames}
          knowledgeDocs={knowledgeDocs}
          customTools={customTools}
          corrections={corrections}
        />
      )}

      {activeTab === "publish" && isOwner && (
        <PublishTab
          agentId={agentId}
          profile={profile}
          isMinted={isMinted}
        />
      )}

      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            {profile.agentAddress && (
              <div id="panel-identity" className="scroll-mt-32">
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
              </div>
            )}
            {isMinted && <PerformanceSection agentId={agentId} />}
          </div>
          <div className="space-y-6">
            {isOwner && (
              <AgentToolPanel
                agentId={agentId}
                entitySlug={profile.entitySlug}
                entityName={profile.name.replace(/ — Research Skill$/, "")}
                associatedProducts={profile.associatedProducts}
                frames={frames.map((f) => ({ id: f.id, title: f.title }))}
              />
            )}
            {!isOwner && (
              <>
                <div id="panel-memory" className="scroll-mt-32">
                  <AgentMemoryPanel memory={memory} studiedSkills={studiedSkills} />
                </div>
                <ReadOnlySkillShelf agentId={agentId} studiedSkills={studiedSkills} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Overview: on-chain ledger merit (fetched only when this tab renders). */
async function PerformanceSection({ agentId }: { agentId: string }) {
  const ledgerStats = await readAgentLedger(agentId);
  const ledgerExplorerUrl = ledgerStats
    ? `https://sepolia.arbiscan.io/address/${ledgerStats.ledger}`
    : null;
  return (
    <div id="panel-performance" className="scroll-mt-32">
      <AgentPerformanceCard stats={ledgerStats} explorerUrl={ledgerExplorerUrl} />
    </div>
  );
}

async function ReadOnlySkillShelf({
  agentId,
  studiedSkills,
}: {
  agentId: string;
  studiedSkills: string[];
}) {
  const skills = await getAgentSkills();
  return (
    <div id="panel-skills" className="scroll-mt-32">
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
    </div>
  );
}

type AgentSnapshotData = Awaited<ReturnType<typeof getAgentSnapshot>>;
type AgentProfileData = NonNullable<AgentSnapshotData["profile"]>;

/**
 * Train tab: the guided training surface — checklist up top, then every
 * enrichment editor at full width with an in-tab jump nav.
 */
async function TrainTab({
  agentId,
  profile,
  memory,
  studiedSkills,
  frames,
  knowledgeDocs,
  customTools,
  corrections,
}: {
  agentId: string;
  profile: AgentProfileData;
  memory: AgentSnapshotData["memory"];
  studiedSkills: string[];
  frames: Awaited<ReturnType<typeof listDataFrames>>;
  knowledgeDocs: Awaited<ReturnType<typeof listKnowledgeDocs>>;
  customTools: Awaited<ReturnType<typeof listCustomTools>>;
  corrections: number;
}) {
  const [frameOptions, skills] = await Promise.all([
    frameMetricOptionsForProducts(profile.associatedProducts),
    getAgentSkills(),
  ]);

  const trainNav: SectionNavItem[] = [
    { id: "panel-framework", label: "Framework" },
    { id: "panel-knowledge", label: "Knowledge" },
    { id: "panel-frames", label: "Data frames" },
    { id: "panel-skills", label: "Skills" },
    { id: "panel-attach-skill", label: "Attach skill" },
    { id: "panel-custom-tools", label: "Custom tools" },
    { id: "panel-memory", label: "Memory" },
  ];

  return (
    <div className="space-y-6">
      <TrainingChecklist
        agentId={agentId}
        frameworkConfigured={hasMeaningfulConfig(profile.config)}
        knowledgeDocs={knowledgeDocs.length}
        skillsStudied={studiedSkills.length}
        framesPinned={frames.length}
        corrections={corrections}
      />

      <SectionNav variant="bar" items={trainNav} stickyTopClassName="top-28" />

      <div id="panel-framework" className="scroll-mt-40">
        <AgentFrameworkPanel agentId={agentId} config={profile.config} />
      </div>
      <div id="panel-knowledge" className="scroll-mt-40">
        <KnowledgePanel
          agentId={agentId}
          docs={knowledgeDocs}
          max={KNOWLEDGE_LIMITS.docsMax}
          embeddings={hasEmbeddings()}
          urlIngestionEnabled={knowledgeUrlAllowlist().length > 0}
        />
      </div>
      <div id="panel-frames" className="scroll-mt-40">
        <DataFramesPanel
          agentId={agentId}
          frames={frames}
          options={frameOptions}
          max={MAX_DATA_FRAMES}
        />
      </div>
      <div id="panel-skills" className="scroll-mt-40">
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
      </div>
      <div id="panel-attach-skill" className="scroll-mt-40">
        <AttachSkillPanel agentId={agentId} onChain={profile.onChain} />
      </div>
      <div id="panel-custom-tools" className="scroll-mt-40">
        <CustomToolsPanel
          agentId={agentId}
          tools={customTools}
          max={CUSTOM_TOOL_LIMITS.toolsMax}
          httpEnabled={customToolHttpAllowlist().length > 0}
        />
      </div>
      <div id="panel-memory" className="scroll-mt-40">
        <AgentMemoryPanel memory={memory} studiedSkills={studiedSkills} />
      </div>
    </div>
  );
}

/** Publish tab: marketplace listing, collab settings, and Dune (demoted). */
async function PublishTab({
  agentId,
  profile,
  isMinted,
}: {
  agentId: string;
  profile: AgentProfileData;
  isMinted: boolean;
}) {
  const attachedSkillIds = await getAttachedSkillIds(agentId);

  return (
    <div className="space-y-6">
      <div id="panel-marketplace" className="scroll-mt-32">
        <PublishAgentCard
          agentId={agentId}
          minted={isMinted}
          hasSkill={attachedSkillIds.length > 0}
          discoverable={profile.discoverable}
          collabPriceUsdc={profile.collabPriceUsdc}
          settlementAsset={collabSettlement().name}
          tcnhvRewards={hasTcnhv() && canMintTcnhv()}
        />
      </div>
      <CollabSettingsPanel
        agentId={agentId}
        description={profile.description}
        collabMaxUnits={profile.collabMaxUnits}
        services={profile.services}
      />
      <div id="panel-dune" className="scroll-mt-32">
        <DunePublishPanel agentId={agentId} config={profile.config} />
      </div>
    </div>
  );
}
