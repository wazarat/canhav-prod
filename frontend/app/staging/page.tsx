import { Lock } from "lucide-react";

import { MockDataBanner } from "@/components/MockDataBanner";
import { RwaTable } from "@/components/rwas/RwaTable";
import { StablecoinTable } from "@/components/stablecoins/StablecoinTable";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import {
  getAllRwas,
  getAllStablecoins,
  getRwaStagingCounts,
  getStagingCounts,
  LIVE_METRICS_PENDING,
} from "@/lib/data";

export const metadata = {
  title: "Staging (restricted)",
  robots: { index: false, follow: false },
};

export default function StagingPage() {
  const stablecoins = getAllStablecoins();
  const rwas = getAllRwas();
  const scCounts = getStagingCounts();
  const rwaCounts = getRwaStagingCounts();

  const scPending = stablecoins.filter((p) => p.status === "PENDING_APPROVAL");
  const scApproved = stablecoins.filter((p) => p.status === "APPROVED");
  const rwaPending = rwas.filter((p) => p.status === "PENDING_APPROVAL");
  const rwaApproved = rwas.filter((p) => p.status === "APPROVED");

  const total = scCounts.total + rwaCounts.total;
  const approved = scCounts.approved + rwaCounts.approved;
  const pending = scCounts.pending + rwaCounts.pending;

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
          <span className="font-mono text-ink-100">APPROVED</span>. This view is read-only in this
          phase — the interactive flip and authentication arrive in Step 4.
        </p>
      </header>

      {LIVE_METRICS_PENDING && <MockDataBanner metrics="Supply, peg and TVL" />}

      <section className="grid grid-cols-3 gap-4">
        <StatCard label="Total tracked" value={`${total}`} hint="All categories" />
        <StatCard label="Approved" value={`${approved}`} hint="Public" />
        <StatCard label="Pending review" value={`${pending}`} hint="Not yet public" />
      </section>

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
    </div>
  );
}
