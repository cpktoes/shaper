import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Source-contract test for `PhoneUndoBar`, in the house idiom `components/design/toolbar-tip.test.ts`
 * already uses: read the real file, strip its comments FIRST (so a class name only mentioned in
 * prose can never satisfy a case), and assert on the stripped text. Comments are stripped before
 * any check runs so the module's own doc comment — which quotes several of these exact class
 * names while explaining them — can never make a broken component look correct.
 *
 * Since quick 260930-lo8 the pair paints at every width, not just below the phone breakpoint, so
 * this file's first case now finds the wrapper's own className string (the one whose tokens
 * include `fixed`) and asserts on its whole tokens, rather than asserting the old phone-only
 * `hidden max-shell:flex` pair is present.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BAR_PATH = join(REPO_ROOT, "components/design/phone-undo-bar.tsx");

/** Strips `//` line comments and `/* *\/` block comments, same helper as toolbar-tip.test.ts. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

/** Every `className="..."` string in the stripped source, each split into its whitespace-separated
 * tokens — so a check can assert on a whole token (`fixed`) rather than a substring that a longer
 * token (`max-shell:bottom-[...]`) could also satisfy. */
function classNameTokenLists(source: string): string[][] {
  return [...source.matchAll(/className="([^"]*)"/g)].map((match) => match[1].split(/\s+/).filter(Boolean));
}

const barSource = stripComments(readFileSync(BAR_PATH, "utf8"));

// Built from parts, never one literal, so this test file can never accidentally match itself.
const HIDDEN_BASE_CLASS = ["hid", "den"].join("");
const MAX_SHELL_FLEX = ["max-shell", ":flex"].join("");
const FLEX = ["fl", "ex"].join("");
const FIXED = ["fix", "ed"].join("");
const RIGHT_4 = ["right", "-4"].join("");
const Z_40 = ["z", "-40"].join("");
const POINTER_EVENTS_NONE = ["pointer-events", "-none"].join("");
const POINTER_EVENTS_AUTO = ["pointer-events", "-auto"].join("");
const PRINT_HIDE_ATTR = ["data-print", "-hide"].join("");
const COARSE_SIZE_11 = ["coarse:size", "-11"].join("");
const EARLY_RETURN_NULL = ["return", " null"].join("");
const DATA_PHONE_UNDO_BAR = ["data-phone", "-undo-bar"].join("");
const EXPORT_PHONE_UNDO_BAR = ["export function", " PhoneUndoBar"].join("");
const PHONE_OFFSET_CLASS = [
  "max-shell:bottom-[calc(1rem+env(safe-area-inset-bottom)",
  ")]",
].join("");
const SHELL_OFFSET_CLASS = ["shell:bottom", "-4"].join("");
const STYLE_ATTR = ["sty", "le="].join("");
const PRINT_HIDDEN = ["print", ":hidden"].join("");

describe("PhoneUndoBar source contract", () => {
  it("the wrapper's className string is the one, and only, class string whose tokens include fixed", () => {
    const withFixed = classNameTokenLists(barSource).filter((tokens) => tokens.includes(FIXED));
    expect(withFixed).toHaveLength(1);
  });

  it("the wrapper's tokens paint at every width: flex, fixed, right-4, z-40, pointer-events-none, and never the old phone-only pair", () => {
    const [wrapperTokens] = classNameTokenLists(barSource).filter((tokens) => tokens.includes(FIXED));
    expect(wrapperTokens).toContain(FLEX);
    expect(wrapperTokens).toContain(FIXED);
    expect(wrapperTokens).toContain(RIGHT_4);
    expect(wrapperTokens).toContain(Z_40);
    expect(wrapperTokens).toContain(POINTER_EVENTS_NONE);
    expect(wrapperTokens).not.toContain(HIDDEN_BASE_CLASS);
    expect(wrapperTokens).not.toContain(MAX_SHELL_FLEX);
  });

  it("the wrapper's tokens carry both width-keyed offsets: the upright phone's 16px plus the home-bar inset (quick 261003-q2f) and the computer's 16px", () => {
    const [wrapperTokens] = classNameTokenLists(barSource).filter((tokens) => tokens.includes(FIXED));
    expect(wrapperTokens).toContain(PHONE_OFFSET_CLASS);
    expect(wrapperTokens).toContain(SHELL_OFFSET_CLASS);
  });

  it("carries no inline style attribute — an inline bottom would outrank both offset classes", () => {
    expect(barSource).not.toContain(STYLE_ATTR);
  });

  it("the wrapper's tokens carry print:hidden, so it never reaches a printed page from any screen (quick 260930-lo8)", () => {
    const [wrapperTokens] = classNameTokenLists(barSource).filter((tokens) => tokens.includes(FIXED));
    expect(wrapperTokens).toContain(PRINT_HIDDEN);
    expect(wrapperTokens).not.toContain(HIDDEN_BASE_CLASS);
  });

  it("the wrapper carries pointer-events-none and each button carries pointer-events-auto", () => {
    expect(barSource).toContain(POINTER_EVENTS_NONE);
    const autoCount = barSource.split(POINTER_EVENTS_AUTO).length - 1;
    expect(autoCount).toBe(2);
  });

  it("carries data-print-hide, so it never appears on a printed page", () => {
    expect(barSource).toContain(PRINT_HIDE_ATTR);
  });

  it("each button carries coarse:size-11 (44px for a finger)", () => {
    const count = barSource.split(COARSE_SIZE_11).length - 1;
    expect(count).toBe(2);
  });

  it("has an early return null, so nothing renders until there is something to undo or redo", () => {
    expect(barSource).toContain(EARLY_RETURN_NULL);
  });

  it("keeps its phone-era file, export and attribute names (O-1: the worktree merge guard refuses renames)", () => {
    expect(barSource).toContain(DATA_PHONE_UNDO_BAR);
    expect(barSource).toContain(EXPORT_PHONE_UNDO_BAR);
  });
});
