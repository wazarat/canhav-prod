import type { ReactNode } from "react";

import { GlossaryTooltip } from "@/components/networks/research/callouts/GlossaryTooltip";
import { CREDIT_GLOSSARY, glossaryTermRegex } from "@/lib/glossary";
import { INLINE_LINK_RE } from "@/lib/text";

/**
 * Server-safe renderer for prose stored with markdown `[text](url)` links
 * (M5 Research dataset: thesis, FAQ answers, org intros, funding notes).
 * No markdown library: links only, everything else is plain text.
 *
 * With `glossary`, the first occurrence of each credit-glossary term in the
 * plain-text segments gets a GlossaryTooltip (never inside link text).
 */
export function InlineLinkText({
  text,
  glossary = false,
  className,
}: {
  text: string;
  glossary?: boolean;
  className?: string;
}) {
  const glossaryTerms = glossary
    ? Object.keys(CREDIT_GLOSSARY).sort((a, b) => b.length - a.length)
    : [];
  const usedTerms = new Set<string>();

  function renderPlain(segment: string, keyBase: string): ReactNode[] {
    for (const term of glossaryTerms) {
      if (usedTerms.has(CREDIT_GLOSSARY[term])) continue; // spelling variants share a definition
      const match = segment.match(glossaryTermRegex(term));
      if (match?.index === undefined) continue;
      usedTerms.add(CREDIT_GLOSSARY[term]);
      const before = segment.slice(0, match.index);
      const after = segment.slice(match.index + match[0].length);
      return [
        ...(before ? renderPlain(before, `${keyBase}b`) : []),
        <GlossaryTooltip key={`${keyBase}g`} term={term}>
          {match[0]}
        </GlossaryTooltip>,
        ...(after ? renderPlain(after, `${keyBase}a`) : []),
      ];
    }
    return [segment];
  }

  const parts: ReactNode[] = [];
  let last = 0;
  let i = 0;
  INLINE_LINK_RE.lastIndex = 0;
  for (const m of text.matchAll(INLINE_LINK_RE)) {
    const index = m.index ?? 0;
    if (index > last) parts.push(...renderPlain(text.slice(last, index), `t${i}`));
    parts.push(
      <a
        key={`l${i++}`}
        href={m[2]}
        target="_blank"
        rel="noreferrer"
        className="text-electric-400 hover:underline"
      >
        {m[1]}
      </a>,
    );
    last = index + m[0].length;
  }
  if (last < text.length) parts.push(...renderPlain(text.slice(last), `t${i}`));

  return <span className={className}>{parts}</span>;
}
