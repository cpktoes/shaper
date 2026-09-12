import { compile } from "@tailwindcss/node";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Compiled-CSS guard for the layout switch, after D-10 (10-SWEEP-2.md, 2026-09-11) reverted it
 * from a width-and-height rule (10-05) back to width alone.
 *
 * This file used to prove the OPPOSITE of what it proves now: that `max-shell:` carried an OR of
 * two branches (width, and a coarse-pointer-and-short-height pair) and that `shell:` carried a
 * negation of that same pair. That rule is withdrawn — see `app/globals.css`'s own comment above
 * the two variants for why. What survives is the REASON this file exists at all: a decision that
 * has already been made in both directions needs a test that fails loudly if it is ever quietly
 * reversed a third time. A typo in a media-condition, a stray OR branch, or a re-added negation
 * would compile silently to the wrong rule (or to nothing) with no warning from Tailwind — this is
 * the only test in the suite that would catch that, by running the real `app/globals.css` through
 * the app's own Tailwind pipeline (`compile()` from `@tailwindcss/node`) and asserting on the
 * emitted CSS text itself, the same house pattern as
 * `components/rails/view-full-sized-dialog.css.test.ts`.
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

describe("app/globals.css — the layout switch reads width and nothing else (D-10)", () => {
  it("max-shell: emits exactly one rule, at a width condition under 820, with no pointer-type term and no height term", async () => {
    const css = await compileCandidates(["max-shell:hidden"]);

    expect(css, "no width<820px media condition found for max-shell:").toMatch(
      /@media\s*\(width\s*<\s*820px\)/,
    );

    // The withdrawn OR-branch (a coarse pointer on a screen shorter than 500px) must be gone
    // entirely — not merely unreachable, but absent from the emitted text.
    expect(css, "max-shell: should carry no pointer-type term any more").not.toMatch(/pointer:\s*coarse/);
    expect(css, "max-shell: should carry no height term any more").not.toMatch(/height\s*<\s*500px/);

    // Exactly one rule for one candidate — matched on the candidate's OWN selector rather than a
    // bare `display: none` count, since Tailwind's preflight layer emits its own unrelated
    // `[hidden] { display: none !important; }` reset that a bare count would also pick up.
    const candidateRuleCount = (
      css.match(/\.max-shell\\:hidden\s*\{\s*display:\s*none;\s*\}/g) ?? []
    ).length;
    expect(
      candidateRuleCount,
      "expected exactly one .max-shell\\:hidden { display: none; } rule — a variant compiling to two branches (or to nothing) would fail this",
    ).toBe(1);
  });

  it("shell: emits exactly one rule, at a width condition of 820 or more, with no negation keyword", async () => {
    const css = await compileCandidates(["shell:flex"]);

    // Scoped to the candidate's OWN emitted block (the @media wrapping `.shell\:flex`), not the
    // whole compiled stylesheet — Tailwind's own boilerplate (tw-animate-css's `@supports not
    // (...)` feature queries, elsewhere in this same output) legitimately contains the word "not"
    // for reasons that have nothing to do with this variant, so a whole-file search for `not`
    // would false-fail on that boilerplate alone.
    const shellBlockMatch = css.match(
      /@media[^{]*\{[\s\S]*?\.shell\\:flex\s*\{[\s\S]*?\}\s*\}/,
    );
    expect(shellBlockMatch, "no emitted block found for .shell\\:flex").not.toBeNull();
    const shellBlock = shellBlockMatch![0];

    expect(shellBlock, "no width>=820px media condition found for shell:").toMatch(
      /@media\s*\(width\s*>=\s*820px\)/,
    );

    // The withdrawn negation (STRIDE T-10-02 in 10-05, now retired) must be gone entirely — the
    // desktop side is a single plain condition again, not a negated pair.
    expect(shellBlock, "shell: should carry no negation keyword any more").not.toMatch(/\bnot\b/);
    expect(shellBlock, "shell: should carry no pointer-type term any more").not.toMatch(/pointer:\s*coarse/);
    expect(shellBlock, "shell: should carry no height term any more").not.toMatch(/height\s*<\s*500px/);

    const candidateRuleCount = (
      css.match(/\.shell\\:flex\s*\{\s*display:\s*flex;\s*\}/g) ?? []
    ).length;
    expect(
      candidateRuleCount,
      "expected exactly one .shell\\:flex { display: flex; } rule — the desktop side is a single-condition variant",
    ).toBe(1);
  });

  it("the two conditions partition at 820: max-shell is strictly under it, shell is at or over it, so the boundary belongs to exactly one side", async () => {
    const css = await compileCandidates(["max-shell:hidden", "shell:flex"]);

    // Built from strict-less-than and greater-or-equal, which are exact complements by
    // construction: 820 itself can never satisfy `width < 820px`, and always satisfies
    // `width >= 820px`. Asserting both operators together is what proves the boundary is owned by
    // declaration, not by which rule Tailwind happens to emit first.
    expect(css, "max-shell: should be a strict less-than at 820").toMatch(/@media\s*\(width\s*<\s*820px\)/);
    expect(css, "shell: should be a greater-or-equal at 820").toMatch(/@media\s*\(width\s*>=\s*820px\)/);

    // Guards against a formatting drift that would silently widen the phone side to include 820
    // (e.g. `<=` swapped in for `<`), which would double-match the boundary.
    expect(css, "max-shell: must not have become a less-or-equal at 820").not.toMatch(
      /@media\s*\(width\s*<=\s*820px\)/,
    );
  });

  it("carries no --breakpoint-shell theme token in the compiled output — the number lives in exactly one place", async () => {
    const css = await compileCandidates(["max-shell:hidden", "shell:flex"]);

    // Asserted against the COMPILED CSS text, never the source file, so a doc comment mentioning
    // the retired token name by way of explanation cannot fail this test.
    expect(
      css,
      "the retired --breakpoint-shell custom property should not be emitted any more",
    ).not.toMatch(/--breakpoint-shell/);
  });
});
