import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Source-contract test for `ToolbarTip`, in the house idiom `components/viewer/toolbar-button.test.ts`
 * already uses: read a real source file, strip its comments, and assert a structural property.
 * This is the test that actually guards the two CSS gates (phone width, iOS-only) — Playwright's
 * WebKit does not implement `-webkit-touch-callout`, so no browser test in this repo can prove
 * either gate visually (see `e2e/phone-toolbar-tip.spec.ts`'s header comment for the probe); this
 * file proves them structurally instead.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const TIP_PATH = join(REPO_ROOT, "components/design/toolbar-tip.tsx");
const LAYOUT_PATH = join(REPO_ROOT, "app/design/layout.tsx");
const MODEL_PATH = join(REPO_ROOT, "lib/models/toolbar-tip.ts");

/** Strips `//` line comments and `/* *\/` block comments, same helper as toolbar-button.test.ts. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

const tipSource = stripComments(readFileSync(TIP_PATH, "utf8"));
const layoutSource = stripComments(readFileSync(LAYOUT_PATH, "utf8"));
const modelSource = readFileSync(MODEL_PATH, "utf8");

// Built from parts, never one literal, so this test file can never accidentally match itself.
const WIDTH_VARIANT = ["max-shell", ":"].join("");
const IOS_VARIANT = ["supports-[-webkit-touch-callout", ":none]:"].join("");
const COMBINED_VARIANT = WIDTH_VARIANT + IOS_VARIANT;
const HIDDEN_BASE_CLASS = ["hid", "den"].join("");
const PRINT_HIDE_ATTR = ["data-print", "-hide"].join("");
const MODEL_SPECIFIER = ["@/lib/models", "/toolbar-tip"].join("");
const TIP_DISMISSAL_KEY = ["shaper-toolbar-tip", "-dismissed"].join("");
const PERMANENT_STORE_NAME = ["local", "Storage"].join("");
const TIP_ELEMENT = ["<Toolbar", "Tip"].join("");
const TIP_IMPORT_SPECIFIER = ["@/components/design", "/toolbar-tip"].join("");
const SIGN_IN_BANNER_ELEMENT = ["<Sign", "InBanner"].join("");
const NON_GROWING_FLEX_CLASS = ["flex", "-none"].join("");

describe("ToolbarTip source contract", () => {
  it("carries the combined width+iOS variant, in order, on the same class as the hidden base", () => {
    expect(tipSource).toContain(COMBINED_VARIANT);
    expect(tipSource).toContain(HIDDEN_BASE_CLASS);
  });

  it("carries the print-hide attribute exactly once", () => {
    const count = tipSource.split(PRINT_HIDE_ATTR).length - 1;
    expect(count).toBe(1);
  });

  it("reads its key and its rule from the shared model module, never typing the key itself", () => {
    expect(tipSource).toContain(MODEL_SPECIFIER);
    expect(tipSource).not.toContain(TIP_DISMISSAL_KEY);
  });

  it("the model module it imports from uses the permanent browser store, not the per-visit one", () => {
    const count = modelSource.split(PERMANENT_STORE_NAME).length - 1;
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it("carries the non-growing flex class, so it cannot steal height from the pinned drawing", () => {
    expect(tipSource).toContain(NON_GROWING_FLEX_CLASS);
  });
});

describe("app/design/layout.tsx mounts ToolbarTip once, after SignInBanner", () => {
  it("imports the tip from its own module", () => {
    expect(layoutSource).toContain(TIP_IMPORT_SPECIFIER);
  });

  it("mounts the tip element exactly once", () => {
    const count = layoutSource.split(TIP_ELEMENT).length - 1;
    expect(count).toBe(1);
  });

  it("mounts the tip after the sign-in banner", () => {
    const bannerIndex = layoutSource.indexOf(SIGN_IN_BANNER_ELEMENT);
    const tipIndex = layoutSource.indexOf(TIP_ELEMENT);
    expect(bannerIndex).toBeGreaterThanOrEqual(0);
    expect(tipIndex).toBeGreaterThan(bannerIndex);
  });
});
