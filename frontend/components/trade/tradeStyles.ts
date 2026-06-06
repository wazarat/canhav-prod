import { cn } from "@/lib/utils";

/** GMX-inspired panel shell — flat borders, minimal radius. */
export const tradePanel = "overflow-hidden rounded border border-white/[0.08] bg-[#0B0D12]";
export const tradePanelInset = "rounded border border-white/[0.06] bg-[#08090C]";
export const tradeDivider = "border-white/[0.08]";
export const tradeLabel = "text-[11px] font-medium uppercase tracking-wide text-[#A0A3AD]";
export const tradeMuted = "text-[#787B87]";

export const GMX_LONG = "#0ECB81";
export const GMX_SHORT = "#F6465D";

export function tradeSegmentTab(active: boolean, side?: "long" | "short" | "neutral") {
  return cn(
    "flex-1 py-2.5 text-sm font-medium transition-colors",
    active && side === "long" && "bg-[#0ECB81] text-white",
    active && side === "short" && "bg-[#F6465D] text-white",
    active && side === "neutral" && "bg-white/[0.08] text-white",
    !active && "text-[#787B87] hover:text-[#A0A3AD]",
  );
}

export function tradeLeverageBtn(active: boolean) {
  return cn(
    "rounded border px-2 py-1.5 text-xs font-medium transition-colors",
    active
      ? "border-electric-500/50 bg-electric-500/15 text-electric-400"
      : "border-white/[0.08] bg-[#08090C] text-[#787B87] hover:border-white/[0.12] hover:text-[#A0A3AD]",
  );
}

export function tradeBottomTab(active: boolean) {
  return cn(
    "border-b-2 px-4 py-3 text-sm font-medium transition-colors",
    active
      ? "border-electric-500 text-white"
      : "border-transparent text-[#787B87] hover:text-[#A0A3AD]",
  );
}
