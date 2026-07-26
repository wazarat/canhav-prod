import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";

/**
 * Named, anchored, collapsible Research section (CAN-65): SectionHeading
 * typography on a native <details>/<summary> disclosure — no client JS.
 * `scroll-mt-28` clears the sticky NetworkTabBar (top-16) plus breathing room.
 * Callers must hasData-gate BEFORE rendering: an empty section renders
 * nothing, never an empty shell.
 */
export function CollapsibleSection({
  id,
  title,
  subtitle,
  count,
  defaultOpen = true,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  /** Row count badge for list-bearing sections. */
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <details open={defaultOpen} className="group/section">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 border-b border-ink-800/60 pb-2 [&::-webkit-details-marker]:hidden">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold tracking-tight text-ink-50">
              {title}
              {count != null && count > 0 && (
                <Badge tone="neutral" className="ml-2 align-middle">
                  {count}
                </Badge>
              )}
            </h2>
            {subtitle && <p className="text-sm text-ink-300">{subtitle}</p>}
          </div>
          <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-ink-400 transition-transform group-open/section:rotate-180" />
        </summary>
        <div className="pt-4">{children}</div>
      </details>
    </section>
  );
}
