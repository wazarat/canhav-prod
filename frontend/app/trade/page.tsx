import type { Metadata } from "next";
import Image from "next/image";

import { TRADE_MODES } from "@/components/agent/trade/tradeModes";
import { ContactCta } from "@/components/home/ContactCta";
import { AgentEconomyGraphic } from "@/components/trade/AgentEconomyGraphic";
import { HitlFlowGraphic } from "@/components/trade/HitlFlowGraphic";
import { SecurityRails } from "@/components/trade/SecurityRails";
import { TechTag } from "@/components/trade/TechTag";
import { TradeMascotBand } from "@/components/trade/TradeMascotBand";

export const metadata: Metadata = {
  title: "Trade",
  description:
    "Human-in-the-loop DeFi trading: CanHav research gates every trade, you approve and sign, GMX fills on Arbitrum. ERC-8004 agents, FHE-encrypted sizes.",
};

const GUARDRAIL_CHIPS = [
  "fresh verdict required",
  "SecurityRegistry allowlist",
  "max size cap",
  "max leverage cap",
  "your signature required",
];

export default function TradePage() {
  return (
    <div className="container space-y-16 py-14 md:py-20">
      {/* Hero */}
      <section className="grid items-start gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="max-w-3xl space-y-4">
            <p className="kicker">Human-in-the-loop trading</p>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink-50 md:text-6xl">
              Research-gated trading,{" "}
              <span className="text-gradient-brand">with you in the loop</span>.
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-ink-300">
              Put your DeFi research to work. Your agent digs into an asset, a
              fresh verdict opens the trade gate, and the trade executes through
              a DEX, but nothing moves without your approval and your wallet
              signature.
            </p>
            <p className="font-mono text-[11px] text-ink-400">
              research <span className="text-ink-600">→</span> verdict{" "}
              <span className="text-ink-600">→</span> proposal{" "}
              <span className="text-ink-600">→</span> your approval{" "}
              <span className="text-ink-600">→</span> your signature{" "}
              <span className="text-ink-600">→</span> transactions completed
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ContactCta label="Learn more" sourcePage="trade-hero" />
          </div>
        </div>
        <div className="hidden lg:block">
          <Image
            src="/mascot-methodology.png"
            alt="CanHav mascot celebrating at a laptop"
            width={1520}
            height={1222}
            priority
            className="ml-auto h-auto w-full max-w-[380px] drop-shadow-[0_30px_60px_rgba(4,10,20,0.55)]"
          />
        </div>
      </section>

      {/* Section A — human-in-the-loop trading, live today */}
      <section className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <p className="kicker">Live today</p>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
              Trade with a <span className="text-gradient-brand">human in the loop</span>.
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-ink-300 md:text-base">
              Every desk is research-gated: the agent can only propose a trade
              on an asset it has a fresh, positive verdict for. Proposals wait
              for you — approve and sign, or reject. Fills route through GMX on
              Arbitrum.
            </p>
          </div>
          <span className="whitespace-nowrap font-mono text-xs text-ink-400">
            hitl · shipping in beta
          </span>
        </div>

        <HitlFlowGraphic />

        <p className="text-center font-mono text-xs text-ink-400">
          No research, no trade. No unattended signer — your wallet signature
          executes the trade.
        </p>

        {/* HITL modes — copy mirrors tradeModes.ts verbatim */}
        <div className="grid gap-4 md:grid-cols-3">
          {TRADE_MODES.map((mode) => (
            <div
              key={mode.value}
              className="glass rounded-2xl border border-ink-700/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-electric-500/50 hover:shadow-[0_30px_70px_-34px_rgba(61,123,255,0.55)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg font-semibold tracking-tight text-ink-50">
                  {mode.name}
                </h3>
                {mode.value === "spending_cap" && (
                  <TechTag tone="neon">caps auto-approve</TechTag>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">
                {mode.description}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {GUARDRAIL_CHIPS.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-ink-700/60 bg-ink-900/40 px-2.5 py-0.5 font-mono text-[11px] text-ink-400"
            >
              {chip}
            </span>
          ))}
        </div>

        <SecurityRails variant="tiles" />
      </section>

      {/* Section B — agent-to-agent research economy (roadmap) */}
      <section className="space-y-8">
        <div className="max-w-2xl space-y-3">
          <p className="kicker">Roadmap</p>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
              An <span className="text-gradient-brand">agent-to-agent</span> research economy.
            </h2>
            <TechTag tone="warning">Planned</TechTag>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-ink-300 md:text-base">
            Research shouldn&apos;t stop at your own agent. We&apos;re building
            a marketplace where agents buy and sell research from each other —
            and where the work your agent already does becomes an asset.
          </p>
        </div>

        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="glass rounded-2xl border border-ink-700/60 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg font-semibold tracking-tight text-ink-50">
                  Consume
                </h3>
                <TechTag tone="warning">planned</TechTag>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">
                Your agent buys fresh verdicts, theses and data feeds from other
                agents to open its own trade gates — research it didn&apos;t
                have to produce itself.
              </p>
            </div>
            <div className="glass rounded-2xl border border-ink-700/60 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg font-semibold tracking-tight text-ink-50">
                  Publish &amp; monetize
                </h3>
                <TechTag tone="warning">planned</TechTag>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">
                Sell the research your agent has already done — verdicts,
                theses and feeds priced in tCNHV, earning while you sleep.
              </p>
            </div>
            <div className="glass rounded-2xl border border-ink-700/60 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg font-semibold tracking-tight text-ink-50">
                  Settle agent-to-agent
                </h3>
                <TechTag tone="warning">planned</TechTag>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">
                Discovery, reputation and payment run between ERC-8004
                identities, so every counterparty is a verifiable on-chain
                agent.
              </p>
            </div>

            <SecurityRails variant="chips" />
          </div>

          <AgentEconomyGraphic />
        </div>
      </section>

      {/* Closing band */}
      <TradeMascotBand />
    </div>
  );
}
