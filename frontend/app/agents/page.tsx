import Link from "next/link";
import {
  ChevronRight,
  BrainCircuit,
  Database,
  Fingerprint,
  CheckCircle2,
  CircleDashed,
  ScrollText,
  ArrowRight,
  Bot,
  Store,
  Coins,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { SectionNav, type SectionNavItem } from "@/components/ui/SectionNav";
import { agentCategoryLabel } from "@/lib/agent/categories";
import { agentConfigStatus } from "@/lib/agent/config";
import { getAgentSkills, SKILL_GROUPS, type PlatformSkill } from "@/lib/agent/skills";
import { MemoryInspector } from "@/components/agent/MemoryInspector";
import { AgentLabCreditsSection } from "@/components/agent/AgentLabCreditsSection";
import { AgentLabPanel } from "@/components/agent/AgentLabPanel";
import { LaunchAgentButton } from "@/components/agent/LaunchAgentButton";
import { getSession } from "@/lib/auth/session";
import { getAgentProfile, getAttachedSkillIds, type AgentProfile } from "@/lib/agent/memory";
import { listOwnedAgentIds } from "@/lib/agent/ownership";
import { getApprovedEntities } from "@/lib/data";
import { userAgentId } from "@/lib/agent/user-agent";

export const metadata = {
  title: "Agent Lab",
};

export const dynamic = "force-dynamic";

interface CapabilityRow {
  key: "openai" | "upstash" | "zerodev" | "tcnhv";
  icon: typeof BrainCircuit;
  label: string;
  ready: boolean;
  readyHint: string;
  pendingHint: string;
}

function CapabilityItem({ row }: { row: CapabilityRow }) {
  const Icon = row.icon;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-ink-800/60 bg-ink-900/30 px-4 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-700/80 bg-ink-900/60 text-ink-300">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-ink-100">{row.label}</p>
          {row.ready ? (
            <Badge tone="positive">
              <CheckCircle2 className="h-3 w-3" /> configured
            </Badge>
          ) : (
            <Badge tone="neutral">
              <CircleDashed className="h-3 w-3" /> not configured
            </Badge>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-ink-400">
          {row.ready ? row.readyHint : row.pendingHint}
        </p>
      </div>
    </div>
  );
}

export default async function AgentsPage() {
  const status = agentConfigStatus();
  const session = getSession();
  const defaultAgentId = session ? userAgentId(session.userId) : "sandbox";

  const [skills, ownedIds] = await Promise.all([
    getAgentSkills(),
    session ? listOwnedAgentIds(session.userId) : Promise.resolve([defaultAgentId]),
  ]);

  const userAgents = (
    await Promise.all(ownedIds.map((id) => getAgentProfile(id)))
  ).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const agentsById = new Map(userAgents.map((a) => [a.agentId, a]));
  const agents = [...agentsById.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

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
  const entities = await getApprovedEntities();
  const entityNameBySlug = new Map(entities.map((e) => [e.slug, e.name]));
  const projectGroups = new Map<
    string,
    { key: string; label: string; slug: string | null; agents: AgentProfile[] }
  >();
  for (const agent of agents) {
    const key = agent.entitySlug ?? "__general__";
    const label = agent.entitySlug
      ? (entityNameBySlug.get(agent.entitySlug) ?? agent.entitySlug)
      : "General research";
    if (!projectGroups.has(key)) {
      projectGroups.set(key, { key, label, slug: agent.entitySlug, agents: [] });
    }
    projectGroups.get(key)!.agents.push(agent);
  }
  const groups = [...projectGroups.values()];

  const rows: CapabilityRow[] = [
    {
      key: "openai",
      icon: BrainCircuit,
      label: "Reasoning (LLM)",
      ready: status.llm,
      readyHint: `LLM research loop active · model ${status.model} · via ${status.provider}.`,
      pendingHint:
        "Set OPENAI_API_KEY (or AI_GATEWAY_API_KEY for failover) to enable the research agent's chat + tool loop.",
    },
    {
      key: "upstash",
      icon: Database,
      label: "Memory (Upstash Redis)",
      ready: status.upstash,
      readyHint: "Agents persist learned facts and runs across sessions.",
      pendingHint:
        "No Upstash credentials — memory falls back to a local JSON file for offline dev.",
    },
    {
      key: "zerodev",
      icon: Fingerprint,
      label: "On-chain identity (ZeroDev + ERC-8004)",
      ready: status.zerodev,
      readyHint: "Agents can mint a wallet-owned ERC-8004 identity (gas sponsored).",
      pendingHint:
        "Deploy the registries + create a ZeroDev project, then set ZERODEV_RPC, IDENTITY_REGISTRY_ADDRESS, SECURITY_REGISTRY_ADDRESS, NEXT_PUBLIC_PRIVY_APP_ID, and PRIVY_APP_SECRET.",
    },
    {
      key: "tcnhv",
      icon: Coins,
      label: "tCNHV credits (mint + faucet)",
      ready: status.canMintTcnhv,
      readyHint: "Starting credits can be minted to treasuries and rewards paid out.",
      pendingHint: status.tcnhv
        ? status.factoryDeployerKeySet && !status.factoryDeployerKeyValid
          ? "FACTORY_DEPLOYER_PRIVATE_KEY is set but invalid — use the deployer wallet private key (0x + 64 hex chars, no quotes), then redeploy."
          : "Token is set but the owner key is missing — set FACTORY_DEPLOYER_PRIVATE_KEY on Vercel, then redeploy."
        : "Set TCNHV_TOKEN_ADDRESS and FACTORY_DEPLOYER_PRIVATE_KEY on Vercel to enable minting starting credits.",
    },
  ];

  const readyCount = rows.filter((r) => r.ready).length;

  const buyerAgents = agents
    .filter((a) => a.onChain && a.accountIndex != null)
    .map((a) => ({ agentId: a.agentId, name: a.name }));

  const listingNav: SectionNavItem[] = [
    ...(session ? [{ id: "agents-credits", label: "Credits" }] : []),
    ...(agents.length > 0 ? [{ id: "agents-roster", label: "Your agents" }] : []),
    { id: "create", label: "Launch" },
    { id: "agents-skills", label: "Your skills" },
    { id: "agents-catalog", label: "Skill catalog" },
  ];

  return (
    <div className="container space-y-8 py-12">
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
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-300">
          Your roster of CanHav research agents. Name an agent, tag it with a research category,
          pick the skills it should study, and mint its own on-chain{" "}
          <span className="font-medium text-ink-100">ERC-8004</span> identity through a
          self-custodial smart account — all from{" "}
          <Link href="#create" className="font-medium text-electric-400 hover:text-electric-300">
            this page
          </Link>
          . Chat with any of your agents from the floating assistant on every data page. All agent
          activity is testnet-only.
        </p>
      </header>

      <SectionNav
        variant="bar"
        items={listingNav}
        trailing={
          <Link
            href="/collab"
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-neon-500/40 bg-neon-500/10 px-3 py-1.5 text-xs font-medium text-neon-400 transition-colors hover:bg-neon-500/20"
          >
            <Store className="h-3 w-3" /> Browse marketplace
          </Link>
        }
      />

      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-800/60 pb-3">
          <div>
            <CardTitle className="text-base">Provisioning</CardTitle>
            <CardDescription className="mt-1">
              What&apos;s live in this environment. Each capability degrades gracefully until set.
            </CardDescription>
          </div>
          <Badge tone={readyCount === rows.length ? "positive" : "neutral"}>
            {readyCount}/{rows.length} ready
          </Badge>
        </div>
        <div className="space-y-2">
          {rows.map((row) => (
            <CapabilityItem key={row.key} row={row} />
          ))}
        </div>
        <p className="text-xs text-ink-500">
          Live status:{" "}
          <Link
            href="/api/agent/status"
            className="font-mono text-electric-400 hover:text-electric-300"
          >
            GET /api/agent/status
          </Link>
        </p>
      </Card>

      {session && <AgentLabCreditsSection buyerAgents={buyerAgents} />}

      {agents.length > 0 && (
        <Card id="agents-roster" className="scroll-mt-32 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-800/60 pb-3">
            <div>
              <CardTitle className="text-base">Your agents</CardTitle>
              <CardDescription className="mt-1">
                Open an agent to train it, manage its ERC-8004 identity, and enable collaboration.
              </CardDescription>
            </div>
            <Badge tone="neutral">{agents.length}</Badge>
          </div>
          <div className="space-y-5">
            {groups.map((group) => (
              <div key={group.key} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                    {group.label}
                  </h3>
                  {group.slug && (
                    <Link
                      href={`/entities/${group.slug}`}
                      className="text-[10px] font-medium text-electric-400 transition-colors hover:text-electric-300"
                    >
                      View project
                    </Link>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.agents.map((agent) => (
                    <Link
                      key={agent.agentId}
                      href={`/agents/${encodeURIComponent(agent.agentId)}`}
                      className="group flex items-start gap-3 rounded-xl border border-ink-800/60 bg-ink-900/30 px-4 py-3 transition-colors hover:border-electric-500/40 hover:bg-ink-900/60"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-700/80 bg-ink-900/60 text-electric-400">
                        <Bot className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-ink-100">{agent.name}</p>
                          {agentCategoryLabel(agent.category) && (
                            <Badge tone="signal" className="shrink-0">
                              {agentCategoryLabel(agent.category)}
                            </Badge>
                          )}
                          {listedAgentIds.has(agent.agentId) && (
                            <Badge tone="positive" className="shrink-0">
                              Listed
                            </Badge>
                          )}
                        </span>
                        {agent.associatedProducts.length > 0 && (
                          <p className="mt-0.5 truncate text-[11px] text-ink-400">
                            {agent.associatedProducts.map((p) => p.symbol).join(" · ")}
                          </p>
                        )}
                        <p className="mt-0.5 font-mono text-[10px] text-ink-500">
                          agent {agent.agentId}
                          {agent.onChain ? " · on-chain" : " · local"}
                        </p>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ink-500 transition-colors group-hover:text-electric-400" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

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
          zerodevConfigured={status.zerodev}
        />
      </div>

      <Card id="agents-skills" className="scroll-mt-32 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-800/60 pb-3">
          <div>
            <CardTitle className="text-base">Your custom skills</CardTitle>
            <CardDescription className="mt-1">
              Author or import your own research knowledge and attach it to an agent to train it.
              Enable collaboration on the agent to sell its bundled expertise.
            </CardDescription>
          </div>
          <Badge tone="neutral">user-authored</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/agents/skills/new"
            className="group inline-flex items-center gap-1.5 rounded-lg border border-neon-500/40 bg-neon-500/10 px-3 py-2 text-sm font-medium text-neon-400 transition-colors hover:bg-neon-500/20"
          >
            Create / import a skill
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/agents/skills"
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm font-medium text-ink-200 transition-colors hover:border-electric-500/40"
          >
            My skills
          </Link>
          <Link
            href="/collab"
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm font-medium text-ink-200 transition-colors hover:border-electric-500/40"
          >
            Discover agents
          </Link>
        </div>
      </Card>

      <AgentLabPanel agentId={defaultAgentId} llmConfigured={status.llm} />

      <MemoryInspector agentId={defaultAgentId} />

      <Card className="space-y-2">
        <CardTitle className="text-base">Inspect live data</CardTitle>
        <CardDescription>
          Open one of your agents to run entity-scoped research tools against live CanHav data — no
          LLM required.
        </CardDescription>
      </Card>

      <Card id="agents-catalog" className="scroll-mt-32 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-800/60 pb-3">
          <div>
            <CardTitle className="text-base">Skills</CardTitle>
            <CardDescription className="mt-1">
              Machine-readable protocol knowledge an agent can study and register from.
            </CardDescription>
          </div>
          <Badge tone="neutral">{skills.length} available</Badge>
        </div>
        {skills.length === 0 ? (
          <p className="text-sm text-ink-400">No skills yet — seed entities into the store.</p>
        ) : (
          <div className="space-y-5">
            {SKILL_GROUPS.map((group) => {
              const groupSkills = skills.filter((s: PlatformSkill) => s.group === group.id);
              if (groupSkills.length === 0) return null;
              return (
                <div key={group.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                      {group.label}
                    </h3>
                    <span className="font-mono text-[10px] text-ink-500">
                      {groupSkills.length}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {groupSkills.map((skill) => (
                      <Link
                        key={skill.id}
                        href={`/agents/skills/${encodeURIComponent(skill.id)}`}
                        className="group flex items-start gap-3 rounded-xl border border-ink-800/60 bg-ink-900/30 px-4 py-3 transition-colors hover:border-electric-500/40 hover:bg-ink-900/60"
                      >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-700/80 bg-ink-900/60 text-ink-300">
                          <ScrollText className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink-100">{skill.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-ink-400">{skill.summary}</p>
                          <p className="mt-1 font-mono text-[10px] text-ink-500">
                            {skill.facts.length} facts · {skill.actions.length} actions
                          </p>
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ink-500 transition-colors group-hover:text-electric-400" />
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
