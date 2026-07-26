import type { BadgeTone } from "@/components/ui/Badge";

export interface EntityStatusOverride {
  /** Chip label; takes precedence over the ThesisBadge for these entities. */
  label: string;
  tone: BadgeTone;
  detail: string;
  sourceLabel: string;
  sourceUrl: string;
}

/**
 * The four non-steady-state Credit entities (CAN-63 comment): presenting them
 * as live investable protocols would be wrong, so a status chip overrides the
 * thesis badge. Curated in code (4 rows, sourced from the M5 dataset) rather
 * than plumbed through the store.
 */
export const ENTITY_STATUS_OVERRIDES: Record<string, EntityStatusOverride> = {
  radiant: {
    label: "Winding down",
    tone: "danger",
    detail:
      "DAO wind-down under way since 1 June 2026, following the October 2024 exploit. Lending is disabled across all markets; what remains is a withdrawal-and-remediation shell.",
    sourceLabel: "Binance Square",
    sourceUrl: "https://www.binance.com/en/square/post/329817870913330",
  },
  notional: {
    label: "Succeeded by Exponent",
    tone: "warning",
    detail:
      "Notional V3 is winding down; the successor product Notional Exponent went live on 26 January 2026.",
    sourceLabel: "Notional Exponent launch details",
    sourceUrl: "https://blog.notional.finance/notional-exponent-launch-details/",
  },
  sense: {
    label: "Sunset",
    tone: "neutral",
    detail:
      "Protocol sunset in October 2023 after 18 months of operation; users were told to withdraw by 1 December 2023 and the UI was open-sourced.",
    sourceLabel: "Sunsetting Sense",
    sourceUrl: "https://medium.com/sensefinance/sunsetting-sense-and-releasing-it-into-the-ether-cd8c8e1731ad",
  },
  stella: {
    label: "Dormant",
    tone: "warning",
    detail:
      "Functionally dormant with residual deposits: TVL flat near $443k with zero incentives and no wind-down notice found.",
    sourceLabel: "DefiLlama",
    sourceUrl: "https://defillama.com/protocol/stella",
  },
};
