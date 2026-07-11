/** Store slugs: lowercase alphanumerics separated by single hyphens. */
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(s: string): boolean {
  return s.length >= 2 && s.length <= 64 && SLUG_RE.test(s);
}

/** Derive a slug candidate from a display name ("Aave Demo Token" -> "aave-demo-token"). */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
