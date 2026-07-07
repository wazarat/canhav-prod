/**
 * Tab registry for the /agents landing page ("Agent Lab"). Mirrors the
 * network-page pattern (lib/networks/tabs.ts): the RSC resolves `?tab=` and
 * renders only the active tab's sections.
 */

export const LAB_TAB_IDS = ["agents", "credits", "skills", "sandbox", "provisioning"] as const;

export type LabTabId = (typeof LAB_TAB_IDS)[number];

export interface LabTabDefinition {
  id: LabTabId;
  label: string;
}

const TAB_LABELS: Record<LabTabId, string> = {
  agents: "Your agents",
  credits: "Credits",
  skills: "Skills",
  sandbox: "Sandbox chat",
  provisioning: "Provisioning",
};

export const DEFAULT_LAB_TAB: LabTabId = "agents";

export interface LabTabContext {
  /** Provisioning is an operator-only readiness panel. */
  isAdmin: boolean;
  /** Credits need a signed-in wallet. */
  hasSession: boolean;
}

/** Tabs visible for this viewer. */
export function buildLabTabs(ctx: LabTabContext): LabTabDefinition[] {
  const tabs: LabTabDefinition[] = [{ id: "agents", label: TAB_LABELS.agents }];
  if (ctx.hasSession) tabs.push({ id: "credits", label: TAB_LABELS.credits });
  tabs.push({ id: "skills", label: TAB_LABELS.skills });
  tabs.push({ id: "sandbox", label: TAB_LABELS.sandbox });
  if (ctx.isAdmin) tabs.push({ id: "provisioning", label: TAB_LABELS.provisioning });
  return tabs;
}

export function isLabTabId(value: string | undefined): value is LabTabId {
  return LAB_TAB_IDS.includes(value as LabTabId);
}

/** Resolve the URL tab param to a tab this viewer may see (fallback: agents). */
export function resolveLabTab(rawTab: string | undefined, ctx: LabTabContext): LabTabId {
  const ids = new Set(buildLabTabs(ctx).map((t) => t.id));
  if (rawTab && isLabTabId(rawTab) && ids.has(rawTab)) return rawTab;
  return DEFAULT_LAB_TAB;
}
