/**
 * Marketplace kill-switch (roadmap C2). The /collab marketplace is descoped
 * but the code is kept for a possible revival: every entry point (pages, API
 * routes, nav links, tCNHV credits UI) checks this single flag.
 *
 * Default OFF. Set NEXT_PUBLIC_COLLAB_ENABLED=1 (build-time env — Next.js
 * inlines NEXT_PUBLIC_* values, so a redeploy is required) to bring the
 * marketplace back. Safe to import from both server and client modules.
 */
export function collabEnabled(): boolean {
  return process.env.NEXT_PUBLIC_COLLAB_ENABLED === "1";
}
