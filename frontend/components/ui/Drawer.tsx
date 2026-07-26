"use client";

import { useRef, type ReactNode } from "react";
import { X } from "lucide-react";

import { useModalBehavior } from "@/components/ui/useModalBehavior";
import { cn } from "@/lib/utils";

/**
 * Right-side slide-over panel built on useModalBehavior (Escape, focus trap,
 * scroll lock, focus restore). Conditionally mounted: render it only while
 * `open` is true state-wise: internally it returns null when closed so
 * callers can keep it always-mounted and toggle `open`.
 *
 * This is the drill-down shell for metric cards (CAN-57/CAN-61) and the
 * primitive M4-M9 panels should reuse.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
  widthClassName = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  widthClassName?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useModalBehavior({
    onClose,
    containerRef,
    initialFocusRef: closeRef,
    active: open,
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close panel"
        tabIndex={-1}
        className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className={cn(
          "relative flex h-full w-full flex-col overflow-y-auto border-l border-ink-800/70 bg-ink-950 shadow-2xl",
          widthClassName,
        )}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-ink-800/60 bg-ink-950/95 px-5 py-4 backdrop-blur">
          <h2 id="drawer-title" className="font-display text-lg font-semibold tracking-tight text-ink-50">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg border border-ink-800/60 p-1.5 text-ink-400 transition hover:text-ink-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-500/70"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="flex-1 px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
