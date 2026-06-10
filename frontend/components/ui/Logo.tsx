import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", className)}>
      <span className="relative inline-block h-8 w-8">
        <Image
          src="/mark.svg"
          alt="CanHav"
          width={32}
          height={32}
          priority
          className="h-8 w-8 object-contain"
        />
        <span className="absolute -inset-1 -z-10 rounded-lg bg-electric-500/20 blur-md" />
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
