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
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { agentConfigStatus } from "@/lib/agent/config";
import { getAgentSkills } from "@/lib/agent/skills";
import { listAgents } from "@/lib/agent/memory";
import { MemoryInspector } from "@/components/agent/MemoryInspector";
import { ToolPlayground } from "@/components/agent/ToolPlayground";
import { AgentChat } from "@/components/agent/AgentChat";
import { PasskeySpawnButton } from "@/components/agent/PasskeySpawnButton";

export const metadata = {
  title: "Agent Lab",
};

export const dynamic = "force-dynamic";

interface CapabilityRow {
  key: "openai" | "upstash" | "zerodev";
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
  const [skills, agents] = await Promise.all([getAgentSkills(), listAgents()]);

  const rows: CapabilityRow[] = [
    {
      key: "openai",
      icon: BrainCircuit,
      label: "Reasoning (OpenAI)",
      ready: status.openai,
      readyHint: `LLM research loop active · model ${status.model}.`,
      pendingHint: "Set OPENAI_API_KEY to enable the research agent's chat + tool loop.",
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
      readyHint: "Agents can mint a passkey-owned ERC-8004 identity (gas sponsored).",
      pendingHint:
        "Deploy the registries + create a ZeroDev project, then set ZERODEV_RPC, IDENTITY_REGISTRY_ADDRESS, SECURITY_REGISTRY_ADDRESS.",
    },
  ];

  const readyCount = rows.filter((r) => r.ready).length;

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
          Turn CanHav research into an AI agent: it studies protocol skills, answers only from
          CanHav&apos;s own data, remembers what it learns, and can register an on-chain{" "}
          <span className="font-medium text-ink-100">ERC-8004</span> identity through a passkey
          smart account. All agent activity is testnet-only.
        </p>
      </header>

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

      {agents.length > 0 && (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-800/60 pb-3">
            <div>
              <CardTitle className="text-base">Your agents</CardTitle>
              <CardDescription className="mt-1">
                Open an agent&apos;s home to chat, watch it work, and grow its memory.
              </CardDescription>
            </div>
            <Badge tone="neutral">{agents.length}</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {agents.map((agent) => (
              <Link
                key={agent.agentId}
                href={`/agents/${encodeURIComponent(agent.agentId)}`}
                className="group flex items-start gap-3 rounded-xl border border-ink-800/60 bg-ink-900/30 px-4 py-3 transition-colors hover:border-electric-500/40 hover:bg-ink-900/60"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-700/80 bg-ink-900/60 text-electric-400">
                  <Bot className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-100">{agent.name}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-ink-500">
                    agent {agent.agentId}
                    {agent.onChain ? " · on-chain" : " · local"}
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ink-500 transition-colors group-hover:text-electric-400" />
              </Link>
            ))}
          </div>
        </Card>
      )}

      <PasskeySpawnButton
        skills={skills.map((s) => ({ id: s.id, title: s.title }))}
        zerodevConfigured={status.zerodev}
      />

      <AgentChat agentId="sandbox" llmConfigured={status.openai} />

      <MemoryInspector />

      <ToolPlayground />

      <Card className="space-y-4">
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
          <div className="grid gap-2 sm:grid-cols-2">
            {skills.map((skill) => (
              <Link
                key={skill.id}
                href={`/agents/skills/${skill.id}`}
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
        )}
      </Card>
    </div>
  );
}
