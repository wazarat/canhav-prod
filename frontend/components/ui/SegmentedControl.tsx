"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: ReactNode;
  /** Optional count rendered as a trailing badge (pill appearance only). */
  count?: number | null;
}

/**
 * Presentational segmented radiogroup extracted from TradeModeSelector
 * (CAN-72: one segmented control, not two). Proper radiogroup semantics:
 * roving tabindex, arrow-key movement selects, Home/End jump. Default
 * appearance is the house pill bar (RangeChipBar family); TradeModeSelector
 * keeps its card look via `className` / `getOptionClassName` overrides.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  disabled = false,
  className,
  getOptionClassName,
}: {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
  getOptionClassName?: (active: boolean) => string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const move = (delta: number) => {
    const index = options.findIndex((o) => o.value === value);
    const next = options[(index + delta + options.length) % options.length];
    onChange(next.value);
    focusOption(next.value);
  };

  const focusOption = (target: T) => {
    const el = containerRef.current?.querySelector<HTMLButtonElement>(
      `button[data-value="${CSS.escape(target)}"]`,
    );
    el?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        move(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        move(-1);
        break;
      case "Home":
        e.preventDefault();
        onChange(options[0].value);
        focusOption(options[0].value);
        break;
      case "End": {
        e.preventDefault();
        const last = options[options.length - 1];
        onChange(last.value);
        focusOption(last.value);
        break;
      }
    }
  };

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn(
        className ??
          "flex flex-wrap items-center gap-1 self-start rounded-full border border-ink-800/60 bg-ink-950/60 p-1",
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            data-value={option.value}
            tabIndex={active ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={
              getOptionClassName?.(active) ??
              cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                active ? "bg-electric-500/15 text-electric-300" : "text-ink-400 hover:text-ink-100",
              )
            }
          >
            {option.label}
            {option.count != null && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 font-mono text-[10px] leading-none",
                  active ? "bg-electric-500/20 text-electric-200" : "bg-ink-800/70 text-ink-400",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
