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
  "components/fins/fin-controls.tsx",
  "components/volume/volume-controls.tsx",
  "components/summary/order-form.tsx",
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

  it("the design layout wraps every screen in the lock scope", () => {
    expect(stripComments(read("app/design/layout.tsx"))).toMatch(/<BoardLockScope>/);
  });
});
