/**
 * Canonical section heading for tabbed detail pages: title + optional subtitle
 * over a hairline divider. `id` enables deep links (scroll-mt offsets the
 * sticky header). Single source of truth per CAN-53; do not fork per-tab.
 */
export function SectionHeading({
  title,
  subtitle,
  id,
}: {
  title: string;
  subtitle?: string;
  id?: string;
}) {
  return (
    <div id={id} className="scroll-mt-24 space-y-1 border-b border-ink-800/60 pb-2">
      <h2 className="font-display text-lg font-semibold tracking-tight text-ink-50">{title}</h2>
      {subtitle && <p className="text-sm text-ink-300">{subtitle}</p>}
    </div>
  );
}
