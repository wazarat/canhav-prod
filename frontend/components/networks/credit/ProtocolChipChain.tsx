import Link from "next/link";

/**
 * Integrated-protocol dependency map as a simple chip chain (CAN-68 chart 3).
 * The full directed graph is deliberately deferred to the M9
 * RelationshipExplorer; this renders the dependency chain explicitly without
 * graph plumbing. Server component, zero client JS.
 */
export function ProtocolChipChain({
  protocols,
  trackedSlugsByName,
}: {
  protocols: string[];
  /** name (lowercased) -> tracked network slug, for on-platform links. */
  trackedSlugsByName: Record<string, string>;
}) {
  if (protocols.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {protocols.map((name, idx) => {
        const slug = trackedSlugsByName[name.toLowerCase()] ?? null;
        const chip = slug ? (
          <Link
            href={`/networks/${slug}`}
            className="rounded-full border border-ink-700/70 bg-ink-800/40 px-3 py-1 text-xs font-medium text-ink-200 transition-colors hover:border-ink-500 hover:text-ink-50"
          >
            {name}
          </Link>
        ) : (
          <span className="rounded-full border border-ink-800/70 bg-ink-900/40 px-3 py-1 text-xs text-ink-400">
            {name}
          </span>
        );
        return (
          <span key={name} className="inline-flex items-center gap-2">
            {chip}
            {idx < protocols.length - 1 ? (
              <span aria-hidden className="text-ink-600">
                →
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
