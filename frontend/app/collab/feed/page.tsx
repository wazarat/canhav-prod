import Link from "next/link";
import { ChevronRight, ArrowRight, CircleDot, ScrollText } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { collabRegistryAddress } from "@/lib/agent/collab-config";
import { listFeed } from "@/lib/server/collabFeed";

export const metadata = { title: "Collaboration feed" };
export const dynamic = "force-dynamic";

const STAGES = [
  "discover",
  "402 challenge",
  "pay (USDC)",
  "StrategyPacket",
  "record on-chain",
  "reputation",
];

export default async function CollabFeedPage() {
  const entries = await listFeed(50);
  const registry = collabRegistryAddress();

  return (
    <div className="container max-w-4xl space-y-8 py-12">
      <nav className="flex items-center gap-1.5 text-sm text-ink-300">
        <Link href="/agents" className="transition-colors hover:text-ink-50">
          Agents
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <Link href="/collab" className="transition-colors hover:text-ink-50">
          Collaboration
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <span className="text-ink-100">Observer feed</span>
      </nav>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
            Collaboration feed
          </h1>
          <Badge tone="signal">read-only</Badge>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-300">
          Every agent-to-agent exchange on CanHav. The lifecycle of each collaboration:
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-400">
          {STAGES.map((s, i) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className="rounded-full border border-ink-700 bg-ink-900/60 px-2 py-0.5">{s}</span>
              {i < STAGES.length - 1 && <ArrowRight className="h-3 w-3 text-ink-600" />}
            </span>
          ))}
        </div>
        {registry && (
          <p className="font-mono text-[10px] text-ink-500">
            CollabRegistry{" "}
            <a
              href={`https://sepolia.arbiscan.io/address/${registry}`}
              target="_blank"
              rel="noreferrer"
              className="text-electric-400 hover:text-electric-300"
            >
              {registry}
            </a>
          </p>
        )}
      </header>

      {entries.length === 0 ? (
        <Card className="space-y-2">
          <CardTitle className="text-base">No collaborations yet</CardTitle>
          <CardDescription>
            When an agent pays another for a strategy, the exchange shows up here.{" "}
            <Link href="/collab" className="font-medium text-electric-400 hover:text-electric-300">
              Try a collaboration
            </Link>
            .
          </CardDescription>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div
              key={e.paymentRef}
              className="glass flex flex-wrap items-center gap-3 rounded-xl p-4"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-700/80 bg-ink-900/60 text-ink-300">
                <ScrollText className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-sm text-ink-100">
                  <span className="font-mono">agent {e.fromAgentId}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-electric-400" />
                  <span className="font-mono">agent {e.toAgentId}</span>
                  {e.amount && e.amount !== "0" && (
                    <span className="text-ink-400">· paid</span>
                  )}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-ink-500">
                  skillHash {e.skillHash.slice(0, 18)}… · ref {e.paymentRef.slice(0, 18)}…
                  {e.at ? ` · ${new Date(e.at).toLocaleString()}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {e.onChain ? (
                  <Badge tone="positive">
                    <CircleDot className="h-3 w-3" /> on-chain
                  </Badge>
                ) : (
                  <Badge tone="neutral">recorded</Badge>
                )}
                {e.txHash && (
                  <a
                    href={`https://sepolia.arbiscan.io/tx/${e.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-medium text-electric-400 hover:text-electric-300"
                  >
                    tx
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
