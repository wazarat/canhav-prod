"use client";

import type { ReactNode } from "react";

import { Tooltip } from "@/components/ui/Tooltip";
import { CREDIT_GLOSSARY } from "@/lib/glossary";

/**
 * Credit-term hover definition (CAN-63 callout #5). Wraps the shared Tooltip
 * primitive with a dotted-underline trigger. Falls back to plain text when the
 * term has no glossary entry, so callers never have to pre-check.
 */
export function GlossaryTooltip({ term, children }: { term: string; children?: ReactNode }) {
  const definition =
    CREDIT_GLOSSARY[term] ??
    CREDIT_GLOSSARY[term.toLowerCase()] ??
    Object.entries(CREDIT_GLOSSARY).find(([k]) => k.toLowerCase() === term.toLowerCase())?.[1];
  if (!definition) return <>{children ?? term}</>;
  return (
    <Tooltip content={definition}>
      <span className="cursor-help underline decoration-ink-500 decoration-dotted underline-offset-2">
        {children ?? term}
      </span>
    </Tooltip>
  );
}
