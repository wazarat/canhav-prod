import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  ChevronRight,
  ExternalLink,
  FileJson,
  Globe,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { buildAgentCard } from "@/lib/agent/agentCard";
import { agentCategoryLabel } from "@/lib/agent/categories";
import { getAgentSnapshot } from "@/lib/agent/memory";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { agentId: string } }) {
  const snapshot = await getAgentSnapshot(decodeURIComponent(params.agentId));
  return { title: snapshot.profile ? `${snapshot.profile.name} · Identity card` : "Agent card" };
}

function shortAddr(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export default async function AgentCardPage({
  params,
}: {
  params: { agentId: string };
}) {
  const agentId = decodeURIComponent(params.agentId);
  const snapshot = await getAgentSnapshot(agentId);
  const { profile } = snapshot;
  if (!profile?.agentAddress) notFound();

  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const card = await buildAgentCard(profile, `${proto}://${host}`);
  const jsonUrl = `/api/agent/by-address/${profile.agentAddress}/agent-card`;

  return (
    <div className="container max-w-3xl space-y-8 py-12">
      <nav className="flex items-center gap-1.5 text-sm text-ink-300">
        <Link href="/" className="transition-colors hover:text-ink-50">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <Link href="/agents" className="transition-colors hover:text-ink-50">
          Agents
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <Link href={`/agents/${agentId}`} className="transition-colors hover:text-ink-50">
          {profile.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <span className="text-ink-100">Identity card</span>
      </nav>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
            {card.name}
          </h1>
          <Badge tone="signal">ERC-8004</Badge>
          {agentCategoryLabel(profile.category) && (
            <Badge tone="neutral">{agentCategoryLabel(profile.category)}</Badge>
          )}
          {card.x402Support && <Badge tone="neon">x402 collab</Badge>}
        </div>
        <p className="text-sm leading-relaxed text-ink-300">{card.description}</p>
        <p className="text-xs text-ink-500">
          This is your agent&apos;s portable identity for explorers and other agents. Machines can
          fetch the JSON version for indexing.
        </p>
      </header>

      <section className="glass space-y-4 rounded-2xl p-6">
        <h2 className="font-display text-base font-semibold text-ink-50">Registration</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4 rounded-xl border border-ink-800/60 bg-ink-900/30 px-4 py-2.5">
            <dt className="text-ink-400">Agent ID</dt>
            <dd className="font-mono text-ink-100">#{profile.agentId}</dd>
          </div>
          <div className="flex justify-between gap-4 rounded-xl border border-ink-800/60 bg-ink-900/30 px-4 py-2.5">
            <dt className="flex items-center gap-2 text-ink-400">
              <Wallet className="h-3.5 w-3.5" /> Smart account
            </dt>
            <dd className="font-mono text-ink-100">{shortAddr(profile.agentAddress)}</dd>
          </div>
          {card.registrations[0] && (
            <div className="flex justify-between gap-4 rounded-xl border border-ink-800/60 bg-ink-900/30 px-4 py-2.5">
              <dt className="text-ink-400">Registry (CAIP-10)</dt>
              <dd className="max-w-[60%] truncate font-mono text-xs text-ink-100">
                {card.registrations[0].agentRegistry}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="glass space-y-4 rounded-2xl p-6">
        <h2 className="font-display text-base font-semibold text-ink-50">Services</h2>
        <ul className="space-y-3">
          {card.services.map((svc) => (
            <li
              key={`${svc.name}-${svc.endpoint}`}
              className="rounded-xl border border-ink-800/60 bg-ink-900/30 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink-100">{svc.name}</span>
                {svc.name === "web" && <Globe className="h-3.5 w-3.5 text-ink-500" />}
                {svc.name === "verify" && <ShieldCheck className="h-3.5 w-3.5 text-ink-500" />}
              </div>
              <p className="mt-1 break-all font-mono text-xs text-ink-400">{svc.endpoint}</p>
              {svc.skills && svc.skills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {svc.skills.map((s) => (
                    <Badge key={s} tone="neutral">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {(card.entity || card.associatedProducts.length > 0) && (
        <section className="glass space-y-4 rounded-2xl p-6">
          <h2 className="font-display text-base font-semibold text-ink-50">Scope</h2>
          {card.entity && (
            <p className="text-sm text-ink-300">
              Entity:{" "}
              <Link href={`/entities/${card.entity}`} className="text-electric-400 hover:text-electric-300">
                {card.entity}
              </Link>
            </p>
          )}
          {card.associatedProducts.length > 0 && (
            <ul className="space-y-2 text-sm text-ink-300">
              {card.associatedProducts.map((p) => (
                <li key={p.slug}>
                  {p.symbol} ({p.category}) · {p.slug}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="glass space-y-4 rounded-2xl p-6">
        <h2 className="font-display text-base font-semibold text-ink-50">Trust</h2>
        <div className="flex flex-wrap gap-2">
          {card.supportedTrust.map((t) => (
            <Badge key={t} tone="positive">
              {t}
            </Badge>
          ))}
          {card.walletVerified && (
            <Badge tone="positive">Wallet verified on-chain</Badge>
          )}
        </div>
      </section>

      <footer className="flex flex-wrap items-center gap-4 border-t border-ink-800/60 pt-6">
        <a
          href={jsonUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-electric-400 hover:text-electric-300"
        >
          <FileJson className="h-4 w-4" /> Machine-readable JSON
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <span className="text-xs text-ink-500 font-mono">{jsonUrl}</span>
      </footer>
    </div>
  );
}
