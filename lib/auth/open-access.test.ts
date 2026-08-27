import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Source-reading test in the same spirit as lib/theme.test.ts: reads proxy.ts and every file
 * under app/ and asserts the source agrees with D-01 (the design tool stays fully open to
 * anonymous shapers). This is the machine-checkable form of the phase's central "no route
 * gating" decision — it fails loudly if a future edit reintroduces a `.protect()` call, which
 * would silently start redirecting signed-out shapers away from the design tool.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PROXY_PATH = join(REPO_ROOT, "proxy.ts");
const DEPRECATED_MIDDLEWARE_PATH = join(REPO_ROOT, "middleware.ts");
const APP_DIR = join(REPO_ROOT, "app");

/** Every .ts/.tsx file under a directory, recursing into subdirectories. */
function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Strips `//` line comments and `/* *\/` block comments so a mention of `.protect(` inside a
 * doc-comment (like the ones in this very file, or in proxy.ts explaining what NOT to do)
 * doesn't false-positive the assertion below.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

describe("open access (D-01)", () => {
  it("has a proxy.ts at the current Next.js file-convention name", () => {
    expect(existsSync(PROXY_PATH)).toBe(true);
  });

  it("has no file at the deprecated middleware.ts name", () => {
    expect(existsSync(DEPRECATED_MIDDLEWARE_PATH)).toBe(false);
  });

  it("runs clerkMiddleware() in proxy.ts", () => {
    const source = readFileSync(PROXY_PATH, "utf8");
    expect(source).toMatch(/clerkMiddleware\s*\(/);
  });

  it("never calls Clerk's route-guard method anywhere in proxy.ts or app/", () => {
    const files = [PROXY_PATH, ...(statSync(APP_DIR, { throwIfNoEntry: false }) ? collectSourceFiles(APP_DIR) : [])];
    const offenders: string[] = [];
    for (const file of files) {
      const stripped = stripComments(readFileSync(file, "utf8"));
      if (/\.protect\s*\(/.test(stripped)) {
        offenders.push(file);
      }
    }
    expect(offenders, `Found .protect() calls in: ${offenders.join(", ")}`).toEqual([]);
  });
});
