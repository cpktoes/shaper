import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Five sidebars — TEMPLATE, ROCKER, RAILS, FINS and VOLUME — used to write out the same slider
 * markup five different ways: a label line, a track, sometimes a pair of hints or a warning
 * note, each file with its own copy of the tiny helper that reads a value out of the slider's
 * drag callback. That duplication is exactly how Phase 6's units work (every slider learning to
 * read in the shaper's chosen system) would have turned into five separate edits instead of one.
 * This is a source-contract test, in the same idiom as lib/theme.test.ts and
 * lib/db/ownership.test.ts: it reads each sidebar's real source and asserts a structural
 * property, so a later edit that quietly reintroduces a sixth copy of the markup fails loudly
 * here rather than passing review.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));

const OUTLINE_PATH = join(REPO_ROOT, "components/outline/outline-controls.tsx");
const ROCKER_PATH = join(REPO_ROOT, "components/rocker/rocker-controls.tsx");
const RAILS_PATH = join(REPO_ROOT, "components/rails/rail-controls.tsx");
const FINS_PATH = join(REPO_ROOT, "components/fins/fin-controls.tsx");
const VOLUME_PATH = join(REPO_ROOT, "components/volume/volume-controls.tsx");

const SIDEBARS = [
  { label: "TEMPLATE", path: OUTLINE_PATH },
  { label: "ROCKER", path: ROCKER_PATH },
  { label: "RAILS", path: RAILS_PATH },
  { label: "FINS", path: FINS_PATH },
  { label: "VOLUME", path: VOLUME_PATH },
] as const;

/**
 * A slider left hand-rolled rather than migrated to the shared row, because its shape genuinely
 * doesn't fit SliderRow's fixed label-then-track-then-hints layout — never an oversight. Each
 * entry's `count` is the number of raw `<Slider` renders that file is allowed to keep.
 */
const ALLOWLIST: { file: string; count: number; reason: string }[] = [
  {
    file: OUTLINE_PATH,
    count: 1,
    reason:
      "Board Length's feet/inches Select combo sits between the label and the slider — SliderRow has no slot for it.",
  },
  {
    file: RAILS_PATH,
    count: 4,
    reason:
      "Family (three hint captions), Ratio (four hint captions plus a Sym checkbox), Corner Cut Offset and Bottom Tuck 3 (each with a checkbox sharing the label's heading line) all carry shapes SliderRow's plain-string label and two-hint layout can't hold.",
  },
  {
    file: FINS_PATH,
    count: 2,
    reason:
      "Board Length has the same Select-combo shape as TEMPLATE's; Tail Width @ 12\" would fit the row alone, but it shares one 0.45 opacity dimming state with Board Length under the importTemplate toggle, and SliderRow's own disabled dimming is Tailwind's 0.4 — migrating only one would leave two adjacent sliders visibly mismatched, so both stay together.",
  },
  {
    file: VOLUME_PATH,
    count: 1,
    reason: "Board Length has the same Select-combo shape as its TEMPLATE and FINS counterparts.",
  },
];

/** Strips `//` line comments and `/* *\/` block comments, same helper as lib/theme.test.ts and
 * lib/db/ownership.test.ts. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

/** Counts direct renders of the underlying slider primitive — `<Slider` but not `<SliderRow`. */
function rawSliderCount(source: string): number {
  const matches = source.match(/<Slider(?!Row)\b/g);
  return matches?.length ?? 0;
}

describe("shared SliderRow (the fix for five hand-rolled slider markups)", () => {
  const sources = SIDEBARS.map(({ label, path }) => ({
    label,
    path,
    stripped: stripComments(readFileSync(path, "utf8")),
  }));

  it("every sidebar imports the shared row module", () => {
    for (const { label, stripped } of sources) {
      expect(stripped, `${label} does not import @/components/design/slider-row`).toMatch(
        /from\s+["']@\/components\/design\/slider-row["']/,
      );
    }
  });

  it("no sidebar still declares its own copy of the row helper or the value helper", () => {
    // Built from parts so this file — which necessarily contains "SliderRow" and "sliderValue"
    // as identifiers elsewhere — can never match its own needle.
    const rowHelperNeedle = new RegExp(`function\\s+${"Slider" + "Row"}\\s*\\(`);
    const valueHelperNeedle = new RegExp(`function\\s+${"slider" + "Value"}\\s*\\(`);
    for (const { label, stripped } of sources) {
      expect(stripped, `${label} still declares its own SliderRow helper`).not.toMatch(rowHelperNeedle);
      expect(stripped, `${label} still declares its own sliderValue helper`).not.toMatch(valueHelperNeedle);
    }
  });

  it("every remaining direct render of the underlying slider is named in the allowlist", () => {
    for (const { label, path, stripped } of sources) {
      const allowed = ALLOWLIST.find((entry) => entry.file === path);
      const actual = rawSliderCount(stripped);
      if (allowed === undefined) {
        expect(actual, `${label} has un-allowlisted raw <Slider> renders`).toBe(0);
      } else {
        expect(
          actual,
          `${label} has ${actual} raw <Slider> renders, expected the allowlisted ${allowed.count} (${allowed.reason})`,
        ).toBe(allowed.count);
      }
    }
  });

  it("every allowlist entry carries a one-line reason and points at a real sidebar file", () => {
    const knownPaths = SIDEBARS.map((s) => s.path);
    for (const entry of ALLOWLIST) {
      expect(knownPaths).toContain(entry.file);
      expect(entry.reason.length, `allowlist entry for ${entry.file} has no reason`).toBeGreaterThan(0);
      expect(entry.count, `allowlist entry for ${entry.file} allows zero — remove it instead`).toBeGreaterThan(0);
    }
  });

  it("the shared component exports exactly SliderRow and sliderValue", () => {
    const modulePath = join(REPO_ROOT, "components/design/slider-row.tsx");
    const moduleSource = stripComments(readFileSync(modulePath, "utf8"));
    expect(moduleSource.match(/export function SliderRow\(/g)?.length).toBe(1);
    expect(moduleSource.match(/export function sliderValue\(/g)?.length).toBe(1);
  });
});
