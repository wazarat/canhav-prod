import Link from "next/link";
import { ArrowUpRight, BookOpen, Bot, ChevronRight } from "lucide-react";

import { SecurityBadge } from "@/components/shared/SecurityBadge";
import { Badge } from "@/components/ui/Badge";
import type { NetworkSnapshot } from "@/lib/networks/metrics";
import {
  getNetworkTaxonomyBadges,
  isNonEvmRwa,
  secondarySectorBadgeTone,
  sectorBadgeTone,
  subSectorBadgeTone,
} from "@/lib/networkTaxonomy";
import { deriveSecurityStatus } from "@/lib/security";
import { networkLogoInitial, resolveNetworkLogoUrl } from "@/lib/networks/entityLogo";
import type { NetworkProfile } from "@/lib/types";
import { formatPct, formatUsdCompact } from "@/lib/utils";

export function NetworkAvatar({
  profile,
  size = "lg",
}: {
  profile: NetworkProfile;
  size?: "sm" | "lg";
}) {
  const logoUrl = resolveNetworkLogoUrl(profile);
  const initial = networkLogoInitial(profile.name);
  const sizeClass = size === "sm" ? "h-8 w-8 rounded-lg text-sm" : "h-14 w-14 rounded-xl text-xl";

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        className={`${sizeClass} border border-ink-700/60 object-cover`}
      />
    );
  }

  return (
    <span
      className={`grid ${sizeClass} place-items-center border border-neon-500/30 bg-neon-500/10 font-display font-semibold text-neon-400`}
    >
      {initial}
    </span>
  );
}

interface NetworkEntityHeaderProps {
  profile: NetworkProfile;
  snapshot: NetworkSnapshot;
  coinCount: number;
  /** Hide the top-right headline (TVL/price) block — the Overview tab already shows it in stat cards. */
  hideHeadline?: boolean;
}

export function NetworkEntityHeader({
  profile,
  snapshot,
  coinCount,
  hideHeadline = false,
}: NetworkEntityHeaderProps) {
  const taxonomy = getNetworkTaxonomyBadges(profile);
  const universal = profile.universalMetrics ?? null;
  const scale = profile.currentScale;

  const identifierParts = [taxonomy.primarySector, profile.subSector, profile.symbol].filter(
    Boolean,
  );
  const identifierLine = identifierParts.join(" · ");

  const price = universal?.market.priceUsd.value ?? null;
  const priceChange24h =
    universal?.market.priceChangePct.d1.value ?? snapshot.weightedChange24hPct ?? null;

  const headlineValue =
    price != null
      ? `$${price < 1 ? price.toFixed(4) : price.toFixed(2)}`
      : scale.tvlUsd != null
        ? formatUsdCompact(scale.tvlUsd)
        : snapshot.protocolTvlUsd != null
          ? formatUsdCompact(snapshot.protocolTvlUsd)
          : "—";

  const headlineLabel =
    price != null ? `${profile.symbol} price` : (profile.scaleLabels?.tvl ?? "Protocol TVL");

  const ctaClass =
    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors";
  const ctaPrimary = `${ctaClass} border-electric-500/40 bg-electric-500/10 text-electric-300 hover:bg-electric-500/20`;
  const ctaSecondary = `${ctaClass} border-ink-700 bg-ink-900/60 text-ink-200 hover:text-ink-50`;

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-1.5 text-sm text-ink-300">
        <Link href="/" className="transition-colors hover:text-ink-50">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <Link href="/networks" className="transition-colors hover:text-ink-50">
          Networks
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-500" />
        <span className="text-ink-100">{profile.name}</span>
      </nav>

      <div className="rounded-2xl border border-ink-800/60 bg-ink-900/20 p-5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 gap-4">
            <NetworkAvatar profile={profile} />
            <div className="min-w-0 space-y-2">
              <div>
                <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-50 sm:text-3xl">
                  {profile.name}
                </h1>
                {identifierLine && (
                  <p className="mt-1 text-sm text-ink-400">{identifierLine}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neon">Network</Badge>
                {taxonomy.primarySector && (
                  <Badge tone={sectorBadgeTone(taxonomy.primarySector)}>
                    {taxonomy.primarySector}
                  </Badge>
                )}
                {taxonomy.secondarySectors.map((sector) => (
                  <Badge key={sector} tone={secondarySectorBadgeTone()}>
                    {sector}
                  </Badge>
                ))}
                {taxonomy.subSectorTags.map((tag) => (
                  <Badge key={tag} tone={subSectorBadgeTone()}>
                    {tag}
                  </Badge>
                ))}
                {isNonEvmRwa(profile) && <Badge tone="warning">Non-EVM</Badge>}
                <Badge tone="neutral">{coinCount} coins</Badge>
                <SecurityBadge
                  info={deriveSecurityStatus({
                    isPubliclyAudited: profile.arbitrumPortalMetadata?.isPubliclyAudited,
                    audits: profile.audits,
                  })}
                />
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-ink-300">{profile.description}</p>
              {profile.tagline && (
                <p className="text-xs italic text-ink-400">{profile.tagline}</p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
            {!hideHeadline && (
              <div className="text-left lg:text-right">
                <p className="text-xs uppercase tracking-wide text-ink-500">{headlineLabel}</p>
                <p className="font-display text-3xl font-semibold tracking-tight text-ink-50">
                  {headlineValue}
                </p>
                {priceChange24h != null && (
                  <p
                    className={
                      priceChange24h >= 0 ? "text-sm text-emerald-400" : "text-sm text-rose-400"
                    }
                  >
                    {formatPct(priceChange24h)} 24h
                  </p>
                )}
                <p className="mt-1 text-[10px] text-ink-500">Latest data · 15 min delay</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {profile.officialDocs && (
                <a
                  href={profile.officialDocs}
                  target="_blank"
                  rel="noreferrer"
                  className={ctaPrimary}
                >
                  <BookOpen className="h-4 w-4" />
                  Official Docs
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              )}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noreferrer" className={ctaSecondary}>
                  Website
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              )}
              {profile.twitter && (
                <a href={profile.twitter} target="_blank" rel="noreferrer" className={ctaSecondary}>
                  Twitter / X
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            <Link
              href={`/agents?tab=agents&skill=${encodeURIComponent(profile.slug)}#create`}
              className={ctaPrimary}
            >
              <Bot className="h-4 w-4" />
              Create agent with {profile.name}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
