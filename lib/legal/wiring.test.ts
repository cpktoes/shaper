import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Source-reading contracts for the legal pages (quick 261006-fom), in the same idiom as
 * `lib/privacy/wiring.test.ts`: the pieces the browser suite cannot prove, because they only
 * matter on a production deploy (the files Vercel ships beside the pages) or never run under Node
 * at all (the lockfile pins).
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PACKAGE_JSON_PATH = join(REPO_ROOT, "package.json");
const PACKAGE_LOCK_PATH = join(REPO_ROOT, "package-lock.json");
const NEXT_CONFIG_PATH = join(REPO_ROOT, "next.config.ts");
const LEGAL_PAGE_PATH = join(REPO_ROOT, "components", "legal", "legal-page.tsx");

/** The registry's own integrities, read with `npm view` at plan time (2026-10-06) — see this quick
 * task's PLAN.md package legitimacy audit (T-261006-SC). */
const PINS = [
  {
    name: "react-markdown",
    version: "10.1.0",
    integrity:
      "sha512-qKxVopLT/TyA6BX3Ue5NwabOsAzm0Q7kAPwq6L+wWDwisYs7R8vZ0nRXqq6rkueboxpkjvLGU9fWifiX/ZZFxQ==",
  },
  {
    name: "remark-gfm",
    version: "4.0.1",
    integrity:
      "sha512-1quofZ2RQ9EWdeN34S79+KExV1764+wCUGop5CPL1WGdD0ocPpu91lzPGbwWMECpEpd42kJGQwzRfyov9j4yNg==",
  },
] as const;

/** Strips `//` line comments and `/* *\/` block comments, the idiom lib/privacy/wiring.test.ts
 * uses, so a mention of a pattern inside a comment never false-positives an assertion below. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

describe("the markdown packages are pinned (T-261006-SC)", () => {
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8"));
  const lock = JSON.parse(readFileSync(PACKAGE_LOCK_PATH, "utf8"));

  it.each(PINS)("package.json depends on exactly $name $version, no caret", ({ name, version }) => {
    expect(pkg.dependencies[name]).toBe(version);
  });

  it.each(PINS)("package-lock.json installs $name $version with the registry's own integrity", (pin) => {
    const entry = lock.packages[`node_modules/${pin.name}`];
    expect(entry.version).toBe(pin.version);
    expect(entry.integrity).toBe(pin.integrity);
  });
});

describe("next.config.ts ships the founder's files with the pages that read them (T-261006-05)", () => {
  const stripped = stripComments(readFileSync(NEXT_CONFIG_PATH, "utf8"));

  it("names the Terms file for /terms and the Privacy file for /privacy", () => {
    expect(stripped).toContain("outputFileTracingIncludes");
    expect(stripped).toMatch(/"\/terms":\s*\["\.\/content\/legal\/terms\.md"\]/);
    expect(stripped).toMatch(/"\/privacy":\s*\["\.\/content\/legal\/privacy\.md"\]/);
  });
});

describe("components/legal/legal-page.tsx reads the file at each visit", () => {
  const stripped = stripComments(readFileSync(LEGAL_PAGE_PATH, "utf8"));

  it("awaits connection() before it reads the document", () => {
    const connectionAt = stripped.indexOf("await connection(");
    const readAt = stripped.indexOf("readLegalDocument(", connectionAt);
    expect(connectionAt).toBeGreaterThanOrEqual(0);
    expect(readAt).toBeGreaterThan(connectionAt);
  });
});
