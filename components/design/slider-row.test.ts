import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";
import { SliderRow } from "./slider-row";

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
      "Board Length's middle row sits between the label and the slider and branches per system — the feet/inches Select combo in Imperial, one typed centimetre field in Metric (D-08) — a shape SliderRow has no slot for either way.",
  },
  {
    file: ROCKER_PATH,
    count: 1,
    reason:
      "Center Thickness carries a typed field on its label line beside the slider — the Board Length hand-rolled shape, compacted to one line (11-UI-SPEC §1).",
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
      "Board Length's per-system middle row (feet/inches Select combo in Imperial, one typed centimetre field in Metric, D-08) has the same shape as TEMPLATE's and VOLUME's; Tail Width @ 12\" would fit the row alone, but it shares one 0.45 opacity dimming state with Board Length under the importTemplate toggle, and SliderRow's own disabled dimming is Tailwind's 0.4 — migrating only one would leave two adjacent sliders visibly mismatched, so both stay together.",
  },
  {
    file: VOLUME_PATH,
    count: 1,
    reason:
      "Board Length's per-system middle row has the same shape as its TEMPLATE and FINS counterparts — the feet/inches Select combo in Imperial, one typed centimetre field in Metric (D-08).",
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

/**
 * Phase 14's one new slot (14-UI-SPEC §1): the Thinning Starts rows put their Automatic button at the
 * right end of the hint line, where `rightHint` would sit. The prop is additive — a row that does not
 * pass it must render exactly as every row has until now, so the source contract below pins today's
 * hint-line classes word for word, and a server render proves the same from the markup a browser gets.
 */
describe("SliderRow's hintAction slot (14-UI-SPEC §1)", () => {
  const TODAY_HINT_CLASSES = "mt-0.5 flex justify-between text-xs text-surf-ink-muted font-normal";
  const modulePath = join(REPO_ROOT, "components/design/slider-row.tsx");
  const moduleSource = stripComments(readFileSync(modulePath, "utf8"));

  it("declares one optional hintAction prop, a React node", () => {
    expect(moduleSource).toMatch(/hintAction\?:\s*ReactNode;/);
  });

  it("draws the hint line when any of leftHint, rightHint or hintAction is present", () => {
    expect(moduleSource).toMatch(/\(leftHint\s*\|\|\s*rightHint\s*\|\|\s*hintAction\)\s*&&/);
  });

  it("keeps today's hint-line classes, and adds items-center gap-2 only with a hintAction", () => {
    expect(moduleSource).toContain(`"${TODAY_HINT_CLASSES}"`);
    expect(moduleSource).toMatch(
      /const hasAction = hintAction !== undefined && hintAction !== null && hintAction !== false;/,
    );
    expect(moduleSource).toMatch(/hasAction\s*&&\s*"items-center gap-2"/);
    // The class merge leaves today's string exactly as it is when there is no action.
    expect(cn(TODAY_HINT_CLASSES, false)).toBe(TODAY_HINT_CLASSES);
    expect(cn(TODAY_HINT_CLASSES, "items-center gap-2")).toBe(`${TODAY_HINT_CLASSES} items-center gap-2`);
  });

  it("puts the action where the right hint goes", () => {
    expect(moduleSource).toMatch(/hasAction\s*\?\s*hintAction\s*:\s*<span>\{rightHint\}<\/span>/);
  });

  const base = { label: "Tail Thinning Starts", value: 12, min: 6, max: 30, step: 0.5, onValueChange: () => {} };
  const hintLine = (html: string) => html.match(/<div class="(mt-0\.5 flex[^"]*)">([\s\S]*?)<\/div>/);

  it("renders a row without hintAction exactly as before", () => {
    const html = renderToStaticMarkup(createElement(SliderRow, { ...base, leftHint: "Near the tip", rightHint: "The center" }));
    const line = hintLine(html);
    expect(line?.[1]).toBe(TODAY_HINT_CLASSES);
    expect(line?.[2]).toBe("<span>Near the tip</span><span>The center</span>");
    expect(hintLine(renderToStaticMarkup(createElement(SliderRow, base)))).toBeNull();
  });

  it("renders the action at the right end of the hint line, in place of the right hint", () => {
    const action = createElement("button", { type: "button" }, "Automatic");
    const html = renderToStaticMarkup(
      createElement(SliderRow, { ...base, leftHint: "Picked automatically", rightHint: "unused", hintAction: action }),
    );
    const line = hintLine(html);
    expect(line?.[1]).toBe(`${TODAY_HINT_CLASSES} items-center gap-2`);
    expect(line?.[2]).toBe('<span>Picked automatically</span><button type="button">Automatic</button>');
    // An action alone still draws the line.
    const alone = hintLine(renderToStaticMarkup(createElement(SliderRow, { ...base, hintAction: action })));
    expect(alone?.[2]).toBe('<span></span><button type="button">Automatic</button>');
    // A caller that passes null has no action: today's line, right hint and all.
    const none = hintLine(
      renderToStaticMarkup(createElement(SliderRow, { ...base, leftHint: "Near the tip", rightHint: "The center", hintAction: null })),
    );
    expect(none?.[1]).toBe(TODAY_HINT_CLASSES);
    expect(none?.[2]).toBe("<span>Near the tip</span><span>The center</span>");
  });

  it("treats a hintAction of false as no action: the right hint shows and no extra classes (IN-07)", () => {
    // What `hintAction={cond && <Button />}` hands over when `cond` is false.
    const hints = { leftHint: "Near the tip", rightHint: "The center" };
    const withFalse = renderToStaticMarkup(createElement(SliderRow, { ...base, ...hints, hintAction: false }));
    const line = hintLine(withFalse);
    expect(line?.[1]).toBe(TODAY_HINT_CLASSES);
    expect(line?.[2]).toBe("<span>Near the tip</span><span>The center</span>");
    // The whole row is the row with no action at all.
    expect(withFalse).toBe(renderToStaticMarkup(createElement(SliderRow, { ...base, ...hints })));
    // With no hints either, there is no hint line.
    expect(hintLine(renderToStaticMarkup(createElement(SliderRow, { ...base, hintAction: false })))).toBeNull();
  });
});

/**
 * The slider's own name and spoken value (Phase 14 code review WR-01): two additive props the two
 * Thinning Starts rows pass, so a screen reader tells their twin sliders apart. They land on the
 * thumb's hidden range input — the element with the slider role — and nowhere else; a row that passes
 * neither renders exactly as it did before they existed.
 */
describe("SliderRow's sliderLabel and sliderValueText (WR-01)", () => {
  const base = { label: "Tail Thinning Starts", value: 12, min: 6, max: 30, step: 0.5, onValueChange: () => {} };
  const rangeInput = (html: string) => {
    const inputs = html.match(/<input[^>]*type="range"[^>]*\/>/g) ?? [];
    expect(inputs).toHaveLength(1);
    return inputs[0];
  };
  // Base UI numbers each slider by React's per-render id, so two separate renders differ only there.
  const withoutIds = (html: string) => html.replace(/ id="[^"]*"/g, "");

  it("names the slider and gives its spoken value on the range input", () => {
    const html = renderToStaticMarkup(
      createElement(SliderRow, { ...base, sliderLabel: "Tail Thinning Starts", sliderValueText: "64.8 cm" }),
    );
    const input = rangeInput(html);
    expect(input).toContain('aria-label="Tail Thinning Starts"');
    expect(input).toContain('aria-valuetext="64.8 cm"');
    // The name is the slider's own, not a reference to some other element.
    expect(input).not.toContain("aria-labelledby");
    // Only the input carries them.
    expect(html.match(/aria-label=/g)).toHaveLength(1);
    expect(html.match(/aria-valuetext=/g)).toHaveLength(1);
  });

  it("each prop works on its own", () => {
    const named = rangeInput(renderToStaticMarkup(createElement(SliderRow, { ...base, sliderLabel: "Nose Thinning Starts" })));
    expect(named).toContain('aria-label="Nose Thinning Starts"');
    expect(named).not.toContain("aria-valuetext");
    const spoken = rangeInput(renderToStaticMarkup(createElement(SliderRow, { ...base, sliderValueText: '25 1/2"' })));
    expect(spoken).toContain('aria-valuetext="25 1/2&quot;"');
    expect(spoken).not.toContain("aria-label=");
  });

  it("a row without them carries neither attribute, and renders the same as one passing them as undefined", () => {
    for (const props of [
      base,
      { ...base, displayValue: '12"' },
      { ...base, leftHint: "Near the tip", rightHint: "The center", note: "A note", density: "tight" as const },
      { ...base, disabled: true, className: "flex-1" },
    ]) {
      const html = renderToStaticMarkup(createElement(SliderRow, props));
      expect(html).not.toContain("aria-label=");
      expect(html).not.toContain("aria-valuetext=");
      const explicit = renderToStaticMarkup(
        createElement(SliderRow, { ...props, sliderLabel: undefined, sliderValueText: undefined }),
      );
      expect(withoutIds(explicit)).toBe(withoutIds(html));
    }
  });
});
