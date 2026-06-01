import * as React from "react";

import { cn } from "@/lib/utils";

export type BadgeTone =
  | "neutral"
  | "electric"
  | "signal"
  | "neon"
  | "positive"
  | "warning"
  | "danger";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-ink-700/80 bg-ink-900/60 text-ink-200",
  electric: "border-electric-500/40 bg-electric-500/10 text-electric-400",
  signal: "border-signal-400/40 bg-signal-400/10 text-signal-400",
  neon: "border-neon-500/40 bg-neon-500/10 text-neon-400",
  positive: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  danger: "border-rose-500/40 bg-rose-500/10 text-rose-300",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
