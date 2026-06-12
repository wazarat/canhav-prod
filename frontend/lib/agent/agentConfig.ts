/**
 * Per-agent "framework" configuration — the owner-tunable layer that shapes HOW
 * an agent thinks for its entity: focus areas, freeform instructions, risk lens,
 * output style, preferred sources, and a personal glossary.
 *
 * Shared (types + sanitizer + prompt rendering) between the storage layer
 * (lib/agent/memory.ts), the owner-only PATCH route, and the chat loop's system
 * prompt builder. Everything is bounded so the system prompt stays deterministic
 * and cannot be blown up by a hostile/huge config.
 */

export const RISK_LENSES = ["neutral", "conservative", "aggressive"] as const;
export type AgentRiskLens = (typeof RISK_LENSES)[number];

export const OUTPUT_STYLES = ["brief", "detailed", "bullet", "analyst-report"] as const;
export type AgentOutputStyle = (typeof OUTPUT_STYLES)[number];

export interface AgentGlossaryEntry {
  term: string;
  definition: string;
}

export interface AgentConfig {
  /** e.g. ["peg stability", "yield mechanics", "smart-contract risk"] */
  focusAreas: string[];
  /** Freeform system-prompt addendum (the owner's framework). */
  instructions: string;
  riskLens: AgentRiskLens;
  outputStyle: AgentOutputStyle;
  /** Source labels the agent should prefer to cite. */
  preferredSources: string[];
  /** Owner vocabulary the agent should adopt. */
  glossary: AgentGlossaryEntry[];
}

/** Hard caps that keep the rendered prompt block bounded. */
export const AGENT_CONFIG_LIMITS = {
  instructionsMaxChars: 2000,
  focusAreasMax: 8,
  focusAreaMaxChars: 60,
  preferredSourcesMax: 8,
  preferredSourceMaxChars: 80,
  glossaryMax: 12,
  glossaryTermMaxChars: 40,
  glossaryDefinitionMaxChars: 200,
} as const;

export function defaultAgentConfig(): AgentConfig {
  return {
    focusAreas: [],
    instructions: "",
    riskLens: "neutral",
    outputStyle: "brief",
    preferredSources: [],
    glossary: [],
  };
}

function clampString(value: unknown, maxChars: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxChars);
}

function clampStringList(value: unknown, maxItems: number, maxChars: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const s = clampString(item, maxChars);
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
    if (out.length >= maxItems) break;
  }
  return out;
}

/**
 * Coerce arbitrary input into a valid, bounded AgentConfig. Used by both the
 * PATCH route (untrusted body) and `normalizeProfile` (legacy stored shapes),
 * so a config read from storage is always safe to render into the prompt.
 */
export function sanitizeAgentConfig(input: unknown): AgentConfig {
  const cfg = (input ?? {}) as Partial<Record<keyof AgentConfig, unknown>>;
  const L = AGENT_CONFIG_LIMITS;

  const riskLens = RISK_LENSES.includes(cfg.riskLens as AgentRiskLens)
    ? (cfg.riskLens as AgentRiskLens)
    : "neutral";
  const outputStyle = OUTPUT_STYLES.includes(cfg.outputStyle as AgentOutputStyle)
    ? (cfg.outputStyle as AgentOutputStyle)
    : "brief";

  const glossary: AgentGlossaryEntry[] = [];
  if (Array.isArray(cfg.glossary)) {
    for (const row of cfg.glossary) {
      const term = clampString((row as AgentGlossaryEntry)?.term, L.glossaryTermMaxChars);
      const definition = clampString(
        (row as AgentGlossaryEntry)?.definition,
        L.glossaryDefinitionMaxChars,
      );
      if (!term || !definition) continue;
      glossary.push({ term, definition });
      if (glossary.length >= L.glossaryMax) break;
    }
  }

  return {
    focusAreas: clampStringList(cfg.focusAreas, L.focusAreasMax, L.focusAreaMaxChars),
    instructions: clampString(cfg.instructions, L.instructionsMaxChars),
    riskLens,
    outputStyle,
    preferredSources: clampStringList(
      cfg.preferredSources,
      L.preferredSourcesMax,
      L.preferredSourceMaxChars,
    ),
    glossary,
  };
}

/** True when the config differs from the untouched default (worth rendering). */
export function hasMeaningfulConfig(config: AgentConfig | null | undefined): boolean {
  if (!config) return false;
  return (
    config.focusAreas.length > 0 ||
    config.instructions.length > 0 ||
    config.riskLens !== "neutral" ||
    config.outputStyle !== "brief" ||
    config.preferredSources.length > 0 ||
    config.glossary.length > 0
  );
}

const RISK_LENS_PROMPT: Record<AgentRiskLens, string> = {
  neutral: "Weigh upside and downside evenly; state risks factually without alarmism.",
  conservative:
    "Lead with risks, failure modes, and downside scenarios before any positives. Flag stale or unverified data prominently.",
  aggressive:
    "Lead with opportunities and growth signals, but still disclose material risks at the end.",
};

const OUTPUT_STYLE_PROMPT: Record<AgentOutputStyle, string> = {
  brief: "Keep answers tight: a few sentences or a short list. No headings.",
  detailed: "Give thorough, well-structured answers with context and caveats.",
  bullet: "Answer almost entirely in concise bullet points.",
  "analyst-report":
    "Structure answers like a desk note: one-line takeaway, key data points, risks, and a bottom line.",
};

/**
 * Render the owner's framework as a bounded system-prompt block. Returns ""
 * when the config is default/empty so the base prompt stays unchanged.
 */
export function renderAgentConfigPrompt(config: AgentConfig | null | undefined): string {
  if (!hasMeaningfulConfig(config)) return "";
  const cfg = config as AgentConfig;
  const lines: string[] = ["\n\n--- Owner framework (how this agent should think) ---"];
  if (cfg.focusAreas.length) {
    lines.push(`Focus areas (prioritize these themes): ${cfg.focusAreas.join("; ")}.`);
  }
  lines.push(`Risk lens: ${RISK_LENS_PROMPT[cfg.riskLens]}`);
  lines.push(`Output style: ${OUTPUT_STYLE_PROMPT[cfg.outputStyle]}`);
  if (cfg.preferredSources.length) {
    lines.push(
      `Preferred sources: when multiple sources cover a fact, prefer citing ${cfg.preferredSources.join(", ")}.`,
    );
  }
  if (cfg.glossary.length) {
    lines.push("Owner glossary (use these definitions):");
    for (const g of cfg.glossary) lines.push(`- ${g.term}: ${g.definition}`);
  }
  if (cfg.instructions) {
    lines.push(`Owner instructions:\n${cfg.instructions}`);
  }
  return lines.join("\n");
}
