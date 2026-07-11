/**
 * Tab registry for the agent detail page (/agents/[agentId]). Replaces the old
 * anchor-scroll jump-nav (agentSections.ts): sections now live behind real
 * `?tab=` tabs so only the active tab renders.
 */

export const AGENT_TAB_IDS = ["trade", "desk", "train", "publish", "overview"] as const;

export type AgentTabId = (typeof AGENT_TAB_IDS)[number];

export interface AgentTabDefinition {
  id: AgentTabId;
  label: string;
}

const TAB_LABELS: Record<AgentTabId, string> = {
  trade: "Research",
  desk: "Trade desk",
  train: "Train",
  publish: "Publish",
  overview: "Overview",
};

export const DEFAULT_AGENT_TAB: AgentTabId = "trade";

/** Tabs visible for this viewer. Train/Publish are owner editing surfaces. */
export function buildAgentTabs(opts: { isOwner: boolean }): AgentTabDefinition[] {
  // Desk is public: non-owners see the read-only gate/verdict view there.
  const tabs: AgentTabDefinition[] = [
    { id: "trade", label: TAB_LABELS.trade },
    { id: "desk", label: TAB_LABELS.desk },
  ];
  if (opts.isOwner) {
    tabs.push({ id: "train", label: TAB_LABELS.train });
    tabs.push({ id: "publish", label: TAB_LABELS.publish });
  }
  tabs.push({ id: "overview", label: TAB_LABELS.overview });
  return tabs;
}

export function isAgentTabId(value: string | undefined): value is AgentTabId {
  return AGENT_TAB_IDS.includes(value as AgentTabId);
}

/** Resolve the URL tab param to a tab this viewer may see (fallback: trade). */
export function resolveAgentTab(
  rawTab: string | undefined,
  opts: { isOwner: boolean },
): AgentTabId {
  const ids = new Set(buildAgentTabs(opts).map((t) => t.id));
  if (rawTab && isAgentTabId(rawTab) && ids.has(rawTab)) return rawTab;
  return DEFAULT_AGENT_TAB;
}

/**
 * Which tab renders each legacy `#panel-*` anchor — feeds TabHashRedirect so
 * old bookmarks/deep links land on the right tab. Viewer-aware: for
 * non-owners the shared panels (memory/skills) render on Overview and the
 * owner-only anchors are omitted, so the redirect can never point at a tab
 * the viewer would be bounced back out of.
 */
export function agentHashToTab(opts: { isOwner: boolean }): Record<string, AgentTabId> {
  const shared: Record<string, AgentTabId> = {
    "panel-verdicts": "trade",
    "panel-chat": "trade",
    "panel-identity": "overview",
    "panel-performance": "overview",
    "panel-tools": "overview",
  };
  if (!opts.isOwner) {
    return { ...shared, "panel-memory": "overview", "panel-skills": "overview" };
  }
  return {
    ...shared,
    "panel-marketplace": "publish",
    "panel-dune": "publish",
    "panel-memory": "train",
    "panel-skills": "train",
    "panel-framework": "train",
    "panel-frames": "train",
    "panel-knowledge": "train",
    "panel-custom-tools": "train",
    "panel-attach-skill": "train",
  };
}
