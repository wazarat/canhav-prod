"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { GraduationCap, Loader2, Plus } from "lucide-react";

import { buildPrivySigner } from "@/lib/agent/privy-signer";
import { advertiseSkillsOnChain, type AdvertiseParams } from "@/lib/agent/skill-attach-client";

interface MySkill {
  id: string;
  title: string;
}

interface AttachResponse {
  ok?: boolean;
  error?: string;
  skill?: { id: string; title: string };
  advertise?: AdvertiseParams | null;
}

/**
 * Attach a user-authored skill to this agent = training.
 *
 * The server grounds the skill into memory + marks it studied; if the agent is
 * minted on-chain we additionally advertise the skill ids / hash via a
 * browser-signed setMetadata (best-effort — failure here never blocks training).
 */
export function AttachSkillPanel({ agentId, onChain }: { agentId: string; onChain: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Set when the user just created a skill from this panel ("?skill=<id>").
  const preselectSkillId = searchParams.get("skill");
  const createSkillHref = `/agents/skills/new?agent=${encodeURIComponent(agentId)}`;
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  const [skills, setSkills] = useState<MySkill[] | null>(null);
  const [pick, setPick] = useState("");
  const [phase, setPhase] = useState<"idle" | "attaching" | "advertising">("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/collab/skills");
        if (!res.ok) return;
        const data = (await res.json()) as { skills?: MySkill[] };
        if (active) {
          const list = (data.skills ?? []).map((s) => ({ id: s.id, title: s.title }));
          setSkills(list);
          // Preselect a just-created skill when returning from the composer.
          const preselected = preselectSkillId
            ? list.find((s) => s.id === preselectSkillId)
            : undefined;
          setPick(preselected?.id ?? list[0]?.id ?? "");
          if (preselected) {
            setNotice(`"${preselected.title}" is ready. Click Attach to train this agent on it.`);
          }
        }
      } catch {
        if (active) setSkills([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [preselectSkillId]);

  async function attach() {
    if (!pick) return;
    setError(null);
    setNotice(null);
    setPhase("attaching");
    try {
      const res = await fetch(`/api/collab/skills/${encodeURIComponent(pick)}/attach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      const data = (await res.json()) as AttachResponse;
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `Attach failed (status ${res.status}).`);
      }

      // Best-effort on-chain advertise (only when the agent is minted).
      if (data.advertise) {
        if (!authenticated) {
          login();
          setNotice("Trained locally. Sign in to advertise this skill on-chain.");
        } else {
          try {
            setPhase("advertising");
            const signer = await buildPrivySigner(wallets);
            await advertiseSkillsOnChain({ signer, advertise: data.advertise });
            setNotice("Trained and advertised on-chain.");
          } catch (e) {
            setNotice(
              `Trained, but on-chain advertise was skipped: ${
                e instanceof Error ? e.message : "signing failed"
              }`,
            );
          }
        }
      } else {
        setNotice("Skill attached. Your agent is now trained on it.");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Attach failed.");
    } finally {
      setPhase("idle");
    }
  }

  const busy = phase !== "idle";

  return (
    <div className="glass space-y-4 rounded-2xl p-6">
      <div className="flex items-center justify-between gap-2 border-b border-ink-800/60 pb-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-neon-400" />
          <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
            Add a skill you created to this agent
          </h3>
        </div>
        <Link
          href={createSkillHref}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-electric-400 transition-colors hover:text-electric-300"
        >
          <Plus className="h-3.5 w-3.5" /> Create a skill
        </Link>
      </div>

      {skills === null ? (
        <p className="flex items-center gap-2 text-sm text-ink-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading your skills…
        </p>
      ) : skills.length === 0 ? (
        <p className="text-sm text-ink-400">
          You haven&apos;t authored any skills yet.{" "}
          <Link href={createSkillHref} className="font-medium text-electric-400 hover:text-electric-300">
            Create or import one
          </Link>{" "}
          to train this agent.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            disabled={busy}
            className="flex-1 rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-sm text-ink-100 outline-none focus:border-electric-500/60 disabled:opacity-50"
          >
            {skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={attach}
            disabled={busy || !pick}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neon-500/40 bg-neon-500/10 px-3 py-2 text-sm font-medium text-neon-400 transition-colors hover:bg-neon-500/20 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {phase === "advertising" ? "Advertising…" : phase === "attaching" ? "Training…" : "Attach"}
          </button>
        </div>
      )}

      {onChain && (
        <p className="text-[10px] text-ink-500">
          On-chain agent: attaching also advertises the skill via ERC-8004 metadata so other agents
          can discover it.
        </p>
      )}
      {notice && <p className="text-xs text-signal-300">{notice}</p>}
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}
