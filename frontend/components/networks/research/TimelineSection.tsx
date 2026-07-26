import { ArrowUpRight } from "lucide-react";

import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { CollapsibleSection } from "@/components/networks/research/CollapsibleSection";
import type { TimelineEntry, TimelineStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * THE one timeline renderer (CAN-65: EventsSection moved here; TimelineWidget
 * deleted as dead code). Visual treatment per timeline status (playbook §5):
 * executed/stated milestones render solid; theoretical and CanHav-inferred
 * steps render muted with a dashed card + explicit label so they're never
 * mistaken for things that have actually happened.
 */
const TIMELINE_STATUS_META: Record<
  TimelineStatus,
  { label: string; tone: BadgeTone; muted: boolean; node: string }
> = {
  executed: { label: "Executed", tone: "positive", muted: false, node: "border-emerald-500/60" },
  stated: { label: "Stated", tone: "signal", muted: false, node: "border-electric-500/50" },
  theoretical: { label: "Theoretical", tone: "warning", muted: true, node: "border-amber-400/40" },
  "canhav-inferred": {
    label: "CanHav inferred",
    tone: "neutral",
    muted: true,
    node: "border-ink-600",
  },
};

export function TimelineSection({ events }: { events: TimelineEntry[] }) {
  if (!events.length) return null;
  const showLegend = events.some((e) => e.status === "theoretical" || e.status === "canhav-inferred");

  return (
    <CollapsibleSection
      id="timeline"
      title="Timeline"
      subtitle="Key milestones: launches, upgrades, exploits and governance events."
      count={events.length}
    >
      <div className="space-y-4">
        {showLegend && (
          <p className="text-xs text-ink-400">
            <span className="text-ink-300">Executed</span> and{" "}
            <span className="text-ink-300">Stated</span> are sourced from the protocol.{" "}
            <span className="text-ink-300">Theoretical</span> and{" "}
            <span className="text-ink-300">CanHav inferred</span> items are forward-looking and not
            yet realized.
          </p>
        )}
        <div className="relative space-y-0 pl-6">
          <div className="absolute bottom-2 left-[7px] top-2 w-px bg-ink-700/80" />
          {events.map((e) => {
            const meta = TIMELINE_STATUS_META[e.status ?? "stated"];
            return (
              <div key={`${e.date}-${e.title}`} className="relative pb-6 last:pb-0">
                <span
                  className={cn(
                    "absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full border-2 bg-ink-950",
                    meta.node,
                  )}
                />
                <div
                  className={cn(
                    "space-y-2 rounded-xl border p-4",
                    meta.muted
                      ? "border-dashed border-ink-700/70 bg-ink-900/20 opacity-80"
                      : "border-ink-800/60 bg-ink-900/30",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          meta.muted ? "text-ink-200" : "text-ink-50",
                        )}
                      >
                        {e.title}
                      </p>
                      <Badge tone={meta.tone} className="text-[10px]">
                        {meta.label}
                      </Badge>
                    </div>
                    <Badge tone="neutral">{e.date}</Badge>
                  </div>
                  <p className="text-sm leading-relaxed text-ink-300">{e.description}</p>
                  {e.link && (
                    <a
                      href={e.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 text-xs text-electric-400 hover:underline"
                    >
                      Source
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </CollapsibleSection>
  );
}
