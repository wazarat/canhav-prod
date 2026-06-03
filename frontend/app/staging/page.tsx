import { Lock } from "lucide-react";

import { MockDataBanner } from "@/components/MockDataBanner";
import { EntityTable } from "@/components/entities/EntityTable";
import { RwaTable } from "@/components/rwas/RwaTable";
import { ApprovalConsole, type ApprovalItem } from "@/components/staging/ApprovalConsole";
import { StablecoinTable } from "@/components/stablecoins/StablecoinTable";
import { TokenTable } from "@/components/tokens/TokenTable";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { LIVE_METRICS_PENDING } from "@/lib/data";
import { readLiveStore } from "@/lib/server/store";

export const metadata = {
  title: "Staging (restricted)",
  robots: { index: false, follow: false },
};

// Read the backend store live (not the build-time export) so approvals made via
// /api/approve are reflected immediately, without a rebuild.
export const dynamic = "force-dynamic";

export default async function StagingPage() {
  const { stablecoins, rwas, tokens, entities } = await readLiveStore();

  const scPending = stablecoins.filter((p) => p.status === "PENDING_APPROVAL");
  const scApproved = stablecoins.filter((p) => p.status === "APPROVED");
  const rwaPending = rwas.filter((p) => p.status === "PENDING_APPROVAL");
  const rwaApproved = rwas.filter((p) => p.status === "APPROVED");
  const tokenPending = tokens.filter((p) => p.status === "PENDING_APPROVAL");
  const tokenApproved = tokens.filter((p) => p.status === "APPROVED");
  const entityPending = entities.filter((p) => p.status === "PENDING_APPROVAL");
  const entityApproved = entities.filter((p) => p.status === "APPROVED");

  const total = stablecoins.length + rwas.length + tokens.length + entities.length;
  const approved =
    scApproved.length + rwaApproved.length + tokenApproved.length + entityApproved.length;
  const pending = total - approved;

  const consoleItems: ApprovalItem[] = [
    ...entities.map((p) => ({
      category: "Entity" as const,
      slug: p.slug,
      name: p.name,
      status: p.status,
    })),
    ...stablecoins.map((p) => ({
      category: "Stablecoin" as const,
      slug: p.slug,
      name: p.name,
      status: p.status,
    })),
    ...rwas.map((p) => ({
      category: "RWA" as const,
      slug: p.slug,
      name: p.name,
      status: p.status,
    })),
    ...tokens.map((p) => ({
      category: "Token" as const,
      slug: p.slug,
      name: p.name,
      status: p.status,
    })),
  ].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="container space-y-10 py-12">
      <header className="space-y-3">
        <Badge tone="warning" className="uppercase tracking-wider">
          <Lock className="h-3 w-3" />
          Restricted · Internal
        </Badge>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
          Approval staging
        </h1>
        <p className="max-w-2xl text-sm text-ink-300">
          Every protocol enters as <span className="font-mono text-ink-100">PENDING_APPROVAL</span>{" "}
          and only renders publicly once explicitly marked{" "}
          <span className="font-mono text-ink-100">APPROVED</span>. Use the console below to flip
          status (token-gated). Public pages revalidate within minutes of an approval.
        </p>
      </header>

      {LIVE_METRICS_PENDING && <MockDataBanner metrics="Supply, peg and TVL" />}

      <section className="grid grid-cols-3 gap-4">
        <StatCard label="Total tracked" value={`${total}`} hint="All categories" />
        <StatCard label="Approved" value={`${approved}`} hint="Public" />
        <StatCard label="Pending review" value={`${pending}`} hint="Not yet public" />
      </section>

      {/* Interactive approval console (token-gated) */}
      <div className="space-y-3">
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink-50">
          Approve / revert
        </h2>
        <ApprovalConsole items={consoleItems} />
      </div>

      {/* Entities */}
      <div className="space-y-6">
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink-50">
          Entities
        </h2>
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-ink-100">
            Pending review
            <Badge tone="warning">{entityPending.length}</Badge>
          </h3>
          <EntityTable profiles={entityPending} showStatus emptyHint="Nothing pending — all clear." />
        </section>
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-ink-100">
            Approved
            <Badge tone="positive">{entityApproved.length}</Badge>
          </h3>
          <EntityTable profiles={entityApproved} showStatus emptyHint="Nothing approved yet." />
        </section>
      </div>

      {/* Stablecoins */}
      <div className="space-y-6">
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink-50">
          Stablecoins
        </h2>
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-ink-100">
            Pending review
            <Badge tone="warning">{scPending.length}</Badge>
          </h3>
          <StablecoinTable profiles={scPending} showStatus emptyHint="Nothing pending — all clear." />
        </section>
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-ink-100">
            Approved
            <Badge tone="positive">{scApproved.length}</Badge>
          </h3>
          <StablecoinTable profiles={scApproved} showStatus emptyHint="Nothing approved yet." />
        </section>
      </div>

      {/* RWAs */}
      <div className="space-y-6">
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink-50">
          Real World Assets
        </h2>
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-ink-100">
            Pending review
            <Badge tone="warning">{rwaPending.length}</Badge>
          </h3>
          <RwaTable profiles={rwaPending} showStatus emptyHint="Nothing pending — all clear." />
        </section>
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-ink-100">
            Approved
            <Badge tone="positive">{rwaApproved.length}</Badge>
          </h3>
          <RwaTable profiles={rwaApproved} showStatus emptyHint="Nothing approved yet." />
        </section>
      </div>

      {/* Tokens */}
      <div className="space-y-6">
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink-50">
          Tokens
        </h2>
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-ink-100">
            Pending review
            <Badge tone="warning">{tokenPending.length}</Badge>
          </h3>
          <TokenTable profiles={tokenPending} showStatus emptyHint="Nothing pending — all clear." />
        </section>
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-ink-100">
            Approved
            <Badge tone="positive">{tokenApproved.length}</Badge>
          </h3>
          <TokenTable profiles={tokenApproved} showStatus emptyHint="Nothing approved yet." />
        </section>
      </div>
    </div>
  );
}
