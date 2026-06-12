import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { ResearchChatScope } from "@/components/agent/research-chat-context";
import { TokenTable } from "@/components/tokens/TokenTable";
import { StatCard } from "@/components/ui/StatCard";
import { getApprovedEntities, getApprovedTokens } from "@/lib/data";

export const metadata = {
  title: "Tokens",
};

export const revalidate = 300;

export default async function TokensPage() {
  const [profiles, entities] = await Promise.all([getApprovedTokens(), getApprovedEntities()]);

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
          Governance & utility tokens powering Arbitrum protocol ecosystems.{" "}
          <span className="font-medium text-ink-100">{profiles.length}</span> tokens tracked.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tracked" value={`${profiles.length}`} hint="Tokens in store" />
        <StatCard label="Token types" value={`${types.size}`} hint="Distinct types" />
        <StatCard label="Governance" value={`${profiles.filter((p) => p.tokenType === "Governance").length}`} hint="Governance tokens" />
        <StatCard label="Utility" value={`${profiles.filter((p) => p.tokenType === "Utility").length}`} hint="Utility tokens" />
      </section>

      <TokenTable profiles={profiles} entities={entities} emptyHint="No tokens in the store yet." />

      <ResearchChatScope />
    </div>
  );
}
