import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { TokenTable } from "@/components/tokens/TokenTable";
import { StatCard } from "@/components/ui/StatCard";
import { getApprovedTokens, getTokenStagingCounts } from "@/lib/data";

export const metadata = {
  title: "Tokens",
};

export const revalidate = 300;

export default async function TokensPage() {
  const [profiles, counts] = await Promise.all([
    getApprovedTokens(),
    getTokenStagingCounts(),
  ]);

  const types = new Set(profiles.map((p) => p.tokenType));

  return (
    <div className="container space-y-8 py-12">
      <nav className="flex items-center gap-1.5 text-sm text-ink-300">
        <Link href="/" className="transition-colors hover:text-ink-50">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <span className="text-ink-100">Tokens</span>
      </nav>

      <header className="space-y-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
          Tokens
        </h1>
        <p className="max-w-2xl text-sm text-ink-300">
          Governance & utility tokens powering Arbitrum protocol ecosystems. Showing{" "}
          <span className="font-medium text-ink-100">{counts.approved} approved</span> of{" "}
          {counts.total} tracked; {counts.pending} awaiting review.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Approved" value={`${profiles.length}`} hint="Visible publicly" />
        <StatCard label="Token types" value={`${types.size}`} hint="Across approved" />
        <StatCard label="Tracked total" value={`${counts.total}`} hint={`${counts.pending} pending`} />
        <StatCard label="Pending" value={`${counts.pending}`} hint="Not yet public" />
      </section>

      <TokenTable profiles={profiles} emptyHint="No approved tokens yet." />
    </div>
  );
}
