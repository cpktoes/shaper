import { createElement } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ERROR_COPY } from "./copy";

vi.mock("@/app/fonts", () => ({
  inter: { variable: "font-inter-test" },
  geistMono: { variable: "font-mono-test" },
}));

/**
 * Source-reading contracts, using the `stripComments` idiom from `lib/privacy/wiring.test.ts`,
 * plus one server render of `app/global-error.tsx` (quick 260930-fjm, Phase 13 item 12, Task 3) —
 * the pieces the browser suite cannot prove, because forcing `app/global-error.tsx` in a browser
 * would mean putting a test switch into the root layout itself, which this plan refuses to do.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const TEST_ERROR_PAGE_PATH = join(REPO_ROOT, "app", "test-error", "page.tsx");
const PLAYWRIGHT_CONFIG_PATH = join(REPO_ROOT, "playwright.config.ts");
const PLAYWRIGHT_PROD_CONFIG_PATH = join(REPO_ROOT, "playwright.prod.config.ts");
const ERROR_SCREEN_PATH = join(REPO_ROOT, "app", "error.tsx");
const GLOBAL_ERROR_PATH = join(REPO_ROOT, "app", "global-error.tsx");
const NOT_FOUND_PATH = join(REPO_ROOT, "app", "not-found.tsx");
const SITE_NAV_PATH = join(REPO_ROOT, "components", "site-nav.tsx");
const LAYOUT_PATH = join(REPO_ROOT, "app", "layout.tsx");

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

function readStripped(path: string): string {
  return stripComments(readFileSync(path, "utf8"));
}

describe("app/test-error/page.tsx", () => {
  const stripped = readStripped(TEST_ERROR_PAGE_PATH);

  it("passes the literal process.env.NODE_ENV and reads SHAPER_FORCED_ERROR", () => {
    expect(stripped).toContain("nodeEnv: process.env.NODE_ENV");
    expect(stripped).toContain("process.env.SHAPER_FORCED_ERROR");
  });

  it("calls notFound() and forcedErrorRouteEnabled(", () => {
    expect(stripped).toContain("notFound()");
    expect(stripped).toContain("forcedErrorRouteEnabled(");
  });

  it("has no use client directive (a Server Component)", () => {
    expect(stripped).not.toMatch(/"use client"/);
  });
});

describe("playwright.config.ts / playwright.prod.config.ts", () => {
  it("playwright.config.ts sets SHAPER_FORCED_ERROR: \"1\"", () => {
    expect(readStripped(PLAYWRIGHT_CONFIG_PATH)).toContain('SHAPER_FORCED_ERROR: "1"');
  });

  it("playwright.prod.config.ts still strips the whole dev-server env block", () => {
    expect(readStripped(PLAYWRIGHT_PROD_CONFIG_PATH)).toContain("env: _fakeDevServerEnv");
  });
});

describe("app/error.tsx and app/global-error.tsx", () => {
  const errorScreen = readStripped(ERROR_SCREEN_PATH);
  const globalError = readStripped(GLOBAL_ERROR_PATH);

  it("both start with the use client directive", () => {
    expect(errorScreen.trim().startsWith('"use client";')).toBe(true);
    expect(globalError.trim().startsWith('"use client";')).toBe(true);
  });

  it("neither reads the error object's own message or stack", () => {
    expect(errorScreen).not.toMatch(/\.(message|stack)\b/);
    expect(globalError).not.toMatch(/\.(message|stack)\b/);
  });

  it("both contain retry()", () => {
    expect(errorScreen).toContain("retry()");
    expect(globalError).toContain("retry()");
  });
});

describe("app/global-error.tsx's standalone frame", () => {
  const stripped = readStripped(GLOBAL_ERROR_PATH);

  it("renders its own <html> and <body> and imports globals.css and fonts.ts", () => {
    expect(stripped).toContain("<html");
    expect(stripped).toContain("<body");
    expect(stripped).toContain('import "./globals.css"');
    expect(stripped).toContain('from "./fonts"');
  });

  it("imports nothing from next/link or @/components/design", () => {
    expect(stripped).not.toContain('from "next/link"');
    expect(stripped).not.toContain('from "@/components/design');
  });
});

describe("PhoneTabBar mounts", () => {
  it("app/error.tsx and app/not-found.tsx each contain <PhoneTabBar /> exactly once", () => {
    for (const path of [ERROR_SCREEN_PATH, NOT_FOUND_PATH]) {
      const stripped = readStripped(path);
      const matches = stripped.match(/<PhoneTabBar\s*\/>/g) ?? [];
      expect(matches.length).toBe(1);
    }
  });
});

describe("components/site-nav.tsx", () => {
  const stripped = readStripped(SITE_NAV_PATH);

  it("contains <PhoneTopBar /> with no && immediately before it", () => {
    expect(stripped).toContain("<PhoneTopBar");
    expect(stripped).not.toMatch(/&&\s*<PhoneTopBar/);
  });

  it("the desktop nav's className literal contains max-shell:hidden", () => {
    expect(stripped).toMatch(/max-shell:hidden/);
  });
});

describe("app/layout.tsx", () => {
  const stripped = readStripped(LAYOUT_PATH);

  it("reads SITE_METADATA and imports from ./fonts", () => {
    expect(stripped).toContain("metadata: Metadata = SITE_METADATA");
    expect(stripped).toContain('from "./fonts"');
  });
});

describe("GlobalError server render", () => {
  /** Decodes the HTML entities React writes for an apostrophe, a double quote and an ampersand,
   * so a comparison against ERROR_COPY's own un-encoded strings (e.g. "couldn't") matches. */
  function decodeEntities(html: string): string {
    return html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  }

  it("renders every ERROR_COPY string, a reference when given, and never the thrown message", async () => {
    const { default: GlobalError } = await import("@/app/global-error");
    const error = Object.assign(new Error("Forced test failure for the browser suite — never shown to a shaper"), {
      digest: "ref-123",
    });
    const html = decodeEntities(renderToStaticMarkup(createElement(GlobalError, { error, retry: () => {} })));

    expect(html.startsWith("<html")).toBe(true);
    expect(html).toContain('lang="en"');
    expect(html).toContain(`<title>${ERROR_COPY.documentTitle}</title>`);

    for (const value of Object.values(ERROR_COPY)) {
      if (value === ERROR_COPY.documentTitle) continue;
      expect(html).toContain(value);
    }

    expect(html).not.toContain("Forced test failure for the browser suite");
    expect(html).not.toContain("<pre");

    expect(html).toContain(`${ERROR_COPY.referenceLead}`);
    const afterLead = html.slice(html.indexOf(ERROR_COPY.referenceLead));
    expect(afterLead).toContain("ref-123");
  });

  it("omits the reference line when there's no digest", async () => {
    const { default: GlobalError } = await import("@/app/global-error");
    const error = new Error("Forced test failure for the browser suite — never shown to a shaper");
    const html = decodeEntities(renderToStaticMarkup(createElement(GlobalError, { error, retry: () => {} })));

    expect(html).not.toContain(ERROR_COPY.referenceLead);
  });
});
