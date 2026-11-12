/**
 * The side profile at the stringer and at the rail (quick 261112-lmr; the founder, 2026-11-12: "two overlaid side
 * profiles: what the profile looks like along the stringer, and what the profile looks like at the rail, assuming a
 * rectangular blank cross section — before rails have been shaped").
 *
 * A concave takes foam off the middle of the bottom and leaves the rail where the planed blank put it, so the line along
 * the stringer scoops while the line at the rail stays on the rocker; a vee or belly does the opposite and lifts the rail.
 * Seeing both beside each other shows how the contours change the flow of the rocker.
 *
 * It reads exactly what BOTTOM already has — the resolved bottom, the `BottomBoard` and the planed side profile's rocker
 * and thickness — so the Board file preview uses it now and the BOTTOM page can call it unchanged next.
 *
 * The stringer's foam off is `foamOff` at 0 (DATA's "stringer left" basis, channels take exactly nothing there) and the
 * rail's is `sectionsFoamOff` at the rail (DATA's "rail lift": channels are cut after the rails are shaped and never
 * count at the rail — the founder's "Match RAILS" ruling, 2026-11-11). So channels change neither line.
 *
 * Pure: no React, browser or database import (CLAUDE.md Rule 1).
 */
import type { BoardSideProfile } from "./board-profile";
import { foamOff, sectionsFoamOff, type BottomBoard, type ResolvedBottom } from "./bottom";
import { inchesToMm, mm, type Mm } from "./units";

/** How far apart the lines are read along the board: every 1/4" (agrees with a half-millimetre scan to under 0.001 mm). */
export const SIDE_PROFILE_STEP: Mm = inchesToMm(1 / 4);

/** The planed side profile's two readers, which is all the maths needs of it. */
export type SideProfileReader = Pick<BoardSideProfile, "rockerAt" | "thicknessAt">;

/** One station of the two side profiles, every length in millimetres. */
export interface SideProfilePoint {
  /** Distance from the tail. */
  station: Mm;
  /** The foam the contours take off the bottom along the stringer (channels take nothing there). */
  stringerFoamOff: Mm;
  /** The foam the vees, bellies and concaves lift off at the rail, before the rails are shaped (never a channel). */
  railFoamOff: Mm;
  /** The planed bottom's height above its lowest point: the rocker. */
  planedBottom: Mm;
  /** The bottom along the stringer: the rocker raised by the foam taken off there. */
  stringerBottom: Mm;
  /** The bottom at the rail on the planed blank: the rocker raised by the lift there. */
  railBottom: Mm;
  /** The deck: the rocker plus the planed thickness — one line, as the blank is rectangular across before the rails are shaped. */
  deck: Mm;
}

/**
 * Both side profiles at one station, clamped to the board's length. Inside a swallow's notch the stringer is air; this
 * reads it as the file does, the tail written square, so the line carries on through.
 */
export function sideProfileAt(resolved: ResolvedBottom, board: BottomBoard, profile: SideProfileReader, s: Mm): SideProfilePoint {
  const station = mm(Math.min(Math.max(s, 0), board.length));
  const stringerFoamOff = foamOff(resolved, board, station, mm(0));
  const railFoamOff = sectionsFoamOff(resolved, board, station, board.railAt(station));
  const planedBottom = profile.rockerAt(station);
  return {
    station,
    stringerFoamOff,
    railFoamOff,
    planedBottom,
    stringerBottom: mm(planedBottom + stringerFoamOff),
    railBottom: mm(planedBottom + railFoamOff),
    deck: mm(planedBottom + profile.thicknessAt(station)),
  };
}

/** The stations the lines are read at: the tail, every `SIDE_PROFILE_STEP`, and the length itself (never twice). */
export function sideProfileStations(board: Pick<BottomBoard, "length">): Mm[] {
  const stations: Mm[] = [];
  for (let s = 0; s < board.length; s += SIDE_PROFILE_STEP) stations.push(mm(s));
  stations.push(board.length);
  return stations;
}

/** The whole board's two side profiles and the two thicknesses a shaper quotes. */
export interface SideProfileLines {
  points: SideProfilePoint[];
  /** The most, along the board, of the deck down to the bottom along the stringer. */
  stringerThickness: Mm;
  /** The most, along the board, of the deck down to whichever bottom line is lower. */
  maxThickness: Mm;
}

/** Both side profiles tail to nose, and their thicknesses. */
export function sideProfileLines(resolved: ResolvedBottom, board: BottomBoard, profile: SideProfileReader): SideProfileLines {
  const points = sideProfileStations(board).map((s) => sideProfileAt(resolved, board, profile, s));
  let stringerThickness = 0;
  let maxThickness = 0;
  for (const p of points) {
    stringerThickness = Math.max(stringerThickness, p.deck - p.stringerBottom);
    maxThickness = Math.max(maxThickness, p.deck - Math.min(p.stringerBottom, p.railBottom));
  }
  return { points, stringerThickness: mm(stringerThickness), maxThickness: mm(maxThickness) };
}
