import Link from "next/link";
import { ChevronRight, Store } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { TabBar } from "@/components/ui/TabBar";
import { TabHashRedirect } from "@/components/ui/TabHashRedirect";
import { agentConfigStatus } from "@/lib/agent/config";
import { formatAmount, hasTcnhv, TCNHV_DECIMALS } from "@/lib/agent/collab-config";
import { readTcnhvBalance, verifyAgentOnChain } from "@/lib/agent/onchain";
import { getAgentSkills, type PlatformSkill } from "@/lib/agent/skills";
import { MemoryInspector } from "@/components/agent/MemoryInspector";
import { AgentLabCreditsSection } from "@/components/agent/AgentLabCreditsSection";
import { AgentLabPanel } from "@/components/agent/AgentLabPanel";
import { LaunchAgentButton } from "@/components/agent/LaunchAgentButton";
import {
  AgentRoster,
  type AgentChainInfo,
  type AgentRosterGroup,
} from "@/components/agent/lab/AgentRoster";
import { ProvisioningCard } from "@/components/agent/lab/ProvisioningCard";
import { SkillCatalogCard } from "@/components/agent/lab/SkillCatalogCard";
import { WalletBalanceChip } from "@/components/agent/lab/WalletBalanceChip";
import { getSession } from "@/lib/auth/session";
import { isLabAdmin } from "@/lib/auth/labAdmin";
import { buildLabTabs, DEFAULT_LAB_TAB, resolveLabTab } from "@/lib/agent/labTabs";
import { getAgentProfile, getAttachedSkillIds, type AgentProfile } from "@/lib/agent/memory";
import { listOwnedAgentIds } from "@/lib/agent/ownership";
import { getApprovedNetworks } from "@/lib/data";
import { userAgentId } from "@/lib/agent/user-agent";

export const metadata = {
  title: "Agent Lab",
};

export const dynamic = "force-dynamic";

/** Legacy anchor ids → the tab that renders them (rescues old bookmarks). */
const HASH_TO_TAB: Record<string, string> = {
  create: "agents",
  "agents-roster": "agents",
  "agents-credits": "credits",
  "agents-skills": "skills",
  "agents-catalog": "skills",
};

/**
 * Owned-agent profiles + per-agent on-chain enrichment (tCNHV funding balance
 * and whether the token still resolves on the CURRENTLY configured
 * IdentityRegistry). Agents minted into an abandoned registry redeploy read
 * back as "legacy" (owner null) — flagged and kept out of payable buyer
 * dropdowns. Used by the agents tab (roster) and the credits tab (buyers).
 */
async function loadOwnedAgents(userId: string | null, defaultAgentId: string) {
  const ownedIds = userId ? await listOwnedAgentIds(userId) : [defaultAgentId];
  const userAgents = (
    await Promise.all(ownedIds.map((id) => getAgentProfile(id)))
  ).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const agentsById = new Map(userAgents.map((a) => [a.agentId, a]));
  const agents = [...agentsById.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const agentChain = new Map<string, AgentChainInfo>();
  await Promise.all(
    agents.map(async (a) => {
      if (!a.onChain || !a.agentAddress) {
        agentChain.set(a.agentId, { balance: null, verified: false });
        return;
      }
      const [balanceRaw, ver] = await Promise.all([
        hasTcnhv() ? readTcnhvBalance(a.agentAddress) : Promise.resolve(null),
        verifyAgentOnChain(a.agentId, a.agentAddress),
      ]);
      agentChain.set(a.agentId, {
        balance: balanceRaw != null ? formatAmount(BigInt(balanceRaw), TCNHV_DECIMALS) : null,
        // When the registry isn't configured we can't verify; trust the stored
        // flag rather than falsely flagging every agent as legacy.
        verified: ver.configured ? Boolean(ver.owner) : a.onChain,
      });
    }),
  );

  return { agents, agentChain };
}

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const status = agentConfigStatus();
  const session = getSession();
  const isAdmin = await isLabAdmin(session);
  const tabCtx = { isAdmin, hasSession: Boolean(session) };
  const activeTab = resolveLabTab(searchParams.tab, tabCtx);
  const tabs = buildLabTabs(tabCtx);
  const defaultAgentId = session ? userAgentId(session.userId) : "sandbox";

  return (
    <div className="container space-y-8 py-12">
      <TabHashRedirect
        hashToTab={HASH_TO_TAB}
        activeTab={activeTab}
        basePath="/agents"
        defaultTab={DEFAULT_LAB_TAB}
      />

      <nav className="flex items-center gap-1.5 text-sm text-ink-300">
        <Link href="/" className="transition-colors hover:text-ink-50">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <span className="text-ink-100">Agents</span>
      </nav>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
            Agent Lab
          </h1>
          <Badge tone="signal">Arbitrum Sepolia · Testnet</Badge>
          {session && <WalletBalanceChip />}
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-300">
          Your roster of CanHav research agents. Name an agent, tag it with a research category,
          pick the skills it should study, and mint its own on-chain{" "}
          <span className="font-medium text-ink-100">ERC-8004</span> identity through a
          self-custodial smart account. Chat with any of your agents from the floating assistant on
          every data page. All agent activity is testnet-only.
        </p>
      </header>

      <TabBar
        basePath="/agents"
        activeTab={activeTab}
        tabs={tabs}
        defaultTab={DEFAULT_LAB_TAB}
        trailing={
          <Link
            href="/collab"
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-neon-500/40 bg-neon-500/10 px-3 py-1.5 text-xs font-medium text-neon-400 transition-colors hover:bg-neon-500/20"
          >
            <Store className="h-3 w-3" /> Browse marketplace
          </Link>
        }
      />

      {activeTab === "agents" && <AgentsTab session={session} defaultAgentId={defaultAgentId} zerodevConfigured={status.zerodev} />}

      {activeTab === "credits" && session && (
        <CreditsTab userId={session.userId} defaultAgentId={defaultAgentId} />
      )}

      {activeTab === "skills" && <SkillsTab />}

      {activeTab === "sandbox" && (
        <>
          <AgentLabPanel agentId={defaultAgentId} llmConfigured={status.llm} />
          <MemoryInspector agentId={defaultAgentId} />
          <Card className="space-y-2">
            <CardTitle className="text-base">Inspect live data</CardTitle>
            <CardDescription>
              Open one of your agents to run entity-scoped research tools against live CanHav data
              — no LLM required.
            </CardDescription>
          </Card>
        </>
      )}

      {activeTab === "provisioning" && isAdmin && <ProvisioningCard />}
    </div>
  );
}

async function AgentsTab({
  session,
  defaultAgentId,
  zerodevConfigured,
}: {
  session: { userId: string } | null;
  defaultAgentId: string;
  zerodevConfigured: boolean;
}) {
  const [skills, { agents, agentChain }] = await Promise.all([
    getAgentSkills(),
    loadOwnedAgents(session?.userId ?? null, defaultAgentId),
  ]);

  // An agent is live in the marketplace when it's discoverable AND advertises at
  // least one attached skill (the same gate buildAgentEntry enforces). Surface a
  // "Listed" badge so owners can see at a glance which agents are public.
  const listedAgentIds = new Set(
    (
      await Promise.all(
        agents.map(async (a) =>
          a.discoverable && (await getAttachedSkillIds(a.agentId)).length > 0 ? a.agentId : null,
        ),
      )
    ).filter((id): id is string => Boolean(id)),
  );

  // Group agents by project (Entity). Unbound agents fall into "General research".
  const entities = await getApprovedNetworks();
  const entityNameBySlug = new Map(entities.map((e) => [e.slug, e.name]));
  const projectGroups = new Map<string, AgentRosterGroup>();
  for (const agent of agents) {
    const key = agent.entitySlug ?? "__general__";
    const label = agent.entitySlug
      ? (entityNameBySlug.get(agent.entitySlug) ?? agent.entitySlug)
      : "General research";
    if (!projectGroups.has(key)) {
      projectGroups.set(key, { key, label, slug: agent.entitySlug, agents: [] });
    }
    projectGroups.get(key)!.agents.push(agent as AgentProfile);
  }
  const groups = [...projectGroups.values()];

  return (
    <>
      <AgentRoster
        groups={groups}
        agentCount={agents.length}
        agentChain={agentChain}
        listedAgentIds={listedAgentIds}
      />

      <div id="create" className="scroll-mt-32 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight text-ink-50">
              Launch an agent
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-ink-300">
              Name it, tag it with a research category, and choose the skills it studies. Minting
              creates a wallet-owned ERC-8004 token on Arbitrum Sepolia, scannable on Arbiscan.
            </p>
          </div>
          <Badge tone="neutral">on-chain identity</Badge>
        </div>
        <LaunchAgentButton
          skills={skills.map((s: PlatformSkill) => ({ id: s.id, title: s.title }))}
          zerodevConfigured={zerodevConfigured}
        />
      </div>
    </>
  );
}

async function CreditsTab({
  userId,
  defaultAgentId,
}: {
  userId: string;
  defaultAgentId: string;
}) {
  const { agents, agentChain } = await loadOwnedAgents(userId, defaultAgentId);
  const buyerAgents = agents
    .filter(
      (a) =>
        a.onChain && a.accountIndex != null && (agentChain.get(a.agentId)?.verified ?? false),
    )
    .map((a) => ({ agentId: a.agentId, name: a.name }));

  return <AgentLabCreditsSection buyerAgents={buyerAgents} />;
}

async function SkillsTab() {
  const skills = await getAgentSkills();
  return <SkillCatalogCard skills={skills} />;
}
