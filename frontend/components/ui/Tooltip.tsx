"use client";

import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Dependency-free tooltip for short explanatory text (metric calculations,
 * source caveats). Opens on hover and keyboard focus, closes on blur, mouse
 * leave, or Escape. The trigger is a real button so it is keyboard reachable;
 * the panel is linked via aria-describedby.
 *
 * For rich interactive overlays use a Drawer instead: this is intentionally
 * text-only and non-interactive (WCAG 1.4.13: content is dismissible via
 * Escape and hoverable via the shared wrapper).
 */
export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        className="inline-flex cursor-help items-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-500/70"
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      >
        {children}
      </button>
      {open ? (
        <span
          role="tooltip"
          id={id}
          className={cn(
            "pointer-events-none absolute left-1/2 z-50 w-max max-w-[16rem] -translate-x-1/2 rounded-lg border border-ink-700/80 bg-ink-900 px-3 py-2 text-left text-[11px] font-normal normal-case leading-snug tracking-normal text-ink-200 shadow-xl",
            side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
