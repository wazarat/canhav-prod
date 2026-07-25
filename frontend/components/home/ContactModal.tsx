"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type LeadType = "individual" | "team";
type Status = "idle" | "submitting" | "success" | "error";

const inputClasses =
  "w-full rounded-xl border border-ink-700/60 bg-ink-950/70 px-3.5 py-2.5 text-sm text-ink-50 " +
  "placeholder:text-ink-500 focus:border-electric-500/60 focus:outline-none focus:ring-1 focus:ring-electric-500/30";

export function ContactModal({
  open,
  onClose,
  sourcePage,
}: {
  open: boolean;
  onClose: () => void;
  sourcePage: string;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [leadType, setLeadType] = useState<LeadType>("individual");
  const [comments, setComments] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — humans never see it
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (!open) return;
    // Fresh form every time the modal opens.
    setFullName("");
    setEmail("");
    setLeadType("individual");
    setComments("");
    setWebsite("");
    setStatus("idle");

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, leadType, comments, sourcePage, website }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      setStatus(res.ok && data?.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Contact CanHav Research"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="glass relative z-10 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-ink-700/70 animate-fade-in-up">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 rounded-lg border border-ink-700 bg-ink-900/60 p-1.5 text-ink-300 transition-colors hover:text-ink-50"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid md:grid-cols-[1fr_240px]">
          <div className="p-6 md:p-7">
            {status === "success" ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/10 text-emerald-300">
                  <Check className="h-7 w-7" />
                </div>
                <h3 className="font-display text-xl font-semibold tracking-tight text-ink-50">
                  Message sent
                </h3>
                <p className="max-w-xs text-sm leading-relaxed text-ink-300">
                  Thanks for reaching out — we&apos;ll get back to you shortly.
                </p>
                <Button variant="secondary" size="sm" onClick={onClose}>
                  Close
                </Button>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-electric-400">
                  Contact
                </p>
                <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink-50">
                  Get in touch
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-300">
                  Questions about the data, access or partnerships? Send us a note and
                  we&apos;ll reply.
                </p>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-ink-200">
                        Full name <span className="text-rose-400">*</span>
                      </span>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ada Lovelace"
                        className={inputClasses}
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-ink-200">
                        Email <span className="text-rose-400">*</span>
                      </span>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@email.com"
                        className={inputClasses}
                      />
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-ink-200">
                      Are you an individual or a team?
                    </span>
                    <div className="flex gap-2">
                      {(["individual", "team"] as const).map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setLeadType(value)}
                          aria-pressed={leadType === value}
                          className={cn(
                            "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                            leadType === value
                              ? "border-electric-500/60 bg-electric-500/15 text-electric-300"
                              : "border-ink-700/70 bg-ink-900/40 text-ink-300 hover:text-ink-100",
                          )}
                        >
                          {value === "individual" ? "Individual" : "Team"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-ink-200">
                      Comments <span className="text-ink-500">(optional)</span>
                    </span>
                    <textarea
                      rows={3}
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="How can we help?"
                      className={cn(inputClasses, "resize-y leading-relaxed")}
                    />
                  </label>

                  {/* Honeypot: hidden from humans, tempting to bots. */}
                  <input
                    type="text"
                    name="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="absolute -left-[9999px] h-0 w-0 opacity-0"
                  />

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Button type="submit" disabled={status === "submitting"}>
                      {status === "submitting" ? "Sending…" : "Send message"}
                    </Button>
                    {status === "error" ? (
                      <p className="text-xs text-rose-300">
                        Something went wrong — please try again.
                      </p>
                    ) : (
                      <p className="text-xs text-ink-500">
                        No spam. We only use this to reach out.
                      </p>
                    )}
                  </div>
                </form>
              </>
            )}
          </div>

          {/* Mascot pane (decorative) */}
          <div
            aria-hidden="true"
            className="relative hidden overflow-hidden rounded-r-2xl border-l border-ink-800/60 md:block"
            style={{
              background:
                "radial-gradient(circle at 30% 20%, rgba(92,146,255,0.18), transparent 60%), rgba(10,13,20,0.6)",
            }}
          >
            <Image
              src="/mascot-research.png"
              alt=""
              fill
              sizes="240px"
              className="object-contain object-bottom p-3"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
