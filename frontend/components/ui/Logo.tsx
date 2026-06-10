import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2", className)}>
      <span className="relative inline-block h-7 w-7">
        <Image
          src="/mark.svg"
          alt="CanHav"
          width={28}
          height={28}
          priority
          className="h-7 w-7 object-contain"
        />
        <span className="absolute -inset-1 -z-10 rounded-lg bg-electric-500/20 blur-md" />
      </span>
      <span className="font-display text-base font-semibold tracking-tight text-ink-50">
        CanHav Research
      </span>
    </Link>
  );
}
