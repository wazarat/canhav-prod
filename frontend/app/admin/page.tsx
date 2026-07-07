import { redirect } from "next/navigation";

import { AdminPanel, type OrgOption, type PickerNetwork } from "@/components/admin/AdminPanel";
import { requireAdmin } from "@/lib/auth/admin";
import { readLiveStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin panel: Supabase-gated. Two tabs — read-only Data diagnostics and the
 * curated Content editor — both driven by a searchable network picker. Public
 * (Privy) auth is untouched; this page redirects to /admin/login when the caller
 * is not a signed-in admin.
 */
export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const store = await readLiveStore();

  const networks: PickerNetwork[] = store.networks
    .map((n) => ({ slug: n.slug, name: n.name, sector: n.sector ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // All taggable profiles (networks + coins) for the OrgPicker widget.
  const orgOptions: OrgOption[] = [
    ...store.networks.map((n) => ({ slug: n.slug, name: n.name, category: "Network" as const })),
    ...store.tokens.map((t) => ({ slug: t.slug, name: t.name, category: "Token" as const })),
    ...store.stablecoins.map((s) => ({
      slug: s.slug,
      name: s.name,
      category: "Stablecoin" as const,
    })),
    ...store.rwas.map((r) => ({ slug: r.slug, name: r.name, category: "RWA" as const })),
    ...store.receipts.map((r) => ({ slug: r.slug, name: r.name, category: "Receipt" as const })),
  ].sort((a, b) => a.name.localeCompare(b.name));

  return <AdminPanel adminEmail={admin.email} networks={networks} orgOptions={orgOptions} />;
}
