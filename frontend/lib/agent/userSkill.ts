import type {
  AgentSkillAction,
  AgentSkillFact,
  AgentSkillSection,
  SourceRef,
} from "@/lib/types";

/**
 * User-authored skill validation + file import.
 *
 * Pure (client- and server-safe) helpers — no server-only imports. A user skill
 * is the editable subset of an AgentSkill; the store layer wraps it with id /
 * author / timestamps. The only hard guardrail enforced here is #5:
 * user-authored actions may ONLY be read-only research actions.
 */

export interface SkillDraft {
  title: string;
  summary: string;
  facts: AgentSkillFact[];
  sections: AgentSkillSection[];
  actions: AgentSkillAction[];
  sources: SourceRef[];
  glossary?: { term: string; definition: string }[];
}

export type ValidationResult = { ok: true } | { ok: false; errors: string[] };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validate a user-authored skill draft. Rejects:
 *  - any action that is not explicitly `readOnly` (guardrail #5: research-only),
 *  - an empty title or summary,
 *  - empty sources (quality bar: every skill must cite something).
 */
export function validateUserSkill(input: Partial<SkillDraft> | null | undefined): ValidationResult {
  const errors: string[] = [];
  if (!input || typeof input !== "object") {
    return { ok: false, errors: ["Skill payload is missing or not an object."] };
  }

  if (!isNonEmptyString(input.title)) errors.push("Title is required.");
  if (!isNonEmptyString(input.summary)) errors.push("Summary is required.");

  const sources = Array.isArray(input.sources) ? input.sources : [];
  const validSources = sources.filter((s) => isNonEmptyString(s?.label) && isNonEmptyString(s?.url));
  if (validSources.length === 0) {
    errors.push("At least one source (label + url) is required.");
  }

  const actions = Array.isArray(input.actions) ? input.actions : [];
  for (const [i, action] of actions.entries()) {
    if (!action || typeof action !== "object") {
      errors.push(`Action ${i + 1} is malformed.`);
      continue;
    }
    if (action.readOnly !== true) {
      errors.push(
        `Action "${action.name || i + 1}" must be a read-only research action (readOnly: true).`,
      );
    }
    if (!isNonEmptyString(action.name)) {
      errors.push(`Action ${i + 1} needs a name.`);
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}

/** Coerce arbitrary parsed JSON into a normalized SkillDraft (defaults applied). */
export function normalizeDraft(input: Partial<SkillDraft>): SkillDraft {
  return {
    title: (input.title ?? "").trim(),
    summary: (input.summary ?? "").trim(),
    facts: (Array.isArray(input.facts) ? input.facts : [])
      .filter((f) => isNonEmptyString(f?.key))
      .map((f) => ({ key: f.key.trim(), value: (f.value ?? "").trim() })),
    sections: (Array.isArray(input.sections) ? input.sections : [])
      .filter((s) => isNonEmptyString(s?.heading))
      .map((s) => ({ heading: s.heading.trim(), body: (s.body ?? "").trim() })),
    actions: (Array.isArray(input.actions) ? input.actions : []).map((a) => ({
      name: (a?.name ?? "").trim(),
      description: (a?.description ?? "").trim(),
      signature: (a?.signature ?? "").trim(),
      // Default to read-only; explicit non-read-only actions are rejected by the validator.
      readOnly: a?.readOnly !== false,
    })),
    sources: (Array.isArray(input.sources) ? input.sources : [])
      .filter((s) => isNonEmptyString(s?.url))
      .map((s) => ({ label: (s.label ?? s.url).trim(), url: s.url.trim() })),
    glossary: Array.isArray(input.glossary)
      ? input.glossary
          .filter((g) => isNonEmptyString(g?.term))
          .map((g) => ({ term: g.term.trim(), definition: (g.definition ?? "").trim() }))
      : undefined,
  };
}

export type ParseResult =
  | { ok: true; draft: SkillDraft }
  | { ok: false; errors: string[] };

/**
 * Parse an imported skill "file" — either the skill JSON (an AgentSkill/UserSkill
 * shape) or a Markdown export produced by `skillToMarkdown`. Returns a normalized
 * draft; callers still run {@link validateUserSkill} on the result.
 */
export function parseSkillFile(text: string): ParseResult {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return { ok: false, errors: ["The file is empty."] };

  // JSON first (handles both bare drafts and full skills).
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Partial<SkillDraft>;
      return { ok: true, draft: normalizeDraft(parsed) };
    } catch {
      return { ok: false, errors: ["The file looks like JSON but could not be parsed."] };
    }
  }

  // Otherwise treat it as a Markdown skill export.
  return { ok: true, draft: parseSkillMarkdown(trimmed) };
}

/** Reverse of `skillToMarkdown`: tolerant Markdown -> SkillDraft parser. */
function parseSkillMarkdown(md: string): SkillDraft {
  const lines = md.split(/\r?\n/);
  const draft: SkillDraft = {
    title: "",
    summary: "",
    facts: [],
    sections: [],
    actions: [],
    sources: [],
    glossary: [],
  };

  type Region = "none" | "facts" | "sections" | "actions" | "glossary" | "sources";
  let region: Region = "none";
  let currentSection: AgentSkillSection | null = null;
  let pendingAction: AgentSkillAction | null = null;

  const flushSection = () => {
    if (currentSection) {
      currentSection.body = currentSection.body.trim();
      draft.sections.push(currentSection);
      currentSection = null;
    }
  };
  const flushAction = () => {
    if (pendingAction) {
      draft.actions.push(pendingAction);
      pendingAction = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith("# ")) {
      draft.title = trimmed.slice(2).trim();
      continue;
    }
    if (trimmed.startsWith("> ") && !draft.summary) {
      draft.summary = trimmed.slice(2).trim();
      continue;
    }

    // Section headers switch regions.
    const h2 = trimmed.match(/^##\s+(.+)$/);
    if (h2) {
      flushSection();
      flushAction();
      const name = h2[1].trim().toLowerCase();
      region =
        name === "facts"
          ? "facts"
          : name === "sections"
            ? "sections"
            : name === "actions"
              ? "actions"
              : name === "glossary"
                ? "glossary"
                : name === "sources"
                  ? "sources"
                  : "none";
      continue;
    }

    if (region === "facts") {
      const m = trimmed.match(/^-\s+\*\*(.+?):\*\*\s*(.*)$/);
      if (m) draft.facts.push({ key: m[1].trim(), value: m[2].trim() });
      continue;
    }

    if (region === "sections") {
      const h3 = trimmed.match(/^###\s+(.+)$/);
      if (h3) {
        flushSection();
        currentSection = { heading: h3[1].trim(), body: "" };
        continue;
      }
      if (currentSection) currentSection.body += `${raw}\n`;
      continue;
    }

    if (region === "actions") {
      const m = trimmed.match(/^-\s+\*\*(.+?)\*\*\s*\((.+?)\):\s*(.*)$/);
      if (m) {
        flushAction();
        pendingAction = {
          name: m[1].trim(),
          description: m[3].trim(),
          signature: "",
          readOnly: !/write/i.test(m[2]),
        };
        continue;
      }
      const sig = trimmed.match(/^`(.+)`$/);
      if (sig && pendingAction) pendingAction.signature = sig[1].trim();
      continue;
    }

    if (region === "glossary") {
      const m = trimmed.match(/^-\s+\*\*(.+?):\*\*\s*(.*)$/);
      if (m) draft.glossary!.push({ term: m[1].trim(), definition: m[2].trim() });
      continue;
    }

    if (region === "sources") {
      const m = trimmed.match(/^-\s+\[(.+?)\]\((.+?)\)/);
      if (m) draft.sources.push({ label: m[1].trim(), url: m[2].trim() });
      continue;
    }
  }
  flushSection();
  flushAction();

  if (draft.glossary && draft.glossary.length === 0) draft.glossary = undefined;
  return normalizeDraft(draft);
}
