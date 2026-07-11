import { Logo } from "@/components/ui/Logo";

export function Footer() {
  return (
    <footer className="border-t border-ink-800/60 bg-ink-950/60">
      <div className="container flex flex-col items-start justify-between gap-6 py-10 md:flex-row md:items-center">
        <div className="space-y-2">
          <Logo />
          <p className="max-w-md text-sm text-ink-300">
            Arbitrum ecosystem intelligence. Research-grade datasets, curated from the
            Arbitrum Portal and refreshed daily.
          </p>
        </div>
        <div className="text-xs text-ink-500">
          <p>Data: Arbitrum Portal · Alchemy · Dune (free tier).</p>
          <p className="mt-1">
            © {new Date().getFullYear()} CanHav. Research preview, not financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
