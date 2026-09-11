import { compile } from "@tailwindcss/node";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Compiled-CSS proof for the phone-held-sideways layout switch (10-05, closing 10-VERIFICATION.md
 * gap 4 and 10-SWEEP.md's "a phone held sideways stays a phone" decision).
 *
 * Before this plan, `max-shell:`/`shell:` were DERIVED from one `--breakpoint-shell: 820px` token
 * in the `@theme` block — a pure width switch, and Tailwind's own machinery produced both variants
 * from it automatically. This plan replaces that token with two explicit `@custom-variant`
 * declarations in `app/globals.css`, each carrying more than one media condition (an OR on the
 * phone side, a negation on the desktop side) — something a single theme token cannot express. A
 * typo in either variant's media-condition syntax, a dropped OR branch, or a missing negation would
 * compile to the WRONG condition (or to nothing at all) with no warning from Tailwind. This is the
 * only test in the suite that would catch that: it runs the real `app/globals.css` through the
 * app's own Tailwind pipeline (`compile()` from `@tailwindcss/node`) and asserts on the emitted CSS
 * text itself, the same house pattern as `components/rails/view-full-sized-dialog.css.test.ts`.
 *
 * `@tailwindcss/node`'s `compile()` returns a compiler whose `build()` calls accumulate candidates
 * across calls on the SAME compiler instance (verified there at authoring time) — so each case
 * below that needs an isolated candidate set calls `compile()` fresh, rather than reusing one
 * compiler for everything.
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

describe("app/globals.css — the phone-held-sideways layout switch (10-05)", () => {
  it("max-shell: emits both the under-820px width rule and the coarse-and-short-height rule, each carrying the candidate's own declaration", async () => {
    const css = await compileCandidates(["max-shell:hidden"]);

    // Branch 1: the width-only condition, unchanged from before this plan (Tailwind v4 emits a
    // range media feature rather than max-width; tolerant of whitespace).
    expect(css, "no width<820px media condition found for max-shell:").toMatch(
      /@media\s*\(width\s*<\s*820px\)/,
    );

    // Branch 2: the new coarse-pointer-and-short-height condition — the OR half of "a phone held
    // sideways stays a phone" (10-SWEEP.md). 500px is fin-viewer.tsx's own existing short-screen
    // number, reused rather than reinvented.
    expect(
      css,
      "no coarse-pointer-and-short-height media condition found for max-shell:",
    ).toMatch(/@media\s*\(pointer:\s*coarse\)\s*and\s*\(height\s*<\s*500px\)/);

    // Both branches must carry the SAME declaration — a real OR, not one branch silently emitting
    // nothing. Two rules for `.max-shell\:hidden`, one per media block — matched on the candidate's
    // OWN selector rather than a bare `display: none` count, since Tailwind's preflight layer
    // emits its own unrelated `[hidden] { display: none !important; }` reset that a bare count
    // would also pick up.
    const candidateRuleCount = (
      css.match(/\.max-shell\\:hidden\s*\{\s*display:\s*none;\s*\}/g) ?? []
    ).length;
    expect(
      candidateRuleCount,
      "expected two .max-shell\\:hidden { display: none; } rules (one per media branch) — a variant compiling to a single rule or to nothing would fail this",
    ).toBe(2);
  });

  it("shell: emits exactly one media rule combining width>=820px with a negation of the coarse-and-short pair", async () => {
    const css = await compileCandidates(["shell:flex"]);

    expect(css, "no width>=820px media condition found for shell:").toMatch(
      /@media\s*\(width\s*>=\s*820px\)/,
    );

    // The negation is load-bearing (threat T-10-02): without it, a genuinely short touch screen
    // (844 x 390) would match BOTH variants at once and Tailwind's source order — not intent —
    // would silently decide which wins. Matched by the negation keyword and the two negated terms
    // separately, rather than the whole clause verbatim, so a Tailwind formatting/parenthesization
    // change alone cannot break this.
    expect(
      css,
      "no negation keyword found in the shell: condition — the desktop side must NOT the coarse-and-short pair",
    ).toMatch(/\bnot\b/);
    expect(css, "the coarse-pointer term should still appear (negated) in the shell: condition").toMatch(
      /pointer:\s*coarse/,
    );
    expect(css, "the short-height term should still appear (negated) in the shell: condition").toMatch(
      /height\s*<\s*500px/,
    );

    // Exactly one rule for one candidate — the desktop side is one condition, never an OR of two.
    // Matched on the candidate's own selector, mirroring the max-shell: case above, so Tailwind's
    // unrelated preflight declarations can never be miscounted as part of this variant's output.
    const candidateRuleCount = (
      css.match(/\.shell\\:flex\s*\{\s*display:\s*flex;\s*\}/g) ?? []
    ).length;
    expect(
      candidateRuleCount,
      "expected exactly one .shell\\:flex { display: flex; } rule — the desktop side is a single-condition variant",
    ).toBe(1);
  });

  it("carries no --breakpoint-shell theme token in the compiled output — the number now lives in exactly one place", async () => {
    const css = await compileCandidates(["max-shell:hidden", "shell:flex"]);

    // Asserted against the COMPILED CSS text, never the source file, so a doc comment mentioning
    // the retired token name by way of explanation cannot fail this test.
    expect(
      css,
      "the retired --breakpoint-shell custom property should not be emitted any more",
    ).not.toMatch(/--breakpoint-shell/);
  });
});
