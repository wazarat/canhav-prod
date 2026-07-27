import type { ReactNode } from "react";

/**
 * Generic relationship-explorer contract (M9.2, CAN-83).
 *
 * The shell knows nothing about any specific relation: consumers map their
 * domain (partnerships, competitors, asset-risk, dependency maps) into
 * nodes + edges + a category taxonomy. Documented in
 * docs/credit/relationship-explorer.md.
 */

export interface ExplorerCategory {
  id: string;
  label: string;
  /** Key into EXPLORER_TONES; drives cluster dots, chips, and graph colors. */
  tone: ExplorerToneId;
  description?: string;
  /**
   * "badges": the category never becomes nodes/edges; its content arrives
   * via `badgeStrips` (e.g. high-volume low-signal memberships).
   */
  renderAs?: "nodes" | "badges";
}

export interface ExplorerDetailRow {
  label: string;
  value: string;
  href?: string;
}

export interface ExplorerDetailSection {
  heading?: string;
  /** Optional category id: lets the panel color section headings. */
  categoryId?: string;
  rows: ExplorerDetailRow[];
  /** Free-form lines rendered as muted prose under the rows. */
  notes?: string[];
}

/** Data-driven detail content; the shell renders it without a callback so a
 * server component can supply everything as serialisable props. Client-side
 * consumers may override rendering entirely via `renderDetail`. */
export interface ExplorerDetail {
  title: string;
  subtitle?: string;
  href?: string;
  sections: ExplorerDetailSection[];
}

export interface ExplorerNode {
  id: string;
  label: string;
  /** Primary category: cluster grouping + default color. */
  categoryId: string;
  /** On-platform cross-link (rendered as "Open profile"). */
  href?: string;
  /** Optional logo; consumers resolve it (letter avatar fallback otherwise). */
  iconUrl?: string;
  /** 0..1 -> node radius in the graph view. */
  weight?: number;
  statusChip?: { label: string; tone: "positive" | "warning" | "neutral" };
  /** Small trailing badges ("Risk curator", "Also a competitor"). */
  badges?: string[];
  /** One-liner shown on cards and hover previews. */
  summary?: string;
  detail?: ExplorerDetail;
}

export interface ExplorerEdge {
  /** Node ids; rendering does not require sorted pairs. */
  source: string;
  target: string;
  categoryId: string;
  /** 0..1 -> stroke emphasis. */
  weight?: number;
  directed?: boolean;
  label?: string;
}

export const EXPLORER_VIEW_IDS = ["clusters", "graph", "flow"] as const;
export type ExplorerViewId = (typeof EXPLORER_VIEW_IDS)[number];

export interface ExplorerBadgeStrip {
  heading: string;
  categoryId?: string;
  items: { label: string; href?: string; muted?: boolean; title?: string }[];
}

export interface RelationshipExplorerProps {
  /** Emphasised node: clusters view shows its first-degree neighborhood;
   * the graph view shows the whole node set with this node highlighted. */
  centerId: string;
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  categories: ExplorerCategory[];
  /** Offered views, first entry is the default. "flow" is reserved. */
  views?: ExplorerViewId[];
  /** Resolved server-side from the URL (?view=). */
  initialView?: ExplorerViewId;
  /** Resolved server-side from the URL (?node=). */
  initialSelectedId?: string | null;
  badgeStrips?: ExplorerBadgeStrip[];
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** aria label prefix + URL-free identity for the control group. */
  ariaLabel: string;
  /** Client-consumer escape hatches; server consumers rely on node.detail. */
  renderDetail?: (node: ExplorerNode) => ReactNode;
  onNodeSelect?: (node: ExplorerNode) => void;
}

/** Presentation tones. Hex values exist because the canvas graph cannot read
 * CSS classes; keep both columns in sync. */
export const EXPLORER_TONES = {
  electric: { dot: "bg-electric-400", chip: "border-electric-500/40 text-electric-300", hex: "#5C92FF" },
  neon: { dot: "bg-neon-400", chip: "border-neon-500/40 text-neon-400", hex: "#A78BFA" },
  signal: { dot: "bg-signal-400", chip: "border-signal-500/40 text-signal-400", hex: "#22D3EE" },
  emerald: { dot: "bg-emerald-400", chip: "border-emerald-500/40 text-emerald-300", hex: "#34D399" },
  amber: { dot: "bg-amber-400", chip: "border-amber-500/40 text-amber-300", hex: "#FBBF24" },
  rose: { dot: "bg-rose-400", chip: "border-rose-500/40 text-rose-300", hex: "#FB7185" },
  lime: { dot: "bg-lime-400", chip: "border-lime-500/40 text-lime-300", hex: "#A3E635" },
  orange: { dot: "bg-orange-400", chip: "border-orange-500/40 text-orange-300", hex: "#FB923C" },
  fuchsia: { dot: "bg-fuchsia-400", chip: "border-fuchsia-500/40 text-fuchsia-300", hex: "#E879F9" },
  slate: { dot: "bg-ink-300", chip: "border-ink-500/60 text-ink-300", hex: "#7C8499" },
} as const;

export type ExplorerToneId = keyof typeof EXPLORER_TONES;
