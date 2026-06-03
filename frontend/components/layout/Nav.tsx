import Link from "next/link";

import { Logo } from "@/components/ui/Logo";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/entities", label: "Entities" },
  { href: "/stablecoins", label: "Stablecoins" },
  { href: "/rwas", label: "RWAs" },
  { href: "/tokens", label: "Tokens" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-800/60 bg-ink-950/70 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-ink-300 transition-colors hover:bg-ink-800/60 hover:text-ink-50"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full border border-ink-800 bg-ink-900/60 px-3 py-1.5 text-xs font-medium text-ink-300 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-signal-400 animate-pulse-soft" />
            Arbitrum
          </span>
        </div>
      </div>
    </header>
  );
}
