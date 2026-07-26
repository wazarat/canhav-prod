import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { CollapsibleSection } from "@/components/networks/research/CollapsibleSection";
import { InlineLinkText } from "@/components/shared/InlineLinkText";
import { splitParagraphs } from "@/lib/text";
import type { FaqItem } from "@/lib/types";

/**
 * #faq — native details/summary FAQ (pinned items first and open), with
 * answers rendered through InlineLinkText so every answer's source links
 * (CAN-67: each answer carries at least one) are clickable.
 */
export function FaqSection({ faq }: { faq: FaqItem[] }) {
  if (!faq.length) return null;
  const ordered = [...faq].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));

  return (
    <CollapsibleSection id="faq" title="FAQ" count={faq.length}>
      <div className="space-y-2">
        {ordered.map((f) => (
          <details
            key={f.question}
            open={f.pinned}
            className="group/faq glass rounded-xl border border-ink-700/60"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-ink-50">{f.question}</span>
                {f.pinned && <Badge tone="signal">Key</Badge>}
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-open/faq:rotate-180" />
            </summary>
            <div className="space-y-2 border-t border-ink-800/60 px-5 pb-4 pt-3">
              {splitParagraphs(f.answer).map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-ink-300">
                  <InlineLinkText text={p} glossary />
                </p>
              ))}
            </div>
          </details>
        ))}
      </div>
    </CollapsibleSection>
  );
}
