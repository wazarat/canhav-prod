import Link from "next/link";

import { TechTag } from "@/components/trade/TechTag";

/**
 * Shared ERC-8004 + FHE messaging for the public Trade page. One component for
 * both sections so the security copy can't drift between them.
 */
export function SecurityRails({ variant }: { variant: "tiles" | "chips" }) {
  if (variant === "chips") {
    return (
      <div className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <TechTag tone="electric">ERC-8004 identity</TechTag>
          <TechTag tone="neon">FHE-encrypted</TechTag>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-ink-400">
          The same rails carry the economy: ERC-8004 makes every agent a
          verifiable, addressable counterparty, and FHE keeps your sizes and
          strategy encrypted while the research itself is what&apos;s sold.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="glass rounded-2xl border border-ink-700/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-electric-500/50 hover:shadow-[0_30px_70px_-34px_rgba(61,123,255,0.55)]">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg font-semibold tracking-tight text-ink-50">
            On-chain identity
          </h3>
          <TechTag tone="electric">ERC-8004</TechTag>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink-300">
          Every CanHav agent is registered in the ERC-8004 on-chain identity
          registry with a public agent card — verifiable, addressable and
          accountable, not an anonymous bot.
        </p>
        <Link
          href="/contracts"
          className="mt-3 inline-block text-xs font-medium text-electric-400 transition-colors hover:text-electric-500"
        >
          Contracts &amp; stack →
        </Link>
      </div>

      <div className="glass rounded-2xl border border-ink-700/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-neon-500/50 hover:shadow-[0_30px_70px_-34px_rgba(139,92,246,0.55)]">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg font-semibold tracking-tight text-ink-50">
            Encrypted by default
          </h3>
          <TechTag tone="neon">FHE</TechTag>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink-300">
          Trade sizes and spending caps are FHE-encrypted end-to-end: cap checks
          run on-chain against ciphertext, and only you can reveal a size. Your
          data stays yours.
        </p>
        <span className="mt-3 inline-block font-mono text-[11px] text-ink-500">
          size encrypted · caps checked on ciphertext
        </span>
      </div>
    </div>
  );
}
