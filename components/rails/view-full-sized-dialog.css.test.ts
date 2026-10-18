import { compile } from "@tailwindcss/node";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Compiled-CSS proof for the Home-Screen print note's gating (gap-closure WR-01, companion to
 * view-full-sized-dialog.test.ts's `detects the Home-Screen launch context in CSS only` and
 * `every display-mode:standalone condition carries the -webkit-touch-callout iOS guard` cases).
 *
 * Those source-contract tests only prove the class NAMES the dialog carries — they cannot prove
 * Tailwind actually turns an arbitrary variant chain like
 * `max-shell:supports-[-webkit-touch-callout:none]:[@media(display-mode:standalone)]:block` into
 * real, nested `@media`/`@supports` rules. A broken arbitrary variant (a typo in the bracket
 * syntax, an unsupported nesting order, a future Tailwind release that changes how `supports-[...]`
 * is parsed) would compile to NOTHING — no rule, no warning — and this is the only test in the
 * suite that would catch that: it runs the dialog's real class strings through the app's own
 * Tailwind pipeline (the same `app/globals.css` entry point the build uses) and asserts on the
 * emitted CSS text itself.
 *
 * `@tailwindcss/node`'s `compile()` returns a compiler whose `build()` calls accumulate candidates
 * across calls on the SAME compiler instance (verified at authoring time: building candidate A,
 * then candidate B on the same compiler, still emits A's rule in B's output) — so each case below
 * that needs an isolated candidate set calls `compile()` fresh, rather than reusing one compiler
 * for everything.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const GLOBALS_CSS_PATH = path.join(REPO_ROOT, "app/globals.css");
const GLOBALS_CSS_SOURCE = readFileSync(GLOBALS_CSS_PATH, "utf8");
const GLOBALS_CSS_BASE = path.dirname(GLOBALS_CSS_PATH);

/** Compiles `app/globals.css` fresh (no candidates carried over from any other case in this file)
 * and builds exactly the given candidate class names, returning the emitted CSS text. */
async function compileCandidates(candidates: string[]): Promise<string> {
  const compiler = await compile(GLOBALS_CSS_SOURCE, { base: GLOBALS_CSS_BASE, onDependency: () => {} });
  return compiler.build(candidates);
}

describe("view-full-sized-dialog.tsx — compiled CSS proof of the Home-Screen note gating (gap-closure WR-01)", () => {
  it("compiles the max-shell + iOS-supports + display-mode chain to nested at-rules with display:block", async () => {
    // The one chain the dialog still carries: the Home-Screen note's `:block` (quick 261017-vdh —
    // the Print button, the Fit-to-page note and the phone line used to carry `:hidden` chains of
    // their own; the founder found printing works from his phone, so nothing is hidden there now).
    const css = await compileCandidates([
      "max-shell:supports-[-webkit-touch-callout:none]:[@media(display-mode:standalone)]:block",
    ]);

    // Width condition for the phone-stack `max-shell` custom variant (app/globals.css: a single
    // width test, width < 820px — D-10, 10-SWEEP-2.md, 2026-09-11, reverting the width-and-height
    // version 10-05 tried and withdrew). Tailwind v4 emits a range media feature (`width < 820px`)
    // rather than `max-width`; tolerant of whitespace so a Tailwind formatting change alone does
    // not break this.
    expect(css, "no width<820px media condition found for max-shell:").toMatch(/@media\s*\(width\s*<\s*820px\)/);

    // The iOS-only feature-support guard — tolerant of the space @supports normally carries after
    // the colon, which Tailwind's own output omits (`-webkit-touch-callout:none`).
    expect(css, "no @supports (-webkit-touch-callout: none) rule found").toMatch(
      /@supports\s*\(-webkit-touch-callout:\s*none\)/,
    );

    // The Home-Screen launch-context media feature, same whitespace tolerance.
    expect(css, "no @media (display-mode: standalone) rule found").toMatch(
      /@media\s*\(display-mode:\s*standalone\)/,
    );

    // The declaration a broken variant chain would silently drop.
    expect(css, "no display: block declaration found").toMatch(/display:\s*block/);
  });
});
