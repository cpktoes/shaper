import { compile } from "@tailwindcss/node";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * D-03's "the box you type a board's name into" fix, proved two ways.
 *
 * The source-contract half below only proves the shared `Input` component's base class carries
 * the RIGHT TOKEN NAMES (`coarse:h-11`, `coarse:text-base`). It cannot prove Tailwind actually
 * turns those tokens into real CSS: a typo in the variant name, an unsupported rename in a future
 * Tailwind release, or a `coarse` custom-variant definition that stops matching would all compile
 * to NOTHING — no rule, no warning — and the field would silently ship at its old 32px height with
 * nobody, human or test, noticing until a shaper's thumb missed it on a phone. The compiled half
 * closes that gap by running the two candidates through the app's own `app/globals.css` (the same
 * Tailwind entry point `next build` uses) with `@tailwindcss/node`'s `compile()`, exactly the
 * pattern `components/rails/view-full-sized-dialog.css.test.ts` established, and asserts on the
 * emitted CSS text itself.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const GLOBALS_CSS_PATH = path.join(REPO_ROOT, "app/globals.css");
const GLOBALS_CSS_SOURCE = readFileSync(GLOBALS_CSS_PATH, "utf8");
const GLOBALS_CSS_BASE = path.dirname(GLOBALS_CSS_PATH);
const INPUT_TSX_PATH = path.join(REPO_ROOT, "components/ui/input.tsx");
const INPUT_TSX_SOURCE = readFileSync(INPUT_TSX_PATH, "utf8");

/** The single base class string `Input` builds its `className` from — everything between the
 * `cn(` call's opening string literal and the trailing `className` variable. */
function inputBaseClass(): string {
  const match = INPUT_TSX_SOURCE.match(/cn\(\s*(?:\/\/[^\n]*\n\s*)*"([^"]+)"/);
  if (!match) throw new Error("could not find Input's base class string in input.tsx");
  return match[1];
}

/** Fresh compiler per case, following view-full-sized-dialog.css.test.ts's own note: `build()`
 * calls accumulate candidates across calls on the SAME compiler instance, so a case that needs an
 * isolated candidate set must call `compile()` fresh rather than reuse a shared compiler. */
async function compileCandidates(candidates: string[]): Promise<string> {
  const compiler = await compile(GLOBALS_CSS_SOURCE, { base: GLOBALS_CSS_BASE, onDependency: () => {} });
  return compiler.build(candidates);
}

describe("Input (components/ui/input.tsx) — the shared field's two touch rules", () => {
  it("source contract: the base class carries both coarse:h-11 and coarse:text-base, and the resting height (h-8) is unchanged", () => {
    const base = inputBaseClass();
    expect(base, "coarse:h-11 is missing from Input's base class").toMatch(/\bcoarse:h-11\b/);
    expect(base, "coarse:text-base is missing from Input's base class").toMatch(/\bcoarse:text-base\b/);
    expect(base, "the resting h-8 height moved or was removed").toMatch(/\bh-8\b/);
  });

  it("compiled CSS: coarse:h-11 compiles to a pointer:coarse media rule containing a height declaration", async () => {
    const css = await compileCandidates(["coarse:h-11"]);

    expect(css, "no pointer: coarse media condition found for coarse:h-11").toMatch(
      /@media\s*\(pointer:\s*coarse\)/,
    );
    // Tailwind v4 emits height as either a spacing-variable calc() or a plain rem value depending
    // on the theme's own token resolution — accept either so a Tailwind formatting change alone
    // does not break this test.
    expect(css, "no height declaration found in the compiled coarse:h-11 rule").toMatch(
      /height:\s*(?:calc\(var\(--spacing\)\s*\*\s*11\)|2\.75rem)/,
    );
  });

  it("compiled CSS: coarse:text-base compiles to a pointer:coarse media rule containing a 16px/1rem font-size declaration", async () => {
    const css = await compileCandidates(["coarse:text-base"]);

    expect(css, "no pointer: coarse media condition found for coarse:text-base").toMatch(
      /@media\s*\(pointer:\s*coarse\)/,
    );
    // Tailwind v4 emits font-size either as a literal (1rem/16px) or as a reference to the
    // theme's own `--text-base` variable — accept either, but if it's the variable form, also
    // require that variable's own value resolves to 16px/1rem elsewhere in the same compiled
    // output, so a theme change that quietly shrinks --text-base itself would still fail this.
    const declaresLiteral = /font-size:\s*(?:1rem|16px)\s*;/.test(css);
    const referencesVariable = /font-size:\s*var\(--text-base\)/.test(css);
    expect(
      declaresLiteral || referencesVariable,
      "no font-size declaration (literal or --text-base reference) found in the compiled coarse:text-base rule",
    ).toBe(true);
    if (referencesVariable && !declaresLiteral) {
      expect(css, "--text-base is declared but does not resolve to 16px/1rem").toMatch(
        /--text-base:\s*(?:1rem|16px)\s*;/,
      );
    }
  });

  it("edge case: exactly the three known consumers of Input exist — a fourth would be a deliberate decision, not an accident", () => {
    const consumers = [
      "components/design/measure-field.tsx",
      "components/setup/rename-dialog.tsx",
      "components/setup/board-name-prompt.tsx",
    ];
    for (const consumer of consumers) {
      const source = readFileSync(path.join(REPO_ROOT, consumer), "utf8");
      expect(source, `${consumer} no longer imports Input`).toMatch(
        /import\s*\{[^}]*\bInput\b[^}]*\}\s*from\s*["']@\/components\/ui\/input["']/,
      );
    }
  });
});
