/**
 * Route-level loading skeleton for /networks. Server-only, zero client JS.
 * Mirrors the page geometry: PageHeader, 3-up stat grid, filter row, table.
 */
export default function NetworksLoading() {
  return (
    <div className="container space-y-8 py-12">
      <div>
        <div className="h-3 w-40 animate-pulse rounded bg-ink-800/40" />
        <div className="mt-4 h-8 w-48 animate-pulse rounded bg-ink-800/70" />
        <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-ink-800/40" />
      </div>
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass rounded-2xl px-5 py-4">
            <div className="h-3 w-20 animate-pulse rounded bg-ink-800/70" />
            <div className="mt-3 h-7 w-24 animate-pulse rounded bg-ink-800/50" />
          </div>
        ))}
      </section>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-24 animate-pulse rounded-full bg-ink-800/40" />
        ))}
      </div>
      <div className="glass space-y-4 rounded-2xl p-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-ink-800/50" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-44 max-w-full animate-pulse rounded bg-ink-800/60" />
              <div className="h-3 w-72 max-w-full animate-pulse rounded bg-ink-800/30" />
            </div>
            <div className="hidden h-4 w-20 animate-pulse rounded bg-ink-800/40 sm:block" />
            <div className="hidden h-4 w-20 animate-pulse rounded bg-ink-800/40 md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
