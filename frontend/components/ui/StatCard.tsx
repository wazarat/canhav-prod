import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  source?: string;
  className?: string;
}

export function StatCard({ label, value, hint, source, className }: StatCardProps) {
  return (
    <div className={cn("glass rounded-2xl px-5 py-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-300">{label}</p>
        {source && (
          <span className="rounded-full border border-ink-700/80 bg-ink-900/60 px-2 py-0.5 text-[10px] font-medium text-ink-400">
            {source}
          </span>
        )}
      </div>
      <div className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink-50">
        {value}
      </div>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}
