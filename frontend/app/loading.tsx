/**
 * Root loading boundary: minimal pulse shell so every top-level navigation
 * gives instant feedback. Route groups with their own loading.tsx override it.
 */
export default function RootLoading() {
  return (
    <div className="container space-y-8 py-12">
      <div className="h-8 w-56 animate-pulse rounded bg-ink-800/70" />
      <div className="h-4 w-80 max-w-full animate-pulse rounded bg-ink-800/40" />
      <div className="glass h-64 animate-pulse rounded-2xl bg-ink-800/20" />
    </div>
  );
}
