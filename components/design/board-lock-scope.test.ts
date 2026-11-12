import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The control inventory for the board lock (quick 261008-lsy, Plan 02). A disabled control is only
 * presentation — the design store is the real guard — but a shaper must be able to SEE that a locked
 * board can't be changed, so this reads the real source of every design-screen control file and fails
 * on any interactive element that is neither tied to the lock (`disabled={… locked …}`) nor marked as
 * something that only changes the view (`data-lock-exempt`). Same idiom as design-store.test.ts: read the
 * source, strip comments, assert the rule.
 */

/** Files whose controls change the board (or sit beside controls that do). Each task adds its own. */
const LOCKABLE_FILES = [
  "components/outline/outline-controls.tsx",
  "components/rocker/rocker-controls.tsx",
  "components/rocker/blank-picker.tsx",
  "components/rocker/blank-picker-dialog.tsx",
  "components/rocker/blank-card.tsx",
  "components/rocker/blank-filter-bar.tsx",
  "components/rocker/blank-flag.tsx",
  // Quick 261016-mkb: the Customize Rocker button and its popup.
  "components/rocker/customize-rocker.tsx",
  "components/rocker/customize-rocker-dialog.tsx",
  "components/rocker/custom-rocker-rows.tsx",
  "components/rocker/custom-rocker-drawing.tsx",
  // Quick 261018-ejc: the Remove This Blank popup — its Cancel is view-only, its Remove Blank tied to the lock.
  "components/rocker/remove-blank-dialog.tsx",
  "components/rails/rail-controls.tsx",
  // Phase 17 (17-08): BOTTOM's panel — its three Cut menus are tied to the lock; its sliders are SliderRows, which read
  // the lock themselves. The view's own controls (17-10's Height, Section at and the drag) are data-lock-exempt.
  "components/bottom/bottom-controls.tsx",
  // Phase 17 (17-10): the Height buttons under the section, and `Section at` under the drawings — view-only, each
  // data-lock-exempt. (The top view's drag is its box's own pointer handlers, marked data-lock-exempt; it has no tag
  // this inventory reads, and the case below checks it.)
  "components/bottom/bottom-section.tsx",
  "components/bottom/bottom-editor.tsx",
  "components/fins/fin-controls.tsx",
  "components/volume/volume-controls.tsx",
  "components/summary/order-form.tsx",
  // Phase 16 (16-07): the 3D panel — its view buttons only change what is seen, so each is data-lock-exempt.
  "components/3d/three-d-controls.tsx",
  // Phase 16 (16-17, D-35): the corner's picture switches only change what is seen, so each is data-lock-exempt.
  "components/3d/three-d-show-buttons.tsx",
  // Phase 16 (16-18, D-43): the bay's controls only change what is seen. Flip the Board and the switch are
  // data-lock-exempt; each SliderRow there must say `lockExempt`, which the case below proves.
  "components/3d/three-d-rack-controls.tsx",
  // Quick 261112-dbi: the Board file preview only shows the file and saves it, so every button there is data-lock-exempt.
  "components/3d/brd-preview-dialog.tsx",
];

/** `PillButton` (fin-controls.tsx) is not listed: it reads the lock itself, so every use is covered and
 * its own `<button>` is checked here like any other. The elements that can be pressed, ticked, dragged or typed into. `SelectTrigger`, `SelectItem` and
 * `SliderRow` are different names and never match: only a Select's Root and a raw Slider do.
 * `ViewerToolbarButton` joined the list in quick 261017-ojc (2026-10-17): the Customize Rocker drawing's
 * icons (Show my board, Dimensions) and the filter bar's Flat/Upright button each carry `data-lock-exempt`,
 * so an icon added to a lockable file without the marker fails here. */
const INTERACTIVE = [
  "button",
  "Button",
  "Checkbox",
  "Select",
  "Slider",
  "TwoOptionToggle",
  "ViewerToolbarButton",
  "input",
  "Input",
  "select",
];

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .split("\n")
    .map((line) => line.replace(/(^|\s)\/\/.*$/, "$1"))
    .join("\n");
}

function read(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

/** The whole opening tag starting at `start` (a `<`): up to the `>` that closes it, skipping `{…}`
 * expressions and quoted strings (class strings can hold a `>`). */
function openingTag(source: string, start: number): string {
  let depth = 0;
  for (let i = start + 1; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"' || ch === "'") {
      const end = source.indexOf(ch, i + 1);
      if (end < 0) throw new Error(`unterminated string near offset ${i}`);
      i = end;
    } else if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === ">" && depth === 0) return source.slice(start, i + 1);
  }
  throw new Error("unterminated tag");
}

function lineOf(source: string, offset: number): number {
  return source.slice(0, offset).split("\n").length;
}

/** The text of a `disabled={…}` expression in a tag (balanced braces), or null. */
function disabledExpression(tag: string): string | null {
  const at = tag.search(/\bdisabled=\{/);
  if (at < 0) return null;
  const open = tag.indexOf("{", at);
  let depth = 0;
  for (let i = open; i < tag.length; i++) {
    if (tag[i] === "{") depth++;
    else if (tag[i] === "}" && --depth === 0) return tag.slice(open + 1, i);
  }
  return null;
}

interface Found {
  name: string;
  line: number;
  tag: string;
}

function interactiveTags(path: string): Found[] {
  const source = stripComments(read(path));
  const found: Found[] = [];
  const re = new RegExp(`<(${INTERACTIVE.join("|")})(?=[\\s/>])`, "g");
  for (const m of source.matchAll(re)) {
    found.push({ name: m[1], line: lineOf(source, m.index), tag: openingTag(source, m.index) });
  }
  return found;
}

describe("board-lock-scope — the control inventory", () => {
  it.each(LOCKABLE_FILES)("%s: every control is tied to the lock or marked view-only", (path) => {
    const tags = interactiveTags(path);
    expect(tags.length, `${path} should hold at least one control`).toBeGreaterThan(0);
    const offenders = tags
      .filter(({ tag }) => {
        if (/\bdata-lock-exempt\b/.test(tag)) return false;
        const expr = disabledExpression(tag);
        return !(expr !== null && /\blocked\b/.test(expr));
      })
      .map(({ name, line }) => `${path}:${line} <${name}>`);
    expect(offenders, `controls neither tied to the lock nor marked data-lock-exempt:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("the two shared rows read the lock themselves", () => {
    for (const path of ["components/design/slider-row.tsx", "components/design/measure-field.tsx"]) {
      expect(stripComments(read(path)), path).toMatch(/useControlsLocked\(\)/);
    }
  });

  it("every SliderRow in the 3D bay's controls says it only changes the picture (16-18, D-43)", () => {
    const source = stripComments(read("components/3d/three-d-rack-controls.tsx"));
    const rows = [...source.matchAll(/<SliderRow\b/g)];
    expect(rows.length).toBeGreaterThanOrEqual(3);
    for (const row of rows) expect(openingTag(source, row.index), "a bay slider must keep working on a locked board").toMatch(/\blockExempt\b/);
  });

  it("the two-option toggle can be disabled, and PillButton reads the lock itself", () => {
    expect(stripComments(read("components/viewer/two-option-toggle.tsx"))).toMatch(/disabled=\{disabled\}/);
    const fins = stripComments(read("components/fins/fin-controls.tsx"));
    const pill = fins.slice(fins.indexOf("function PillButton"), fins.indexOf("function baseLengthLabel"));
    expect(pill).toMatch(/useControlsLocked\(\)/);
  });

  it("the SUMMARY Board Name field is read-only while locked", () => {
    const source = stripComments(read("components/summary/order-form.tsx"));
    expect(source).toMatch(/label="Board Name"[^>]*readOnly=\{locked\}/);
  });

  it("a blank card's pick is tied to the lock, while its star and a saved blank's Remove are not (quick 261016-mkb)", () => {
    // Remove and the star change the shaper's list, never the board (D-09, ve9's D-08), so a locked
    // board can still tidy its saved blanks; picking a card changes the board, so it stays locked.
    const tags = interactiveTags("components/rocker/blank-card.tsx");
    // The marker exactly — `data-remove-saved` must not also match `data-remove-saved-confirm`.
    const named = (marker: string) => tags.filter(({ tag }) => new RegExp(`\\b${marker}(?![\\w-])`).test(tag));
    for (const marker of ["data-star", "data-remove-saved", "data-remove-saved-confirm", "data-remove-saved-keep"]) {
      const found = named(marker);
      expect(found.length, marker).toBe(1);
      expect(found[0].tag, marker).toMatch(/\bdata-lock-exempt\b/);
    }
    const pick = named("data-pick");
    expect(pick).toHaveLength(1);
    expect(pick[0].tag).not.toMatch(/\bdata-lock-exempt\b/);
    expect(disabledExpression(pick[0].tag)).toBe("locked");
  });

  it("BOTTOM's view controls stay live on a locked board, and every board-changing one is tied to the lock (17-10, UI-SPEC §7)", () => {
    // The finished-rail tick is view-only; the Teardrop's tick box changes the board.
    const panel = interactiveTags("components/bottom/bottom-controls.tsx").filter(({ name }) => name === "Checkbox");
    expect(panel.filter(({ tag }) => /\bdata-lock-exempt\b/.test(tag))).toHaveLength(1);
    expect(panel.filter(({ tag }) => disabledExpression(tag) === "locked").length).toBeGreaterThanOrEqual(1);
    // Height's four buttons are one mapped <button>, view-only; `Section at` is the one Slider, view-only. The phone's
    // NOSE · CENTER · TAIL row (17-14) is one more mapped <button> above it: it picks which section is shown, never
    // what the board is, so it is view-only too.
    const height = interactiveTags("components/bottom/bottom-section.tsx");
    expect(height.map(({ name }) => name)).toEqual(["button"]);
    expect(height[0].tag).toMatch(/\bdata-lock-exempt\b/);
    const editor = interactiveTags("components/bottom/bottom-editor.tsx");
    expect(editor.map(({ name }) => name)).toEqual(["button", "Slider"]);
    for (const { tag } of editor) expect(tag).toMatch(/\bdata-lock-exempt\b/);
    expect(editor[0].tag, "the phone's section row sets the live section and nothing else").toMatch(/onClick=\{\(\) => setLive\(section\)\}/);
    // The cutting line's drag lives on the top view's box, which says it only moves the section.
    const topView = stripComments(read("components/bottom/bottom-top-view.tsx"));
    const press = openingTag(topView, topView.lastIndexOf("<div", topView.indexOf("onPointerDown=")));
    expect(press).toMatch(/onPointerDown=/);
    expect(press).toMatch(/\bdata-lock-exempt\b/);
  });

  it("BOTTOM's WINGS menu is tied to the lock, and its store action refuses a locked board in one undo step (17-12, D-19)", () => {
    // The one Select holding the wing rule: greyed and still on a locked board, never view-only.
    const wings = interactiveTags("components/bottom/bottom-controls.tsx").filter(
      ({ name, tag }) => name === "Select" && /\bvalue=\{bottom\.wingRule\}/.test(tag),
    );
    expect(wings).toHaveLength(1);
    expect(wings[0].tag).not.toMatch(/\bdata-lock-exempt\b/);
    expect(disabledExpression(wings[0].tag)).toBe("locked");
    expect(wings[0].tag).toMatch(/onValueChange=\{\(value\) => setBottomWingRule\(/);
    // The row is drawn for a winged board only: it stands inside the placed wings' own test.
    const panel = stripComments(read("components/bottom/bottom-controls.tsx"));
    expect(panel).toMatch(/placedWings\(outline\.wings \?\? \[\], outlineGeometry\)/);
    expect(panel).toMatch(/\{wings\.length > 0 && \(\s*<div data-bottom-wings\b/);
    // The store is the real guard: the lock first, then one undo step, then the rule alone.
    const store = stripComments(read("components/design/design-store.tsx"));
    const at = store.indexOf("const setBottomWingRule = (");
    expect(at).toBeGreaterThan(0);
    const body = store.slice(at, store.indexOf("\n  };", at));
    expect(body.slice(body.indexOf("{") + 1).trimStart()).toMatch(/^if \(lockedRef\.current\) return;\s*noteEdit\(null\);/);
    expect(body).toMatch(/bottom:\s*\{\s*\.\.\.prev\.bottom,\s*wingRule:\s*rule\s*\}/);
    expect(body.match(/setState\(/g)).toHaveLength(1);
  });

  it("the design layout wraps every screen in the lock scope", () => {
    expect(stripComments(read("app/design/layout.tsx"))).toMatch(/<BoardLockScope>/);
  });
});
