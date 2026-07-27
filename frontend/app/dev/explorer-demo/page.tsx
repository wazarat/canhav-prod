import { notFound } from "next/navigation";

import { ExplorerDemoClient } from "./ExplorerDemoClient";

/**
 * Dev-only proof surface for CAN-83's "demonstrated with at least two
 * different data shapes" DoD: renders the RelationshipExplorer with the M8
 * COMPETITOR graph (second shape; partnerships tab is the first) AND
 * exercises the client-only renderDetail / onNodeSelect escape hatches that
 * server consumers cannot use. Not linked anywhere; 404s in production.
 */
export default function ExplorerDemoPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-lg font-semibold text-ink-50">RelationshipExplorer demo — competitor data shape</h1>
      <p className="mt-1 text-sm text-ink-300">
        Dev-only. The M8 competitor graph mapped through lib/networks/competitorExplorerAdapter, with a custom
        renderDetail and an onNodeSelect log.
      </p>
      <div className="mt-6">
        <ExplorerDemoClient />
      </div>
    </main>
  );
}
