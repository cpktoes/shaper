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

const barSource = stripComments(readFileSync(BAR_PATH, "utf8"));

// Built from parts, never one literal, so this test file can never accidentally match itself.
const HIDDEN_BASE_CLASS = ["hid", "den"].join("");
const SHELL_VARIANT = ["max-shell", ":flex"].join("");
const POINTER_EVENTS_NONE = ["pointer-events", "-none"].join("");
const POINTER_EVENTS_AUTO = ["pointer-events", "-auto"].join("");
const PRINT_HIDE_ATTR = ["data-print", "-hide"].join("");
const COARSE_SIZE_11 = ["coarse:size", "-11"].join("");
const EARLY_RETURN_NULL = ["return", " null"].join("");

describe("PhoneUndoBar source contract", () => {
  it("root element's class string carries both hidden and max-shell:flex, so it cannot paint at desktop width", () => {
    expect(barSource).toContain(HIDDEN_BASE_CLASS);
    expect(barSource).toContain(SHELL_VARIANT);
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
});
