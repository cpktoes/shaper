import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Source-contract test guarding the toolbar-button extraction (05-06), in the house idiom
 * `lib/theme.test.ts` and `lib/db/ownership.test.ts` already use: read a real source file,
 * strip its comments, and assert a structural property.
 *
 * This exact class string — border, radius, padding, the hover-accent trio — was hand-edited in
 * seven button instances across two files, twice in one day (quick tasks 260830-1g3, 260830-1vn).
 * This test is what stops an eighth hand-mirrored copy from appearing: it fails loudly if either
 * editor ever declares its own copy of the rotate glyph or writes the toolbar button's base class
 * string out by hand again, instead of drawing its toolbar from the shared module.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const OUTLINE_EDITOR_PATH = join(REPO_ROOT, "components/outline/outline-editor.tsx");
const ROCKER_EDITOR_PATH = join(REPO_ROOT, "components/rocker/rocker-editor.tsx");
const RAILS_EDITOR_PATH = join(REPO_ROOT, "components/rails/rail-band-editor.tsx");
const TOOLBAR_MODULE_PATH = join(REPO_ROOT, "components/viewer/toolbar-button.tsx");

/** Strips `//` line comments and `/* *\/` block comments, same helper as lib/theme.test.ts and
 * lib/db/ownership.test.ts. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

// Built from parts here, not written as one literal, so this test file can never accidentally
// match its own assertions.
const SHARED_MODULE_SPECIFIER = ["@/components/viewer", "/toolbar-button"].join("");
const ROTATE_GLYPH_DECLARATION = ["function", " RotateBoardIcon"].join("");
// Anchored on the toolbar button's distinctive middle section (bg-surf-ground, the muted icon
// colour, the transition) rather than just the hover-accent pair — a plainer "hover:bg-surf-accent
// hover:text-surf-on-accent" fragment also appears, coincidentally, in the unrelated dev-only
// "Copy preset values" button's own class string.
const TOOLBAR_BASE_CLASS_FRAGMENT = ["bg-surf-ground p-1 text-surf-ink-muted transition-colors", " outline-none hover:bg-surf-accent hover:text-surf-on-accent"].join("");
// Built from parts (the removed prop's name, then an opening curly brace) so this test file can
// never accidentally match its own prose about the prop it is checking for.
const REMOVED_SLOT_PROP_USAGE = ["slot", "={"].join("");

describe("viewer toolbar button extraction (05-06)", () => {
  const outlineSource = stripComments(readFileSync(OUTLINE_EDITOR_PATH, "utf8"));
  const rockerSource = stripComments(readFileSync(ROCKER_EDITOR_PATH, "utf8"));
  const railsSource = stripComments(readFileSync(RAILS_EDITOR_PATH, "utf8"));
  const toolbarModuleSource = readFileSync(TOOLBAR_MODULE_PATH, "utf8");

  it("both editors import the shared toolbar module", () => {
    expect(outlineSource).toContain(SHARED_MODULE_SPECIFIER);
    expect(rockerSource).toContain(SHARED_MODULE_SPECIFIER);
  });

  it("neither editor declares its own copy of the rotate glyph", () => {
    expect(outlineSource).not.toContain(ROTATE_GLYPH_DECLARATION);
    expect(rockerSource).not.toContain(ROTATE_GLYPH_DECLARATION);
  });

  it("neither editor writes the toolbar button's base class string out by hand", () => {
    expect(outlineSource).not.toContain(TOOLBAR_BASE_CLASS_FRAGMENT);
    expect(rockerSource).not.toContain(TOOLBAR_BASE_CLASS_FRAGMENT);
  });

  it("both editors draw all their floating buttons from ViewerToolbarButton", () => {
    expect(outlineSource.match(/<ViewerToolbarButton/g)?.length).toBe(4);
    expect(rockerSource.match(/<ViewerToolbarButton/g)?.length).toBe(3);
  });

  // 260909-hd9: all three editors — outline, rocker AND rails — draw their floating icons inside
  // the shared row component; each file opens it exactly once and closes it exactly once.
  it("all three editors open and close the shared ViewerToolbar row exactly once", () => {
    for (const source of [outlineSource, rockerSource, railsSource]) {
      expect(source.match(/<ViewerToolbar>/g)?.length).toBe(1);
      expect(source.match(/<\/ViewerToolbar>/g)?.length).toBe(1);
    }
  });

  // 260909-hd9: with comments stripped, no editor still hands an individual button a position of
  // its own — the row now supplies the one pinned box, so a per-button `slot` prop would be a
  // silent revert to hand-mirrored positions.
  it("no editor still hands an individual button its own position", () => {
    expect(outlineSource).not.toContain(REMOVED_SLOT_PROP_USAGE);
    expect(rockerSource).not.toContain(REMOVED_SLOT_PROP_USAGE);
    expect(railsSource).not.toContain(REMOVED_SLOT_PROP_USAGE);
  });

  // 260909-hd9: the shared module declares the row component exactly once, and it is the row —
  // not the button — that carries the pinned box (the out-of-flow keyword moved off the button's
  // own base class and onto the row's). `flex-row-reverse` only makes sense on the row (it is
  // what packs a hidden button's neighbours into the corner), so its presence is what proves the
  // pinned box moved rather than merely being duplicated.
  it("the shared module declares ViewerToolbar exactly once, and only the row is pinned", () => {
    expect(toolbarModuleSource.match(/export function ViewerToolbar\(/g)?.length).toBe(1);
    expect(toolbarModuleSource).toMatch(/const TOOLBAR_BUTTON_BASE =\s*\n?\s*"(?!absolute)/);
    expect(toolbarModuleSource).toMatch(/"absolute[^"]*flex-row-reverse[^"]*"/);
  });
});
