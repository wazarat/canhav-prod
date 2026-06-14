import type { SectionNavItem } from "@/components/ui/SectionNav";

/**
 * Build the jump-nav for the agent detail page. The page is a long single
 * column of panels (most owner-only), so the nav only lists sections that are
 * actually rendered for the current viewer — the ids match the `scroll-mt-*`
 * wrappers in app/agents/[agentId]/page.tsx.
 */
export function buildAgentSectionNav(opts: {
  isOwner: boolean;
  isMinted: boolean;
  hasIdentity: boolean;
}): SectionNavItem[] {
  const items: SectionNavItem[] = [{ id: "agent-overview", label: "Overview" }];

  if (opts.isOwner) {
    items.push({ id: "panel-marketplace", label: "Publish" });
    items.push({ id: "panel-dune", label: "Dune" });
  }

  items.push({ id: "panel-chat", label: "Research chat" });

  if (opts.hasIdentity) items.push({ id: "panel-identity", label: "Identity" });
  if (opts.isMinted) items.push({ id: "panel-performance", label: "Performance" });
  if (opts.isOwner) items.push({ id: "panel-tools", label: "Tools" });

  items.push({ id: "panel-memory", label: "Knowledge" });
  items.push({ id: "panel-skills", label: "Skills" });

  if (opts.isOwner) items.push({ id: "panel-framework", label: "Framework" });

  return items;
}
