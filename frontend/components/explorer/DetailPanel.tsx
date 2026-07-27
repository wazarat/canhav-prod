"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";

import { useModalBehavior } from "@/components/ui/useModalBehavior";
import type { ExplorerNode } from "@/lib/explorer/types";

/**
 * The synced detail panel (CAN-83). Desktop (lg+): sticky aside next to the
 * views; selection moves focus to the heading, Escape clears. Mobile: a
 * bottom sheet using useModalBehavior (the M2.5 focus-trap reuse).
 * Content is data-driven from node.detail; renderDetail overrides for
 * client-side consumers.
 */

function DetailBody({ node, renderDetail }: { node: ExplorerNode; renderDetail?: (n: ExplorerNode) => ReactNode }) {
  if (renderDetail) return <>{renderDetail(node)}</>;
  const detail = node.detail;
  if (!detail) {
    return <p className="text-xs text-ink-300">{node.summary ?? "No further detail recorded."}</p>;
  }
  return (
    <div className="space-y-4">
      {detail.subtitle && <p className="text-xs text-ink-300">{detail.subtitle}</p>}
      {detail.href && (
        <Link
          href={detail.href}
          className="inline-block rounded-full border border-electric-500/40 px-3 py-1 text-xs font-medium text-electric-300 hover:bg-electric-500/10"
        >
          Open profile
        </Link>
      )}
      {detail.sections.map((section, i) => (
        <section key={section.heading ?? i} className="space-y-1.5">
          {section.heading && (
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-ink-300">{section.heading}</h4>
          )}
          <dl className="space-y-1">
            {section.rows.map((row, j) => (
              <div key={j} className="flex items-baseline justify-between gap-3 text-xs">
                <dt className="shrink-0 text-ink-300">{row.label}</dt>
                <dd className="min-w-0 text-right text-ink-100">
                  {row.href ? (
                    <a
                      href={row.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-electric-300 underline decoration-electric-500/40 underline-offset-2 hover:text-electric-400"
                    >
                      {row.value}
                    </a>
                  ) : (
                    row.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {section.notes?.map((note, j) => (
            <p key={j} className="text-xs leading-relaxed text-ink-300">
              {note}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}

export function DetailPanel({
  node,
  onClose,
  isMobileSheet,
  renderDetail,
}: {
  node: ExplorerNode | null;
  onClose: () => void;
  /** null until mounted; true below lg. The sheet + focus trap only engage on mobile. */
  isMobileSheet: boolean | null;
  renderDetail?: (n: ExplorerNode) => ReactNode;
}) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const sheetActive = Boolean(node) && isMobileSheet === true;

  useModalBehavior({ onClose, containerRef: sheetRef, active: sheetActive });

  // Desktop: move focus to the panel heading on selection change.
  useEffect(() => {
    if (node && isMobileSheet === false) headingRef.current?.focus();
  }, [node, isMobileSheet]);

  if (!node) {
    return (
      <div className="hidden rounded-xl border border-dashed border-ink-800/60 p-4 text-xs text-ink-300 lg:block">
        Select a node to see its evidence: every relationship carries a description, a date where known, and a
        source link.
      </div>
    );
  }

  // The heading ref must exist on exactly ONE mounted copy: the sheet only
  // mounts on mobile (post-hydration), so the desktop aside owns the ref.
  const inner = (withRef: boolean) => (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3
          ref={withRef ? headingRef : undefined}
          tabIndex={-1}
          className="text-sm font-semibold text-ink-50 outline-none"
        >
          {node.detail?.title ?? node.label}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-ink-700/60 px-2 py-0.5 text-xs text-ink-300 hover:text-ink-100"
        >
          Close
        </button>
      </div>
      <div className="mt-3 max-h-[60vh] overflow-y-auto pr-1 lg:max-h-[calc(100vh-14rem)]">
        <DetailBody node={node} renderDetail={renderDetail} />
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sticky aside */}
      <div
        role="region"
        aria-label={`Detail: ${node.label}`}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        className="hidden rounded-xl border border-ink-800/60 bg-ink-900/60 p-4 lg:sticky lg:top-24 lg:block"
      >
        {inner(true)}
      </div>
      {/* Mobile bottom sheet: mounted only in mobile mode so the focus trap
          and duplicate dialog semantics never leak into desktop. */}
      {isMobileSheet === true && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-40 bg-ink-950/70" aria-hidden onClick={onClose} />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Detail: ${node.label}`}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[75vh] overflow-y-auto rounded-t-2xl border-t border-ink-700/60 bg-ink-900 p-4 pb-6"
          >
            {inner(false)}
          </div>
        </div>
      )}
    </>
  );
}
