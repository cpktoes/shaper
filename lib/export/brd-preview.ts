/**
 * The preview a shaper sees before a board file is saved (quick 261112-dbi, the founder, 2026-11-12: "could be show a
 * preview like the top and side view of Shape3D so the user can see the slices and trust the output?").
 *
 * Everything here is read back from the file's own bytes — `unscrambleBrd` then `readBrdText` — and never from the
 * board on screen, so the picture cannot disagree with the file. It turns what was read into what a dialog draws: the
 * outline, the bottom and the deck sampled into lines, and for every cross-section its station, how wide the outline is
 * there, how high the deck stands over the bottom there, and its own shape sampled. Lengths are millimetres (the
 * file's centimetres go through `centimetresToMm`, never a bare 10), and the words a shaper reads go through
 * `lib/geometry/units.ts` like every other design value.
 *
 * Pure: no React, browser or database import (CLAUDE.md Rule 1).
 */
import { bezierPoint, type BezierKnot, type P2 } from "../geometry/bezier-fit";
import { BOTTOM_DATA_DEPTH_SHOWN, type BottomBoard, type ResolvedBottom } from "../geometry/bottom";
import type { SectionHeight } from "../geometry/bottom-draw";
import { sideProfileAt, sideProfileLines, type SideProfileReader } from "../geometry/side-profile";
import { formatDim } from "../geometry/measure-display";
import {
  centimetresToMm,
  formatCentimetres,
  formatFeetInches,
  formatInchesFraction,
  mm,
  type Mm,
  type UnitsSystem,
} from "../geometry/units";
import { brdFile, readBrdText, type BrdOptions, type BrdRead, type BrdReadKnot } from "./brd";
import { unscrambleBrd } from "./brd-scramble";
import type { BoardSurface } from "../geometry/board-surface";

/** How many points a span of the outline, the bottom or the deck is sampled into. */
export const BRD_PREVIEW_CURVE_STEPS = 24;

/** How many points a span of a cross-section is sampled into. */
export const BRD_PREVIEW_SECTION_STEPS = 16;

/** One cross-section of the file, in millimetres. */
export interface BrdPreviewSlice {
  /** Which slice, counted from the tail, from 1: the file's own order. */
  number: number;
  /** Where it stands, along the board from the tail. */
  station: Mm;
  /** The outline's half-width at that station. */
  halfWidth: Mm;
  /** How far out from the stringer the slice itself reaches (its widest point). */
  reach: Mm;
  /** The bottom's and the deck's height along the stringer at that station. */
  bottom: Mm;
  deck: Mm;
  /** The stringer's thickness there: the slice's last knot's height. */
  thickness: Mm;
  /** The slice's right half sampled, (out from the stringer, up from the stringer's bottom), stringer bottom first. */
  section: P2[];
  /** The slice's own knots, in the same two measures. */
  knots: P2[];
}

/** What the dialog draws, all read from a file. */
export interface BrdPreview {
  length: Mm;
  width: Mm;
  thickness: Mm;
  /** The outline's right half, tail to nose, as (distance from the tail, half-width). */
  outline: P2[];
  /** The bottom and deck lines along the stringer, as (distance from the tail, height). */
  bottom: P2[];
  deck: P2[];
  /** The fitted cross-sections in file order; the two empty ends that close the tips are not here. */
  slices: BrdPreviewSlice[];
  /** The largest gap between neighbouring sections in the file, the tip ends included. */
  widestGap: Mm;
  /** The index of the slice nearest the outline's widest knot: the one the preview opens on. */
  openingSlice: number;
}

/**
 * What the board maths needs to work out the preview's rail line and the side profile's maximum (quick 261112-lmr): the
 * bottom the file was written from (the channel-less one, `brdFileBottom`, resolved), the board, and the planed side
 * profile's rocker and thickness.
 */
export interface BrdSideProfileInput {
  resolved: ResolvedBottom;
  board: BottomBoard;
  profile: SideProfileReader;
}

/** The two things the preview shows that the file itself does not hold: see `brdPreviewProfile`. */
export interface BrdPreviewProfile {
  /**
   * The bottom at the rail before the rails are shaped, along the file's own stringer bottom: each point is the file's
   * bottom there moved by the foam off at the rail less the foam off at the stringer. `null` where it never parts from
   * the stringer's line by more than DATA's quarter millimetre (one line is drawn).
   */
  railBottom: P2[] | null;
  /** The side profile's maximum thickness: the deck down to whichever bottom line is lower, the most along the board. */
  maxThickness: Mm;
}

/** A file's sections, as made and as read back, and the board maths' two extras. */
export interface BrdFileWithPreview {
  name: string;
  data: Uint8Array;
  sectionCount: number;
  preview: BrdPreview;
  profile: BrdPreviewProfile;
}

const toKnot = (knot: BrdReadKnot): BezierKnot => knot;

/** A run of knots in centimetres sampled into millimetre points, `steps` to every span. */
function sampleKnots(knots: readonly BrdReadKnot[], steps: number): P2[] {
  const points: P2[] = [];
  for (let i = 0; i + 1 < knots.length; i++) {
    for (let step = i === 0 ? 0 : 1; step <= steps; step++) {
      const [x, y] = bezierPoint(toKnot(knots[i]), toKnot(knots[i + 1]), step / steps);
      points.push([centimetresToMm(x), centimetresToMm(y)]);
    }
  }
  if (points.length === 0 && knots.length === 1) {
    points.push([centimetresToMm(knots[0].point[0]), centimetresToMm(knots[0].point[1])]);
  }
  return points;
}

/** The line's y at `x`, from the first segment that brackets it (a station on a shared sample point reads the same twice). */
function lineAt(line: readonly P2[], x: number): number {
  for (let i = 0; i + 1 < line.length; i++) {
    const [x0, y0] = line[i];
    const [x1, y1] = line[i + 1];
    if (x >= Math.min(x0, x1) && x <= Math.max(x0, x1)) {
      return x1 === x0 ? y0 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  throw new Error("A slice stands outside the board's own outline.");
}

function headerField(read: BrdRead, key: string): number {
  const found = read.header.find(([name]) => name === key);
  const value = found ? Number(found[1]) : Number.NaN;
  if (!Number.isFinite(value)) throw new Error(`The board file has no ${key}.`);
  return value;
}

/** What a read file looks like drawn: see `BrdPreview`. Throws a plain Error if the file has no fitted slice. */
export function brdPreview(read: BrdRead): BrdPreview {
  const outline = sampleKnots(read.outline, BRD_PREVIEW_CURVE_STEPS);
  const bottom = sampleKnots(read.bottom, BRD_PREVIEW_CURVE_STEPS);
  const deck = sampleKnots(read.deck, BRD_PREVIEW_CURVE_STEPS);
  const fitted = read.sections.filter((section) => section.knots.length > 1);
  if (fitted.length === 0) throw new Error("The board file has no cross-sections.");

  const slices = fitted.map((entry, index): BrdPreviewSlice => {
    const station = centimetresToMm(entry.station);
    const section = sampleKnots(entry.knots, BRD_PREVIEW_SECTION_STEPS);
    const last = entry.knots[entry.knots.length - 1].point;
    return {
      number: index + 1,
      station,
      halfWidth: mm(lineAt(outline, station)),
      reach: mm(Math.max(...section.map(([out]) => out))),
      bottom: mm(lineAt(bottom, station)),
      deck: mm(lineAt(deck, station)),
      thickness: centimetresToMm(last[1]),
      section,
      knots: entry.knots.map(({ point }): P2 => [centimetresToMm(point[0]), centimetresToMm(point[1])]),
    };
  });

  let widestGap = 0;
  for (let i = 1; i < read.sections.length; i++) {
    widestGap = Math.max(widestGap, read.sections[i].station - read.sections[i - 1].station);
  }

  const widest = read.outline.reduce((best, knot) => (knot.point[1] > best.point[1] ? knot : best), read.outline[0]);
  const openingSlice = brdSliceNearest({ slices } as BrdPreview, centimetresToMm(widest.point[0]));

  return {
    length: centimetresToMm(headerField(read, "p01")),
    width: centimetresToMm(headerField(read, "p04")),
    thickness: centimetresToMm(headerField(read, "p03")),
    outline,
    bottom,
    deck,
    slices,
    widestGap: centimetresToMm(widestGap),
    openingSlice,
  };
}

/** The index of the slice standing nearest a station (a tap anywhere on a view picks the nearest line, never a hair-thin one). */
export function brdSliceNearest(preview: Pick<BrdPreview, "slices">, station: number): number {
  let best = 0;
  for (let i = 1; i < preview.slices.length; i++) {
    if (Math.abs(preview.slices[i].station - station) < Math.abs(preview.slices[best].station - station)) best = i;
  }
  return best;
}

/**
 * The rail line and the maximum thickness for a read file (quick 261112-lmr): the file's own stringer bottom moved at each
 * of its points by the board maths' foam off at the rail less the foam off at the stringer, so both lines sit on the
 * file's own rocker. The stringer's line itself and the deck stay as the file says.
 */
export function brdPreviewProfile(preview: BrdPreview, sides: BrdSideProfileInput): BrdPreviewProfile {
  let parted = 0;
  const rail = preview.bottom.map(([x, h]): P2 => {
    const at = sideProfileAt(sides.resolved, sides.board, sides.profile, mm(x));
    const lift = at.railFoamOff - at.stringerFoamOff;
    parted = Math.max(parted, Math.abs(lift));
    return [x, h + lift];
  });
  return {
    railBottom: parted > BOTTOM_DATA_DEPTH_SHOWN ? rail : null,
    maxThickness: sideProfileLines(sides.resolved, sides.board, sides.profile).maxThickness,
  };
}

/**
 * The board file for a surface and its preview, read back from the very bytes the file is made of: `data` is the array
 * `brdFile` returned, untouched, so what Save downloads is what was drawn. Everything drawn comes from those bytes except
 * the rail line and the maximum thickness, which are worked out from the board maths beside them (`sides`).
 */
export function brdFileWithPreview(
  surface: BoardSurface,
  boardName: string,
  options: BrdOptions,
  sides: BrdSideProfileInput,
): BrdFileWithPreview {
  const file = brdFile(surface, boardName, options);
  const preview = brdPreview(readBrdText(unscrambleBrd(file.data)));
  return { name: file.name, data: file.data, sectionCount: file.sectionCount, preview, profile: brdPreviewProfile(preview, sides) };
}

// ---------------------------------------------------------------------------------------------------------------------
// Laying the three drawings out (the dialog only paints what is worked out here).
// ---------------------------------------------------------------------------------------------------------------------

/** Dots of room left and right of every drawing, so an end of the board never touches the edge of its box. */
export const BRD_PREVIEW_PAD_X = 10;

/** Dots of room above and below every drawing. */
export const BRD_PREVIEW_PAD_Y = 8;

/** A line standing across (or up through) the board at one slice, in screen dots. */
export interface BrdSliceLine {
  number: number;
  x: number;
  y1: number;
  y2: number;
}

/** The top view: the outline mirrored about the stringer, nose at the left. */
export interface BrdTopFrame {
  height: number;
  /** The closed outline: the right half tail to nose, then the left half back. */
  outline: P2[];
  /** The stringer's line, end to end. */
  stringer: { x1: number; x2: number; y: number };
  slices: BrdSliceLine[];
}

/**
 * The side view: bottom and deck along the stringer, nose at the left, deck up. Its height is stretched by the Height pick
 * (`heightFactor`, 1 being true height); along the board it keeps the top view's own scale.
 */
export interface BrdSideFrame {
  height: number;
  /** How many times true height the side view is drawn: BOTTOM's Height ×1 ×2 ×4 ×8. */
  heightFactor: SectionHeight;
  /** The closed board: along the bottom, back along the deck. */
  outline: P2[];
  bottom: P2[];
  deck: P2[];
  /** The bottom at the rail before the rails are shaped, through the same scales; null when it is the stringer's line. */
  rail: P2[] | null;
  slices: BrdSliceLine[];
}

/** One slice drawn large: the whole cross-section, mirrored about the stringer. */
export interface BrdSliceFrame {
  number: number;
  /** The closed shape: the right half stringer-bottom round to stringer-deck, then the left half back. */
  outline: P2[];
  /** The slice's own knots, on its right half. */
  knots: P2[];
  /** The stringer, top to bottom of the box. */
  stringer: { x: number; y1: number; y2: number };
}

/** All three drawings for a box this wide. Every slice is drawn at the one scale (`sliceScale`), so stepping shows real change. */
export interface BrdPreviewFrames {
  width: number;
  /** Dots to a millimetre along the board, shared by the top and side views; the side view's height is this times its Height pick. */
  scale: number;
  sliceScale: number;
  length: number;
  top: BrdTopFrame;
  side: BrdSideFrame;
  /** The height of the slice box, the same for every slice so it never jumps while stepping. */
  sliceHeight: number;
  slices: BrdSliceFrame[];
}

/** The x a station draws at: the nose is at the left, so station 0 (the tail) is at the right end. */
export function brdStationX(frames: Pick<BrdPreviewFrames, "scale" | "length">, station: number): number {
  return BRD_PREVIEW_PAD_X + (frames.length - station) * frames.scale;
}

/** The station standing at an x in the top or side view: `brdStationX` undone. */
export function brdStationAtX(frames: Pick<BrdPreviewFrames, "scale" | "length">, x: number): number {
  return frames.length - (x - BRD_PREVIEW_PAD_X) / frames.scale;
}

/** Lays the preview out for a box `width` dots wide: see `BrdPreviewFrames`. */
export function brdPreviewFrames(
  preview: BrdPreview,
  width: number,
  extras: { railBottom?: readonly P2[] | null; height?: SectionHeight } = {},
): BrdPreviewFrames {
  const length = preview.length;
  const room = Math.max(width - 2 * BRD_PREVIEW_PAD_X, 1);
  const scale = room / length;
  const at = { scale, length };
  const sx = (station: number) => brdStationX(at, station);

  // Top view.
  const halfMax = Math.max(...preview.outline.map(([, hw]) => hw));
  const topCentre = BRD_PREVIEW_PAD_Y + halfMax * scale;
  const upper = preview.outline.map(([station, hw]): P2 => [sx(station), topCentre - hw * scale]);
  const lower = preview.outline.map(([station, hw]): P2 => [sx(station), topCentre + hw * scale]).reverse();
  const top: BrdTopFrame = {
    height: 2 * topCentre,
    outline: [...upper, ...lower],
    stringer: { x1: sx(length), x2: sx(0), y: topCentre },
    slices: preview.slices.map((slice) => ({
      number: slice.number,
      x: sx(slice.station),
      y1: topCentre - slice.halfWidth * scale,
      y2: topCentre + slice.halfWidth * scale,
    })),
  };

  // Side view: the heights are stretched by the Height pick, the lengths never are, so a slice's line in the top view stays
  // directly above its line here.
  const stretch = extras.height ?? 1;
  const rail = extras.railBottom ?? null;
  const high = Math.max(...preview.deck.map(([, h]) => h), ...(rail ?? []).map(([, h]) => h));
  const low = Math.min(...preview.bottom.map(([, h]) => h), ...(rail ?? []).map(([, h]) => h));
  const sy = (heightMm: number) => BRD_PREVIEW_PAD_Y + (high - heightMm) * scale * stretch;
  const bottomLine = preview.bottom.map(([station, h]): P2 => [sx(station), sy(h)]);
  const deckLine = preview.deck.map(([station, h]): P2 => [sx(station), sy(h)]);
  const side: BrdSideFrame = {
    height: 2 * BRD_PREVIEW_PAD_Y + (high - low) * scale * stretch,
    heightFactor: stretch,
    outline: [...bottomLine, ...[...deckLine].reverse()],
    bottom: bottomLine,
    deck: deckLine,
    rail: rail ? rail.map(([station, h]): P2 => [sx(station), sy(h)]) : null,
    slices: preview.slices.map((slice) => ({
      number: slice.number,
      x: sx(slice.station),
      y1: sy(slice.bottom),
      y2: sy(slice.deck),
    })),
  };

  // The slices: one scale for all, the widest filling the box.
  const reachMax = Math.max(...preview.slices.map((slice) => slice.reach));
  const sliceScale = room / (2 * reachMax);
  const ups = preview.slices.flatMap((slice) => slice.section.map(([, up]) => up));
  const upMax = Math.max(...ups);
  const upMin = Math.min(...ups);
  const centreX = width / 2;
  const uy = (up: number) => BRD_PREVIEW_PAD_Y + (upMax - up) * sliceScale;
  const slices = preview.slices.map((slice): BrdSliceFrame => {
    const right = slice.section.map(([out, up]): P2 => [centreX + out * sliceScale, uy(up)]);
    const left = slice.section.map(([out, up]): P2 => [centreX - out * sliceScale, uy(up)]).reverse();
    return {
      number: slice.number,
      outline: [...right, ...left],
      knots: slice.knots.map(([out, up]): P2 => [centreX + out * sliceScale, uy(up)]),
      stringer: { x: centreX, y1: uy(upMax), y2: uy(upMin) },
    };
  });

  return {
    width,
    scale,
    sliceScale,
    length,
    top,
    side,
    sliceHeight: 2 * BRD_PREVIEW_PAD_Y + (upMax - upMin) * sliceScale,
    slices,
  };
}

/**
 * The side view opens this many times true height (the founder, 2026-11-12: the same ×1 ×2 ×4 ×8 buttons as BOTTOM's
 * cross-section, opening at ×4).
 */
export const BRD_PREVIEW_SIDE_HEIGHT: SectionHeight = 4;

/** The words a shaper reads, in the system they picked: see `brdPreviewWords`. */
export interface BrdPreviewWords {
  /** Length × width, as the file's own p01 and p04 say. */
  dims: string;
  /** The thickness along the stringer, the file's own p03, as a dim. */
  stringer: string;
  /** The side profile's maximum thickness, from the board maths, as a dim. */
  profileMax: string;
  /** The widest gap between neighbouring slices, as a dim. */
  gap: string;
  /** Where each slice stands from the tail, as a dim, in slice order. */
  stations: string[];
}

/**
 * The preview's dims line, the two thicknesses, the gap and the stations in `system`, through `units.ts` and
 * `measure-display.ts`. `maxThickness` is the side profile's maximum (`BrdPreviewProfile`).
 */
export function brdPreviewWords(preview: BrdPreview, system: UnitsSystem, maxThickness: Mm): BrdPreviewWords {
  const dims =
    system === "metric"
      ? `${[preview.length, preview.width].map(formatCentimetres).join(" × ")} cm`
      : [formatFeetInches(preview.length), formatInchesFraction(preview.width)].join(" × ");
  return {
    dims,
    stringer: formatDim(preview.thickness, system),
    profileMax: formatDim(maxThickness, system),
    gap: formatDim(preview.widestGap, system),
    stations: preview.slices.map((slice) => formatDim(slice.station, system)),
  };
}
