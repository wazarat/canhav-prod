import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", className)}>
      <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-electric-500 to-neon-600 text-sm font-bold text-white shadow-[0_4px_20px_-4px_rgba(61,123,255,0.7)]">
        C
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-sm font-semibold tracking-tight text-ink-50">
          CanHav
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-300">
          Research
        </span>
      </span>
    </Link>
  );
}
