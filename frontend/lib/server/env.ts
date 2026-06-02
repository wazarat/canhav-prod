import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Server-only helpers for reading secrets that live in `backend/.env`.
 *
 * The frontend deliberately keeps one secrets file (backend/.env, gitignored)
 * shared with the Python scripts. These helpers are imported only by route
 * handlers / server components — never bundled into the client.
 */

/** Absolute path to the repo root (parent of the Next `frontend/` cwd). */
export function repoRoot(): string {
  return path.resolve(process.cwd(), "..");
}

export function backendEnvPath(): string {
  return path.join(repoRoot(), "backend", ".env");
}

/** Parse `backend/.env` (best-effort; returns {} if missing/unreadable). */
function parseBackendEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  let raw: string;
  try {
    raw = readFileSync(backendEnvPath(), "utf-8");
  } catch {
    return out;
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const cleaned = trimmed.startsWith("export ") ? trimmed.slice(7).trimStart() : trimmed;
    const eq = cleaned.indexOf("=");
    const key = cleaned.slice(0, eq).trim();
    let value = cleaned.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

/**
 * Read a secret, preferring the process environment (e.g. a deployment's env)
 * and falling back to `backend/.env`. Empty strings are treated as unset.
 */
export function readSecret(name: string): string | null {
  const fromProcess = process.env[name];
  if (fromProcess && fromProcess.trim() !== "") return fromProcess;
  const fromFile = parseBackendEnv()[name];
  if (fromFile && fromFile.trim() !== "") return fromFile;
  return null;
}
