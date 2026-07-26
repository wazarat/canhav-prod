import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const TONE_CLASSES = {
  electric: "border-electric-500/80 from-electric-500/[0.14] text-electric-400",
  neon: "border-neon-500/80 from-neon-500/[0.14] text-neon-400",
  signal: "border-signal-400/80 from-signal-400/[0.14] text-signal-400",
  warning: "border-amber-400/80 from-amber-400/[0.14] text-amber-200",
} as const;

export type TechTagTone = keyof typeof TONE_CLASSES;

/**
 * Small ticket-style label: left accent bar fading into transparency, mono
 * uppercase type. Used on the public Trade page instead of pill badges.
 */
export function TechTag({
  tone = "electric",
  className,
  children,
}: {
  tone?: TechTagTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-sm border-l-2 bg-gradient-to-r to-transparent px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em]",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
