import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";

import { ReceiptTypeBadge } from "@/components/shared/ReceiptTypeBadge";
import { StatCard } from "@/components/ui/StatCard";
import { getApprovedNetworkBySlug, getReceiptBySlug } from "@/lib/data";
import { formatPct, formatUsdCompact } from "@/lib/utils";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const profile = await getReceiptBySlug(params.slug);
  return { title: profile ? `${profile.symbol} — Receipt` : "Receipt not found" };
}

export default async function ReceiptDetailPage({ params }: { params: { slug: string } }) {
  const profile = await getReceiptBySlug(params.slug);
  if (!profile) notFound();

  const entity = profile.entitySlug
    ? await getApprovedNetworkBySlug(profile.entitySlug)
    : null;

  return (
    <div className="container space-y-8 py-12">
      <nav className="flex items-center gap-1.5 text-sm text-ink-300">
        <Link href="/" className="transition-colors hover:text-ink-50">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <Link href="/receipts" className="transition-colors hover:text-ink-50">
          Receipt Tokens
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <span className="text-ink-100">{profile.symbol}</span>
      </nav>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-50">
            {profile.name}
          </h1>
          <ReceiptTypeBadge receiptType={profile.receiptType} />
        </div>
        <p className="max-w-2xl text-sm text-ink-300">{profile.description}</p>
        {entity && (
          <Link
            href={`/networks/${entity.slug}`}
            className="text-sm text-electric-400 hover:underline"
          >
            Parent network: {entity.name}
          </Link>
        )}
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Underlying TVL"
          value={formatUsdCompact(profile.underlyingTvlUsd ?? profile.aumUsd ?? null)}
        />
        <StatCard label="APR" value={profile.apr != null ? formatPct(profile.apr) : "—"} />
        <StatCard
          label="Exchange rate"
          value={
            profile.exchangeRateVsBase != null
              ? profile.exchangeRateVsBase.toFixed(4)
              : "—"
          }
        />
        <StatCard
          label="Price"
          value={
            profile.priceUsd != null
              ? `$${profile.priceUsd.toLocaleString(undefined, { maximumFractionDigits: 4 })}`
              : profile.receiptType === "LendingReceipt"
                ? "N/A"
                : "—"
          }
        />
      </section>
    </div>
  );
}
