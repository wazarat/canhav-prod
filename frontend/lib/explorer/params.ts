import { EXPLORER_VIEW_IDS, type ExplorerViewId } from "@/lib/explorer/types";

/**
 * URL param resolvers (house ?view= pattern, resolveCompetitorsView family).
 * Called server-side so deep links SSR the right initial state; the shell
 * island mirrors changes back via history.replaceState.
 */

export function resolveExplorerView(
  raw: string | undefined,
  offered: ExplorerViewId[],
): ExplorerViewId {
  if (raw && (EXPLORER_VIEW_IDS as readonly string[]).includes(raw) && offered.includes(raw as ExplorerViewId)) {
    return raw as ExplorerViewId;
  }
  return offered[0];
}

export function resolveExplorerNodeParam(
  raw: string | undefined,
  nodeIds: ReadonlySet<string>,
): string | null {
  if (!raw) return null;
  return nodeIds.has(raw) ? raw : null;
}
