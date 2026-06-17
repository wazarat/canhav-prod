import Link from "next/link";

import { Logo } from "@/components/ui/Logo";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/networks", label: "Networks" },
  { href: "/stablecoins", label: "Stablecoins" },
  { href: "/rwas", label: "RWAs" },
  { href: "/tokens", label: "Tokens" },
  { href: "/agents", label: "Agents" },
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
      </div>
    </header>
  );
}
