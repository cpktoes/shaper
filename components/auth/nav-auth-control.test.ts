import { compile } from "@tailwindcss/node";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Source-and-compiled-stylesheet contract for the account controls Phase 10 makes finger-sized
 * (D-05/D-06) — the same idiom `components/rails/view-full-sized-dialog.test.ts`/`.css.test.ts`
 * already use for a control this project cannot render in a browser.
 *
 * This is the ONLY automated proof for the Sign-in row's growth and Clerk's avatar prop — not an
 * addition to `e2e/phone-account.spec.ts`'s own coverage, a replacement for it. Empirically
 * confirmed at execution time (2026-09-10): under this suite's deliberately fake Clerk keys
 * (`playwright.config.ts`'s own header comment), `useUser().isLoaded` never settles `true` —
 * confirmed by polling the account slot's DOM for over 20 seconds, well past this suite's own
 * assertion timeouts. That gates BOTH of these out of the browser suite at once:
 *   - `NavAuthControl`'s signed-out "Sign in" row (D-06) — never renders; the component is stuck
 *     on its loading-placeholder branch the whole run.
 *   - Clerk's `<UserButton />` avatar (D-05) — never renders, for the same reason, and never
 *     would even if it did (no real Clerk instance is reachable from this test's fake key).
 * `e2e/phone-account.spec.ts` measures the one state that IS reachable in a browser — the loading
 * placeholder, which renders unconditionally while `isLoaded` is false — and defers the rest to
 * this file, plus the founder's real-device pass in the end-of-phase sweep.
 *
 * PHON-07's sign-in banner (`SignInBanner`) is gated behind the exact same `if (!isLoaded) return
 * null;` line, so it never appears on a `/design/*` route in this suite either — confirmed by
 * navigating there with no dismissal at all and polling for its copy for over 20 seconds. Its
 * dismiss-button contract lives here too, in the one Vitest file this plan is allowed to create,
 * rather than in a second new file — the reason is identical to the two components above.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const NAV_PATH = "components/auth/nav-auth-control.tsx";
const BANNER_PATH = "components/auth/sign-in-banner.tsx";
const GLOBALS_CSS_PATH = path.join(REPO_ROOT, "app/globals.css");
const GLOBALS_CSS_SOURCE = readFileSync(GLOBALS_CSS_PATH, "utf8");
const GLOBALS_CSS_BASE = path.dirname(GLOBALS_CSS_PATH);

/** Strips `//` line comments and `/* *\/` block comments — the same helper
 * `components/rails/view-full-sized-dialog.test.ts` copies from `lib/units-isolation.test.ts`. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

function readStripped(relativePath: string): string {
  return stripComments(readFileSync(path.join(REPO_ROOT, relativePath), "utf8"));
}

/** Slices from the nearest `<tagName` before `anchor` to the following `>`, so a case can assert
 * one element's own className without the whole file's text as a search space. */
function tagAround(source: string, anchor: string, tagName: string): string {
  const anchorIndex = source.indexOf(anchor);
  expect(anchorIndex, `anchor "${anchor}" not found in source`).toBeGreaterThanOrEqual(0);
  const tagStart = source.lastIndexOf(`<${tagName}`, anchorIndex);
  expect(tagStart, `no <${tagName} found before "${anchor}"`).toBeGreaterThanOrEqual(0);
  const tagEnd = source.indexOf(">", anchorIndex);
  return source.slice(tagStart, tagEnd + 1);
}

/** Compiles `app/globals.css` fresh (no candidates carried over between cases) and builds exactly
 * the given candidate class names, returning the emitted CSS text. */
async function compileCandidates(candidates: string[]): Promise<string> {
  const compiler = await compile(GLOBALS_CSS_SOURCE, { base: GLOBALS_CSS_BASE, onDependency: () => {} });
  return compiler.build(candidates);
}

describe("nav-auth-control.tsx — source contract", () => {
  it("D-06: the signed-out Sign in button carries all three coarse row-growth tokens and keeps text-sm", () => {
    const source = readStripped(NAV_PATH);
    const buttonTag = tagAround(source, "setDialogOpen(true)", "button");
    expect(buttonTag, "missing coarse:flex").toContain("coarse:flex");
    expect(buttonTag, "missing coarse:min-h-11").toContain("coarse:min-h-11");
    expect(buttonTag, "missing coarse:items-center").toContain("coarse:items-center");
    expect(buttonTag, "the word's own text-sm size was changed").toContain("text-sm");
  });

  it("the loading placeholder claims the same footprint as the grown row/avatar under a coarse pointer", () => {
    const source = readStripped(NAV_PATH);
    const placeholderTag = tagAround(source, 'aria-hidden className="block', "span");
    expect(placeholderTag, "missing the resting size-7").toContain("size-7");
    expect(placeholderTag, "missing coarse:size-11").toContain("coarse:size-11");
  });

  it("D-05: the signed-in branch returns Clerk's button directly, with no wrapper, carrying the coarse padding class", () => {
    const source = readStripped(NAV_PATH);
    // No element (a <div>, a <span>, anything) may sit between `return` and `<UserButton` — a
    // wrapper would insert its own opening tag there and this regex would stop matching.
    expect(
      source,
      "the signed-in branch does not return <UserButton /> directly — a wrapper may have been introduced",
    ).toMatch(/if\s*\(isSignedIn\)\s*\{\s*[\s\S]{0,400}?return\s*<UserButton\b/);
    expect(source, "missing appearance.elements.userButtonTrigger").toMatch(
      /appearance=\{\{\s*elements:\s*\{\s*userButtonTrigger:\s*["']coarse:p-2["']/,
    );
  });

  it("carries no credential handling of its own — the only value handed to Clerk is a class name", () => {
    const source = readStripped(NAV_PATH);
    // Built from parts so this assertion's own text can never match itself.
    const tokenNeedle = ["sess", "ionToken"].join("");
    const emailNeedle = ["ema", "il"].join("");
    const useridNeedle = ["user", "Id"].join("");
    expect(source, `names ${tokenNeedle}`).not.toContain(tokenNeedle);
    expect(source, `names ${emailNeedle}`).not.toContain(emailNeedle);
    expect(source, `reads a raw ${useridNeedle}`).not.toContain(useridNeedle);
    // The only string literal reaching the `elements` prop is the padding class.
    expect(source, "appearance prop carries something other than the padding class").toMatch(
      /userButtonTrigger:\s*"coarse:p-2"\s*\}\s*\}\}/,
    );
  });
});

describe("sign-in-banner.tsx — source contract (PHON-07)", () => {
  it("the dismiss button is a fixed square that grows under a coarse pointer, overflowing the row instead of stretching it", () => {
    const source = readStripped(BANNER_PATH);
    const dismissTag = tagAround(source, 'aria-label="Dismiss"', "button");
    for (const token of ["flex", "size-8", "coarse:size-11", "shrink-0", "items-center", "justify-center"]) {
      expect(dismissTag, `missing ${token}`).toContain(token);
    }
    // The overflow margins that keep the banner at 36px regardless of the square's own size.
    expect(dismissTag, "missing the resting -my-1.5 overflow margin").toContain("-my-1.5");
    expect(dismissTag, "missing the coarse:-my-3 overflow margin").toContain("coarse:-my-3");
  });

  it("the XIcon inside the dismiss button keeps its 16px size-4 — the icon stays put, the square grows", () => {
    const source = readStripped(BANNER_PATH);
    const dismissIndex = source.indexOf('aria-label="Dismiss"');
    const iconIndex = source.indexOf("<XIcon", dismissIndex);
    const iconTagEnd = source.indexOf(">", iconIndex);
    const iconTag = source.slice(iconIndex, iconTagEnd + 1);
    expect(iconTag, "XIcon lost its size-4").toContain("size-4");
  });
});

describe("compiled-CSS proof — every coarse: candidate above actually compiles (not silently dropped)", () => {
  it("D-05/D-06: the avatar padding, placeholder square and Sign-in row-growth candidates all emit a pointer:coarse rule with a real declaration", async () => {
    const css = await compileCandidates([
      "coarse:p-2",
      "coarse:size-11",
      "coarse:min-h-11",
      "coarse:flex",
      "coarse:items-center",
    ]);
    expect(css, "no pointer: coarse media condition found").toMatch(/@media\s*\(pointer:\s*coarse\)/);
    expect(css, "no padding declaration found for coarse:p-2").toMatch(/padding:/);
    // Tailwind's spacing-variable form (`calc(var(--spacing) * 11)`) or a plain rem value — either
    // is acceptable proof that size-11/min-h-11 emitted a real height, not nothing.
    expect(css, "no height/min-height declaration found for coarse:size-11 / coarse:min-h-11").toMatch(
      /(min-)?height:\s*(calc\(var\(--spacing\)[^;]*\)|[\d.]+rem)/,
    );
  });

  it("PHON-07: the banner's coarse square and overflow-margin candidates all emit a pointer:coarse rule with a real declaration", async () => {
    const css = await compileCandidates(["size-8", "coarse:size-11", "-my-1.5", "coarse:-my-3"]);
    expect(css, "no pointer: coarse media condition found").toMatch(/@media\s*\(pointer:\s*coarse\)/);
    expect(css, "no width/height declaration found for size-8/coarse:size-11").toMatch(
      /(min-)?(width|height):\s*(calc\(var\(--spacing\)[^;]*\)|-?[\d.]+rem)/,
    );
    // Tailwind emits negative -my-N as margin-block (or margin-top+margin-bottom) with a negative
    // calc() — tolerant of either form, per the same house rule the CSS-compile pattern uses.
    expect(css, "no margin declaration found for -my-1.5 / coarse:-my-3").toMatch(
      /margin(-block|-top|-bottom)?:\s*calc\(var\(--spacing\)[^;]*-[^;]*\)/,
    );
  });
});
