/** Markdown inline-link helpers for prose stored with `[text](url)` links. */

export const INLINE_LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** "para1\n\npara2" -> ["para1", "para2"] */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Replace `[text](url)` with `text` — for agent skills and plain-text surfaces. */
export function stripInlineLinks(text: string): string {
  return text.replace(INLINE_LINK_RE, "$1");
}
