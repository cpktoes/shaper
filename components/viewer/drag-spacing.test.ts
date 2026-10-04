/**
 * The committed measurement behind the phone hit-zone radii (D-15, PHON-04) — not a one-off script
 * run once at planning time, but a test that re-derives the numbers on every `npm test` and fails
 * loudly if the outline geometry, the outline viewer's own frame constants, or the locked radius
 * below ever drift into overlap.
 *
 * The question this file answers: on a real phone, at TEMPLATE's 66dvh pinned ceiling (UI-SPEC's
 * own "Thumb drag" table, D-18), how far apart do the outline's five drag points actually land on
 * screen — and does a 44px-diameter (22px radius) touch target still fit between the closest pair
 * without the two circles overlapping? (It asked the same of the rocker's four curve handles until
 * Phase 11 retired them — see the last paragraph of this comment.)
 *
 * Two devices, both from the UI-SPEC's own reference set: an iPhone SE (375x667, the narrowest
 * phone this app targets) and an iPhone 14 (390x844, a taller/wider one). The pinned area's own
 * height is 66% of the RAW device height — `dvh` is relative to the full viewport, not to whatever
 * space is left after the shell's compact top bar (and, until quick 261003-q2f removed it, the
 * old bottom tab bar), and at both these device heights 66% of the raw height is comfortably
 * inside what the chrome leaves (this is cross-checked
 * against a second data point below the outline case: the same box-height rule, at UI-SPEC's
 * illustrative 45dvh figure, reproduces the ~181px-wide rocker drawing the UI-SPEC itself quotes for
 * a 375px iPhone SE, to within a couple of pixels). The pinned area's own width is the device width
 * less the phone shell's `p-2` inset (8px each side, 16px total).
 *
 * The outline case uses the tightest realistic board a shaper can build — the shortest length paired
 * with the widest widepoint (`BOARD_LENGTH_RANGE_IN`/`WIDEPOINT_WIDTH_RANGE_IN`) — because a short,
 * wide board is what pulls the five drag points closest together on screen.
 *
 * The rocker half of this file retired with D-14 (Phase 11): the rocker drawing's four curve
 * handles went with the three-knot Bezier they steered, so there is nothing on that drawing to
 * space any more. Its describe below now proves exactly that, and that the touch target which
 * replaces them — the thumb of the sidebar's placement slider — carries the shared slider thumb's
 * own 44px touch ring.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BOARD_LENGTH_RANGE_IN, DEFAULT_BOARD_SPEC, WIDEPOINT_WIDTH_RANGE_IN, type OutlineSpec } from "@/lib/geometry/board";
import { buildOutline } from "@/lib/geometry/outline";
import { OUTLINE_DRAG_HIT_COARSE_PX, OUTLINE_DRAG_HIT_PX, outlineDragPoints } from "@/lib/geometry/outline-drag";
import { MM_PER_INCH, inchesToMm, mmToInches } from "@/lib/geometry/units";
import { outlineViewFrame } from "@/components/viewer/callout-primitives";

/**
 * `outline-viewer.tsx` keeps its own frame constants module-private (`VIEW_W`/`VIEW_H`/`PAD_Y`),
 * unlike the rocker frame's exported ones — read straight off the real source file instead of
 * hand-mirroring the numbers, so this measurement can never quietly drift from what the viewer
 * actually draws. The same idiom `components/viewer/toolbar-button.test.ts` already uses to guard
 * source text without importing the (React-heavy) module.
 */
const OUTLINE_VIEWER_SOURCE = readFileSync(
  new URL("../outline/outline-viewer.tsx", import.meta.url),
  "utf8",
);
function readModuleConst(source: string, name: string): number {
  const match = source.match(new RegExp(`const ${name}\\s*=\\s*(\\d+(?:\\.\\d+)?)`));
  if (!match) {
    throw new Error(`could not find "const ${name} = <number>" in outline-viewer.tsx — has it moved?`);
  }
  return Number(match[1]);
}
const OUTLINE_VIEWER_VIEW_W = readModuleConst(OUTLINE_VIEWER_SOURCE, "VIEW_W");
const OUTLINE_VIEWER_VIEW_H = readModuleConst(OUTLINE_VIEWER_SOURCE, "VIEW_H");
const OUTLINE_VIEWER_PAD_Y = readModuleConst(OUTLINE_VIEWER_SOURCE, "PAD_Y");

/** The tightest realistic board: shortest length, widest widepoint, everything else default. */
const TIGHT_OUTLINE_SPEC: OutlineSpec = {
  ...DEFAULT_BOARD_SPEC.outline,
  length: inchesToMm(BOARD_LENGTH_RANGE_IN.min),
  widePointWidth: inchesToMm(WIDEPOINT_WIDTH_RANGE_IN.max),
};

/** Mirrors `outline-viewer.tsx`'s own `outlineViewMetrics` (the `hideCallouts=false` path every
 * live render but the preset-card thumbnails takes): the length-fit scale, in SVG user units per
 * board inch, and the resulting frame (`outlineViewFrame`, already exported for this purpose). */
function outlineFrame(spec: OutlineSpec) {
  const geometry = buildOutline(spec);
  const lengthIn = mmToInches(geometry.length);
  const cwIn = mmToInches(geometry.halfWidePointWidth);
  const scale = (OUTLINE_VIEWER_VIEW_H - OUTLINE_VIEWER_PAD_Y * 2) / lengthIn;
  const frame = outlineViewFrame(cwIn * scale, OUTLINE_VIEWER_VIEW_W / 2);
  return { geometry, scale, frame };
}

/** The rocker drawing's own source and the shared slider's, read as text rather than imported —
 * the same idiom `outline-viewer.tsx`'s constants use above (the React-heavy modules cannot load in
 * this suite's `node` environment). Comments are stripped from the rocker viewer so its header's
 * own history of the retired handles can never satisfy or break a check. */
const ROCKER_VIEWER_CODE = readFileSync(new URL("../rocker/rocker-viewer.tsx", import.meta.url), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:"'])\/\/.*$/gm, "$1");
const SLIDER_SOURCE = readFileSync(new URL("../ui/slider.tsx", import.meta.url), "utf8");

interface Spaced {
  target: string;
  station: number;
  other: number;
}

/** The closest pair among a set of board-space points, by plain Euclidean distance in millimetres
 * — four or five points is exactly the size an O(n^2) scan is the right tool for (RESEARCH.md's own
 * "Don't Hand-Roll" note), not a spatial index. */
function closestPairMm(points: Spaced[]): { mm: number; a: string; b: string } {
  let best = { mm: Infinity, a: "", b: "" };
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const mm = Math.hypot(points[i].station - points[j].station, points[i].other - points[j].other);
      if (mm < best.mm) best = { mm, a: points[i].target, b: points[j].target };
    }
  }
  return best;
}

interface PhoneDevice {
  name: string;
  widthPx: number;
  heightPx: number;
}

/** The UI-SPEC's own reference devices: an iPhone SE (the narrowest phone this app targets) and an
 * iPhone 14 (taller and wider). */
const PHONE_DEVICES: PhoneDevice[] = [
  { name: "iPhone SE (375x667)", widthPx: 375, heightPx: 667 },
  { name: "iPhone 14 (390x844)", widthPx: 390, heightPx: 844 },
];

/** TEMPLATE and ROCKER's shared pinned-area ceiling (UI-SPEC's "Thumb drag" table; D-18: "ROCKER
 * keeps ... the same 66dvh ceiling as TEMPLATE"). `dvh` is relative to the FULL device viewport,
 * not to whatever space the shell's top/bottom bars leave behind — at both device heights measured
 * here, 66% of the raw device height sits comfortably inside that remaining space, so the raw
 * percentage is what actually renders. Cross-checked: the same rule at the UI-SPEC's illustrative
 * 45dvh figure (`0.45 * 667 = 300.15`) reproduced a ~182px-wide rocker drawing against the rocker
 * frame maths this file carried until Phase 11, matching the UI-SPEC's own quoted "~181px wide on a 375px iPhone SE" to within a
 * couple of pixels. */
const PINNED_AREA_CEILING = 0.66;
/** The phone shell's own `p-2` inset, both sides, on the pinned area's width. */
const SHELL_INSET_PX = 16;

function pinnedBox(device: PhoneDevice) {
  return {
    width: device.widthPx - SHELL_INSET_PX,
    height: device.heightPx * PINNED_AREA_CEILING,
  };
}

/** The `preserveAspectRatio="xMidYMid meet"` fit scale (px per SVG user unit) when `frame` renders
 * into `box` — the smaller of the two axis ratios, same rule `renderedUnitPx` already documents for
 * the rocker's own print path. */
function fitScale(box: { width: number; height: number }, frame: { width: number; height: number }): number {
  return Math.min(box.width / frame.width, box.height / frame.height);
}

/** On-screen pixels per board millimetre: user-units-per-inch (`scale`) times the fit scale
 * (px-per-user-unit), divided by millimetres-per-inch — one isotropic factor, since both viewers
 * use a single `scale` for both axes (the "a shaper checks a rocker line with a straightedge" rule
 * both `outlineViewMetrics` and `RockerViewLayout.scale`'s own doc comments state), so a board-space
 * Euclidean distance converts straight through without separately tracking each axis. Rotation
 * (the rocker's own vertical orientation) is an isometry and does not change this. */
function pxPerMm(userUnitsPerInch: number, fit: number): number {
  return (userUnitsPerInch * fit) / MM_PER_INCH;
}

describe("the tightest realistic board is actually the one measured", () => {
  it("60in length, 25in widepoint — BOARD_LENGTH_RANGE_IN/WIDEPOINT_WIDTH_RANGE_IN's own worst case", () => {
    expect(BOARD_LENGTH_RANGE_IN.min).toBe(60);
    expect(WIDEPOINT_WIDTH_RANGE_IN.max).toBe(25);
  });
});

describe("outline: phone hit-zone spacing at the tightest realistic board", () => {
  const { geometry, scale, frame } = outlineFrame(TIGHT_OUTLINE_SPEC);
  const points: Spaced[] = outlineDragPoints(geometry).map((p) => ({
    target: p.target,
    station: p.point.station,
    other: p.point.halfWidth,
  }));
  const closest = closestPairMm(points);

  for (const device of PHONE_DEVICES) {
    it(`${device.name}: the closest pair of the five drag points clears twice the coarse radius`, () => {
      const box = pinnedBox(device);
      const fit = fitScale(box, frame);
      const perMm = pxPerMm(scale, fit);
      const closestPx = closest.mm * perMm;
      console.log(
        `[outline/${device.name}] render scale ${perMm.toFixed(4)}px/mm ` +
          `(frame ${frame.width.toFixed(1)}x${frame.height.toFixed(1)} user units, ` +
          `pinned box ${box.width.toFixed(1)}x${box.height.toFixed(1)}px, fit ${fit.toFixed(4)}); ` +
          `closest pair ${closest.a}/${closest.b} = ${closest.mm.toFixed(1)}mm = ${closestPx.toFixed(1)}px ` +
          `(needs > ${2 * OUTLINE_DRAG_HIT_COARSE_PX}px)`,
      );
      expect(closestPx).toBeGreaterThan(2 * OUTLINE_DRAG_HIT_COARSE_PX);
    });
  }
});

describe("rocker: nothing on the drawing to space — the placement slider's thumb is the touch target now", () => {
  it("the rocker drawing has no drag targets, no hit circles and no hit radius to space", () => {
    expect(ROCKER_VIEWER_CODE).not.toContain("data-drag-target");
    expect(ROCKER_VIEWER_CODE).not.toMatch(/SIDE_PROFILE_DRAG_HIT(_COARSE)?_PX|hitRadius/);
    expect(ROCKER_VIEWER_CODE).not.toMatch(/onPointer(Down|Move|Up|Cancel)/);
  });

  it("the shared slider thumb (which the placement slider uses) carries its 44px touch ring on a coarse pointer", () => {
    // `-inset-4` grows the thumb's own hit area 16px on every side on a touch device — a 44px
    // target around the visible thumb, the same ring every slider in the app already has.
    expect(SLIDER_SOURCE).toContain("coarse:after:-inset-4");
  });
});

describe("desktop: the existing 15px radius never overlaps (PHON-05 — nothing wired yet, but the numbers already hold)", () => {
  it("outline: default board and the tightest realistic board", () => {
    for (const spec of [DEFAULT_BOARD_SPEC.outline, TIGHT_OUTLINE_SPEC]) {
      const { geometry, scale } = outlineFrame(spec);
      const points: Spaced[] = outlineDragPoints(geometry).map((p) => ({
        target: p.target,
        station: p.point.station,
        other: p.point.halfWidth,
      }));
      // No phone-box shrink on desktop — the sidebar canvas is generously sized, so this checks the
      // drawing's own native scale with no additional fit-down applied (the most pessimistic
      // realistic desktop case).
      const closest = closestPairMm(points);
      const closestPx = closest.mm * pxPerMm(scale, 1);
      expect(closestPx).toBeGreaterThan(2 * OUTLINE_DRAG_HIT_PX);
    }
  });
});

describe("the locked coarse radii stay inside the UI-SPEC's 18-22px band", () => {
  it("outline", () => {
    expect(OUTLINE_DRAG_HIT_COARSE_PX).toBeGreaterThanOrEqual(18);
    expect(OUTLINE_DRAG_HIT_COARSE_PX).toBeLessThanOrEqual(22);
  });
});
