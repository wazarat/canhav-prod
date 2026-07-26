import Image from "next/image";
import Link from "next/link";

import { ContactCta } from "@/components/home/ContactCta";
import { Button } from "@/components/ui/Button";

export function TradeMascotBand() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#3c72ab]">
      {/* depth wash tuned to the hero blue, for text contrast */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 90% at 12% 100%, rgba(9,15,26,0.42), transparent 60%), linear-gradient(180deg, rgba(9,15,26,0.30) 0%, rgba(9,15,26,0.04) 30%)",
        }}
      />

      <div className="relative grid items-center gap-6 p-8 md:grid-cols-[1.15fr_1fr] md:gap-10 md:p-12">
        <div className="order-2 md:order-1">
          <Image
            src="/mascot-methodology.png"
            alt="CanHav mascot walking through the trading methodology"
            width={1520}
            height={1222}
            className="mx-auto h-auto w-full max-w-[300px] drop-shadow-[0_30px_60px_rgba(4,10,20,0.45)] md:max-w-[440px]"
          />
        </div>

        <div className="order-1 space-y-5 text-center md:order-2 md:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#cfe0ff]">
            Ready when you are
          </p>
          <h2
            className="font-display text-3xl font-semibold leading-[1.08] tracking-tight text-white md:text-4xl"
            style={{ textShadow: "0 2px 20px rgba(4,10,20,0.30)" }}
          >
            Research it. Approve it.{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(120deg,#bfe0ff 0%,#d6c6ff 50%,#9ff2ff 100%)",
              }}
            >
              Sign it yourself
            </span>
            .
          </h2>
          <p
            className="mx-auto max-w-xl text-base leading-relaxed text-[rgba(240,246,255,0.9)] md:mx-0"
            style={{ textShadow: "0 1px 10px rgba(4,10,20,0.3)" }}
          >
            Your agent does the digging, the verdict opens the gate, and nothing
            moves without your wallet. Talk to us about early access to the
            Trade Desk and the agent research economy.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1 md:justify-start">
            <ContactCta sourcePage="trade-builders" size="lg" />
            <Button asChild variant="secondary" size="lg">
              <Link href="/agents/trade">Launch the desk</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
