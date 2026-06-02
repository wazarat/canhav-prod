import { Card } from "@/components/ui/Card";

/** Placeholder for a 4-up StatCard row while live metrics resolve. */
export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass rounded-2xl px-5 py-4">
          <div className="h-3 w-20 animate-pulse rounded bg-ink-800/70" />
          <div className="mt-3 h-7 w-24 animate-pulse rounded bg-ink-800/50" />
        </div>
      ))}
    </section>
  );
}

/** Placeholder for a chart Card while its series resolves. */
export function ChartCardSkeleton({ title }: { title: string }) {
  return (
    <Card>
      <div className="h-5 w-44 animate-pulse rounded bg-ink-800/70" aria-label={title} />
      <div className="mt-2 h-3 w-32 animate-pulse rounded bg-ink-800/40" />
      <div className="mt-4 h-[220px] animate-pulse rounded-xl bg-ink-800/30" />
    </Card>
  );
}
