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
import { centimetresToMm, mm, type Mm } from "../geometry/units";
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

/** A file's sections, as made and as read back. */
export interface BrdFileWithPreview {
  name: string;
  data: Uint8Array;
  sectionCount: number;
  preview: BrdPreview;
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
 * The board file for a surface and its preview, read back from the very bytes the file is made of: `data` is the array
 * `brdFile` returned, untouched, so what Save downloads is what was drawn.
 */
export function brdFileWithPreview(surface: BoardSurface, boardName: string, options: BrdOptions = {}): BrdFileWithPreview {
  const file = brdFile(surface, boardName, options);
  const preview = brdPreview(readBrdText(unscrambleBrd(file.data)));
  return { name: file.name, data: file.data, sectionCount: file.sectionCount, preview };
}
