"use client";

import Link from "next/link";

import { DriverBadge } from "@/components/networks/tabs/risks/DriverBadge";
import { RiskCard } from "@/components/shared/RiskCard";
import { Drawer } from "@/components/ui/Drawer";
import { assetEntityHref } from "@/lib/networks/assetRisk";
import type { RiskTabModel } from "@/lib/networks/riskTab";

/**
 * CAN-79 per-risk expansion panel — one drawer serves the list rows and the
 * matrix dots. Wraps the shared RiskCard (the same renderer the Asset
 * coverage drill-down uses) and adds the M7 extras: shared-driver badges,
 * cross-links into the Asset coverage segments, linked partners, and the
 * generic Metrics-tab pointer for the monitoring signal (signals are prose,
 * not metric ids — recorded deviation on CAN-79).
 */
export function RiskDetailDrawer({
  open,
  onClose,
  riskIdx,
  model,
}: {
  open: boolean;
  onClose: () => void;
  riskIdx: number | null;
  model: RiskTabModel;
}) {
  if (riskIdx == null) return null;
  const risk = model.risks[riskIdx];
  if (!risk) return null;
  const badges = model.sharedDriverBadges[riskIdx] ?? [];
  const assetLinks = model.assetLinks[riskIdx] ?? [];
  const partners = risk.linkedPartners ?? [];
  const partnersUnmatched = risk.linkedPartnersUnmatched ?? [];

  return (
    <Drawer open={open} onClose={onClose} title={risk.name ?? risk.category}>
      <div className="space-y-4 text-sm">
        <RiskCard
          risk={risk}
          headerExtra={badges.map((b) => (
            <DriverBadge key={b.label} badge={b} total={model.driverEntityTotal} />
          ))}
          footer={
            <div className="mt-3 space-y-2 border-t border-ink-800/60 pt-2">
              {assetLinks.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-ink-300">Linked assets:</span>
                  {assetLinks.map((l) => {
                    const external = assetEntityHref(l.label, model.entitySlug);
                    return (
                      <span key={l.label} className="inline-flex items-center gap-1">
                        <Link
                          href={`/networks/${model.entitySlug}?tab=asset-coverage&seg=${l.seg}`}
                          className="rounded-md border border-ink-700/80 bg-ink-900/60 px-1.5 py-0.5 font-mono text-[11px] text-ink-200 transition hover:border-electric-500/50 hover:text-electric-300"
                          title={`Open ${l.label} in the Asset coverage ${l.seg} segment`}
                        >
                          {l.label}
                        </Link>
                        {external && (
                          <Link
                            href={external}
                            className="text-[10px] text-ink-300 hover:text-electric-300"
                            title={`${l.label} issuer profile`}
                          >
                            ↗
                          </Link>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
              {(partners.length > 0 || partnersUnmatched.length > 0) && (
                <p className="text-[11px] leading-relaxed text-ink-300">
                  Counterparties: {[...partners, ...partnersUnmatched].join(", ")}
                </p>
              )}
              {risk.monitoringSignal && (
                <Link
                  href={`/networks/${model.entitySlug}?tab=metrics`}
                  className="inline-block text-[11px] text-electric-400 hover:underline"
                >
                  Watch this signal on the Metrics tab →
                </Link>
              )}
            </div>
          }
        />
        <p className="text-[11px] leading-relaxed text-ink-300">
          Severity, likelihood and impact are the dataset&apos;s own assessments
          {risk.asOf ? ` as of ${risk.asOf}` : ""}; scores derive from severity weights
          (critical 4 / high 3 / medium 2 / low 1).
        </p>
      </div>
    </Drawer>
  );
}
