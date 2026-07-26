"use client";

import type { ReactNode } from "react";

import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

/**
 * Rich toggle-card primitive (lifted from the Trade desk rails per CAN-61):
 * a switch + title + tone badge header, an optional live-reading pill that
 * flips amber when tripping, a mono description line, an optional threshold
 * slider row, a suggestion line, and a free-form footer slot.
 *
 * Markup and classes are byte-identical to the original in-desk RailCard so
 * the Trade tab renders unchanged; the desk composes its domain content
 * (watch/trip/emits copy, propose CTA) into the slots. M5/M8/M9 card rails
 * should build on this. A tighter, smaller-prop generalization can follow
 * once a second consumer exists.
 */
export function RailCard({
  title,
  switchAriaLabel,
  enabled,
  onToggle,
  badge,
  reading,
  descriptionLine,
  slider,
  suggestionLine,
  footer,
}: {
  title: string;
  switchAriaLabel: string;
  enabled: boolean;
  onToggle: () => void;
  badge?: { label: string; tone: BadgeTone };
  /** Live reading pill; `trips` renders the amber tripping treatment. */
  reading?: { label: string; trips: boolean } | null;
  /** Mono metadata line under the header (watch/trip/note copy). */
  descriptionLine?: ReactNode;
  /** Threshold slider row; omit for event-driven cards. */
  slider?: {
    min: number;
    max: number;
    step: number;
    value: number;
    onChange: (value: number) => void;
    ariaLabel: string;
    formattedValue: string;
    /** Rendered as a "default X" hint when the value differs from default. */
    formattedDefault?: string | null;
  } | null;
  /** "suggests ..." line. */
  suggestionLine?: ReactNode;
  /** Free-form footer (CTA buttons, status copy). */
  footer?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 transition-colors",
        enabled ? "border-ink-800/60 bg-ink-950/40" : "border-ink-800/40 bg-ink-950/20 opacity-60",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={switchAriaLabel}
          onClick={onToggle}
          className={cn(
            "relative h-4 w-7 shrink-0 rounded-full border transition-colors",
            enabled ? "border-electric-500/40 bg-electric-500/30" : "border-ink-700 bg-ink-900",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-2.5 w-2.5 rounded-full transition-all",
              enabled ? "left-3.5 bg-electric-400" : "left-0.5 bg-ink-500",
            )}
          />
        </button>
        <span className="text-sm font-semibold text-ink-100">{title}</span>
        {badge ? (
          <Badge tone={badge.tone} className="px-1.5 py-0 font-mono text-[9px]">
            {badge.label}
          </Badge>
        ) : null}
        {reading && (
          <span
            className={cn(
              "ml-auto rounded-full border px-2 py-0.5 font-mono text-[10px]",
              reading.trips
                ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
                : "border-ink-700/80 bg-ink-900/60 text-ink-400",
            )}
          >
            {reading.label}
            {reading.trips && " · tripping"}
          </span>
        )}
      </div>

      {descriptionLine ? (
        <p className="mt-1.5 font-mono text-[10px] text-ink-400">{descriptionLine}</p>
      ) : null}

      {slider && (
        <div className="mt-2 flex items-center gap-3">
          <input
            type="range"
            min={slider.min}
            max={slider.max}
            step={slider.step}
            value={slider.value}
            disabled={!enabled}
            onChange={(e) => slider.onChange(Number(e.target.value))}
            aria-label={slider.ariaLabel}
            className="h-1 flex-1 cursor-pointer accent-electric-500 disabled:cursor-not-allowed"
          />
          <span className="tabular w-14 text-right font-mono text-xs text-ink-100">
            {slider.formattedValue}
          </span>
          {slider.formattedDefault && (
            <span className="font-mono text-[10px] text-ink-500">
              default {slider.formattedDefault}
            </span>
          )}
        </div>
      )}

      {suggestionLine ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-500">{suggestionLine}</p>
      ) : null}

      {footer}
    </div>
  );
}
