import { Lock } from "lucide-react";

import { MockDataBanner } from "@/components/MockDataBanner";
import { StablecoinTable } from "@/components/stablecoins/StablecoinTable";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { getAllStablecoins, getStagingCounts, IS_MOCK_DATA } from "@/lib/data";

export const metadata = {
  title: "Staging (restricted)",
  robots: { index: false, follow: false },
};

export default function StagingPage() {
  const all = getAllStablecoins();
  const counts = getStagingCounts();
  const pending = all.filter((p) => p.status === "PENDING_APPROVAL");
  const approved = all.filter((p) => p.status === "APPROVED");

  return (
    <div className="container space-y-8 py-12">
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

      {IS_MOCK_DATA && <MockDataBanner />}

      <section className="grid grid-cols-3 gap-4">
        <StatCard label="Total tracked" value={`${counts.total}`} />
        <StatCard label="Approved" value={`${counts.approved}`} hint="Public" />
        <StatCard label="Pending review" value={`${counts.pending}`} hint="Not yet public" />
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-ink-50">
          Pending review
          <Badge tone="warning">{pending.length}</Badge>
        </h2>
        <StablecoinTable profiles={pending} showStatus emptyHint="Nothing pending — all clear." />
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-ink-50">
          Approved
          <Badge tone="positive">{approved.length}</Badge>
        </h2>
        <StablecoinTable profiles={approved} showStatus emptyHint="Nothing approved yet." />
      </section>
    </div>
  );
}
