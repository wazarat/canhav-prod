import type { BadgeTone } from "@/components/ui/Badge";
import type { MemberCoinCategory } from "@/lib/types";

/** Consistent badge tone for stablecoin / token / RWA categories across entity surfaces. */
export function categoryBadgeTone(category: MemberCoinCategory): BadgeTone {
  switch (category) {
    case "Token":
      return "neon";
    case "RWA":
      return "signal";
    case "Stablecoin":
    default:
      return "electric";
  }
}
