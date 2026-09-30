import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PRIVACY_ROUTE } from "./copy";

/**
 * Source-reading test in the same spirit as lib/auth/open-access.test.ts (quick 260930-03d, Task
 * 2): a machine-checkable contract for the pieces the browser suite cannot prove, because either
 * they never run under Node (the lockfile pin) or Clerk never actually renders its hosted UI under
 * this suite's fake keys (the privacyPageUrl wiring).
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PACKAGE_JSON_PATH = join(REPO_ROOT, "package.json");
const PACKAGE_LOCK_PATH = join(REPO_ROOT, "package-lock.json");
const SITE_ANALYTICS_PATH = join(REPO_ROOT, "components", "site-analytics.tsx");
const LAYOUT_PATH = join(REPO_ROOT, "app", "layout.tsx");

/** The registry's integrity for @vercel/analytics@2.0.1, read with `npm view` at plan time
 * (2026-09-30) — see this quick task's PLAN.md `<interfaces>` section. */
const EXPECTED_INTEGRITY =
  "sha512-MTQG6V9qQrt1tsDeF+2Uoo5aPjqbVPys1xvnIftXSJYG2SrwXRHnqEvVoYID7BTruDz4lCd2Z7rM1BdkUehk2g==";

/** Strips `//` line comments and `/* *\/` block comments, the same idiom
 * lib/auth/open-access.test.ts uses, so a mention of a pattern inside a doc-comment never
 * false-positives an assertion below. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

describe("the @vercel/analytics pin", () => {
  it("package.json depends on exactly 2.0.1, no caret", () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8"));
    expect(pkg.dependencies["@vercel/analytics"]).toBe("2.0.1");
  });

  it("package-lock.json's installed entry has version 2.0.1 and the registry's own integrity", () => {
    const lock = JSON.parse(readFileSync(PACKAGE_LOCK_PATH, "utf8"));
    const entry = lock.packages["node_modules/@vercel/analytics"];
    expect(entry.version).toBe("2.0.1");
    expect(entry.integrity).toBe(EXPECTED_INTEGRITY);
  });
});

describe("components/site-analytics.tsx", () => {
  const stripped = stripComments(readFileSync(SITE_ANALYTICS_PATH, "utf8"));

  it("starts with the use client directive", () => {
    expect(stripped.trim().startsWith('"use client";')).toBe(true);
  });

  it("imports Analytics from @vercel/analytics/next", () => {
    expect(stripped).toContain('from "@vercel/analytics/next"');
  });

  it("renders <Analytics beforeSend={pageAddressOnlyVisit} exactly once", () => {
    const matches = stripped.match(/<Analytics beforeSend=\{pageAddressOnlyVisit\}/g) ?? [];
    expect(matches.length).toBe(1);
  });
});

describe("app/layout.tsx", () => {
  const stripped = stripComments(readFileSync(LAYOUT_PATH, "utf8"));

  it("imports SiteAnalytics and mounts it exactly once", () => {
    expect(stripped).toContain('import { SiteAnalytics } from "@/components/site-analytics"');
    const matches = stripped.match(/<SiteAnalytics/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it("never imports the analytics package directly, so the wrapper stays the one place", () => {
    expect(stripped).not.toContain('from "@vercel/analytics');
  });

  it("gives ClerkProvider privacyPageUrl: PRIVACY_ROUTE, imported from lib/privacy/copy", () => {
    expect(stripped).toContain('import { PRIVACY_ROUTE } from "@/lib/privacy/copy"');
    expect(stripped).toContain("privacyPageUrl: PRIVACY_ROUTE");
  });
});

describe("PRIVACY_ROUTE", () => {
  it("equals /privacy", () => {
    expect(PRIVACY_ROUTE).toBe("/privacy");
  });
});
