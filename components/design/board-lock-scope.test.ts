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
];

/** The elements that can be pressed, ticked, dragged or typed into. `SelectTrigger`, `SelectItem` and
 * `SliderRow` are different names and never match: only a Select's Root and a raw Slider do. */
const INTERACTIVE = ["button", "Button", "Checkbox", "Select", "Slider", "TwoOptionToggle", "PillButton", "input", "Input", "select"];

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

  it("the design layout wraps every screen in the lock scope", () => {
    expect(stripComments(read("app/design/layout.tsx"))).toMatch(/<BoardLockScope>/);
  });
});
