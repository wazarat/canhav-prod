import { FlaskConical } from "lucide-react";

/**
 * Rendered while the app runs on mock data (Step 2). Makes it unambiguous that
 * supply/peg figures are illustrative and not live Alchemy/Dune values.
 */
export function MockDataBanner() {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] px-4 py-2.5 text-xs text-amber-200/90">
      <FlaskConical className="h-3.5 w-3.5 shrink-0" />
      <span>
        <span className="font-semibold">Mock data.</span> Supply and peg figures are illustrative
        placeholders. Live Alchemy &amp; Dune overlays land in Step 4.
      </span>
    </div>
  );
}
