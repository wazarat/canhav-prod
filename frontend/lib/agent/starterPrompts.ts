/**
 * Contextual starter prompts for the research chat surfaces (Research Chat
 * Phase 1). Pure and client-safe: no server imports, just string assembly.
 *
 * The prompts are written to exercise the sourced research tools
 * (research_compare / research_getRisks / research_getAssetCoverage /
 * research_whatChanged) so first-time users see comparative, cited answers
 * instead of single-fact lookups.
 */

export interface StarterPromptContext {
  /** Display name of the entity the chat is scoped to (e.g. "Aave"). */
  entityName?: string | null;
  /** Primary taxonomy tags for the entity (e.g. ["Lending"]). */
  tags?: string[] | null;
}

/** Generic set shown when the chat has no entity context. */
const GENERIC_PROMPTS = [
  "Which Lending protocol has the best risk-adjusted yield right now?",
  "Compare the Fixed Income protocols by TVL and risk profile.",
  "What changed in USDC's peg over the last 7 days?",
];

/** Max prompts rendered as chips (keeps the empty state uncluttered). */
const MAX_PROMPTS = 3;

export function buildStarterPrompts(ctx: StarterPromptContext = {}): string[] {
  const name = ctx.entityName?.trim();
  if (!name) return [...GENERIC_PROMPTS];

  const tag = ctx.tags?.[0]?.trim();
  const prompts = tag
    ? [
        `Compare ${name}'s headline metrics and risk profile against other ${tag} entities.`,
        `What are ${name}'s highest-severity risks, and how are they mitigated?`,
        `Which assets does ${name} cover, and are any of them flagged?`,
      ]
    : [
        `Summarize ${name} and where it sits among its competitors.`,
        `What are ${name}'s highest-severity risks, and how are they mitigated?`,
        `Who are ${name}'s partners, and what do the partnerships involve?`,
      ];
  return prompts.slice(0, MAX_PROMPTS);
}
