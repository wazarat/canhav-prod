/**
 * Route-level loading skeleton for /networks/[slug]. Server-only, zero client
 * JS. Mirrors the entity header + tab bar + stat grid geometry so that
 * searchParams navigations (tab switches also hit this boundary) read as a
 * refresh rather than a blank page.
 */
export default function NetworkDetailLoading() {
  return (
    <div className="container space-y-8 py-12">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 shrink-0 animate-pulse rounded-2xl bg-ink-800/60" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-7 w-52 max-w-full animate-pulse rounded bg-ink-800/70" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded bg-ink-800/40" />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-5 w-16 animate-pulse rounded-full bg-ink-800/40" />
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-9 w-24 animate-pulse rounded-full bg-ink-800/40" />
        ))}
      </div>
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass rounded-2xl px-5 py-4">
            <div className="h-3 w-20 animate-pulse rounded bg-ink-800/70" />
            <div className="mt-3 h-7 w-24 animate-pulse rounded bg-ink-800/50" />
          </div>
        ))}
      </section>
      <div className="glass rounded-2xl p-5">
        <div className="h-5 w-44 animate-pulse rounded bg-ink-800/70" />
        <div className="mt-2 h-3 w-32 animate-pulse rounded bg-ink-800/40" />
        <div className="mt-4 h-[220px] animate-pulse rounded-xl bg-ink-800/30" />
      </div>
    </div>
  );
}
