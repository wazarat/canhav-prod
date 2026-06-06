import { FlaskConical } from "lucide-react";

interface MockDataBannerProps {
  metrics?: string;
}

/** Rendered while live metrics are still pending (Step 4 B2). */
export function MockDataBanner({ metrics = "Supply and peg" }: MockDataBannerProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] px-4 py-2.5 text-xs text-amber-200/90">
      <FlaskConical className="h-3.5 w-3.5 shrink-0" />
      <span>
        <span className="font-semibold">Live metrics pending.</span> Profile metadata is
        CSV-backed, but {metrics} figures await the live Alchemy &amp; Dune overlays (Step 4).
      </span>
    </div>
  );
}
