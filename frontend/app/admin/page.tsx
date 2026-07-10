import { redirect } from "next/navigation";

import {
  AdminPanel,
  type OrgOption,
  type PickerCoin,
  type PickerNetwork,
  type PickerReceipt,
} from "@/components/admin/AdminPanel";
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

  // Coins (Token + Stablecoin + RWA folded together) and receipts, for the pill
  // switcher's pickers. Richer than orgOptions (symbol/type/entity chips).
  const coins: PickerCoin[] = [
    ...store.tokens.map((t) => ({
      slug: t.slug,
      name: t.name,
      symbol: t.symbol,
      category: "Token" as const,
      coinType: t.coinType ?? null,
      entitySlug: t.entitySlug ?? null,
      sector: t.sector ?? null,
    })),
    ...store.stablecoins.map((s) => ({
      slug: s.slug,
      name: s.name,
      symbol: s.symbol,
      category: "Stablecoin" as const,
      coinType: s.coinType ?? null,
      entitySlug: s.entitySlug ?? null,
      sector: s.sector ?? null,
    })),
    ...store.rwas.map((r) => ({
      slug: r.slug,
      name: r.name,
      symbol: r.symbol,
      category: "RWA" as const,
      coinType: null,
      entitySlug: r.entitySlug ?? null,
      sector: null,
    })),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const receipts: PickerReceipt[] = store.receipts
    .map((r) => ({
      slug: r.slug,
      name: r.name,
      symbol: r.symbol,
      receiptType: r.receiptType,
      entitySlug: r.entitySlug,
      baseAsset: r.baseAsset ?? null,
      sector: r.sector ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <AdminPanel
      adminEmail={admin.email}
      networks={networks}
      coins={coins}
      receipts={receipts}
      orgOptions={orgOptions}
    />
  );
}
