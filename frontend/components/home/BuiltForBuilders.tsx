import Image from "next/image";

import { ContactCta } from "@/components/home/ContactCta";

export function BuiltForBuilders() {
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
            src="/mascot-thumbsup.png"
            alt="CanHav mascot giving a thumbs up"
            width={1520}
            height={1135}
            className="mx-auto h-auto w-full max-w-[300px] drop-shadow-[0_30px_60px_rgba(4,10,20,0.45)] md:max-w-[440px]"
          />
        </div>

        <div className="order-1 space-y-5 text-center md:order-2 md:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#cfe0ff]">
            Built for builders
          </p>
          <h2
            className="font-display text-3xl font-semibold leading-[1.08] tracking-tight text-white md:text-4xl"
            style={{ textShadow: "0 2px 20px rgba(4,10,20,0.30)" }}
          >
            In-depth EVM research for practitioners conducting{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(120deg,#bfe0ff 0%,#d6c6ff 50%,#9ff2ff 100%)",
              }}
            >
              real implementation
            </span>
            .
          </h2>
          <p
            className="mx-auto max-w-xl text-base leading-relaxed text-[rgba(240,246,255,0.9)] md:mx-0"
            style={{ textShadow: "0 1px 10px rgba(4,10,20,0.3)" }}
          >
            For the people actually shipping on-chain: protocol engineers, quants,
            treasury and strategy teams. Contract-level detail, verified sources and
            cross-protocol context, so you can act on research instead of re-deriving it.
          </p>
          <div className="pt-1">
            <ContactCta sourcePage="home-builders" size="lg" />
          </div>
        </div>
      </div>
    </section>
  );
}
