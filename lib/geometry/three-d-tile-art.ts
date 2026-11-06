/**
 * The 3D screen's small picture (Phase 16, UI-SPEC §10): the board turned three-quarters, drawn the
 * way the phone menu's other screen tiles are drawn.
 *
 * It is the Board Rack's own turn (`rack-art.ts`'s `turnedBoardPoints`), at 50 degrees, with the
 * deck's stringer (`stringerPoints`) on it. It no longer mirrors the 3D screen's first view, which
 * since the shaping bay (D-44) stands behind the tail: it stays a board anyone reads at a glance,
 * laid nose left, like TEMPLATE's tile (x = −station), and deck up (y = −x), like ROCKER's — the
 * rack's standing board turned a quarter turn, so the nose's rocker kicks up.
 *
 * This lives in its own file rather than beside the other tile pictures in `screen-tiles.ts`,
 * because `rack-art.ts` already imports that file: putting the rack's turn there would make the two
 * import each other.
 *
 * Pure, like everything under `lib/geometry/` (CLAUDE.md Rule 1): no React, browser or database
 * imports, so the picture can be checked against the presets in isolation.
 */

import type { BoardSideProfile } from "./board-profile";
import type { OutlineGeometry } from "./outline";
import { buildRackBoardArt, stringerPoints, turnedBoardPoints, type RackBoardArt, type RackPoint } from "./rack-art";
import { boxOfPoints, outlineTileArt, padBox, polylinePath, viewBoxOf } from "./screen-tiles";

/** The turn the 3D tile shows: 50 degrees. */
export const THREE_D_TILE_TURN_RAD = (50 * Math.PI) / 180;

/** The air round the picture, as a share of its longer side — TEMPLATE's tile's own. */
const PADDING = 0.04;

/** A rack point laid nose left (x = −station) and deck up (y = −x). */
function lying(points: readonly RackPoint[]): { x: number; y: number }[] {
  return points.map((p) => ({ x: -p.station, y: -p.x }));
}

/**
 * The 3D tile's picture from a board's rack art: its view box (the turned board's box, padded 4%),
 * the board's closed outline and the stringer's open line, all in the board's own millimetres.
 */
export function threeDTileArt(art: RackBoardArt): { viewBox: string; board: string; stringer: string } {
  const board = lying(turnedBoardPoints(art, THREE_D_TILE_TURN_RAD));
  const stringer = lying(stringerPoints(art, THREE_D_TILE_TURN_RAD));
  return {
    viewBox: viewBoxOf(padBox(boxOfPoints(board), PADDING)),
    board: polylinePath(board, true),
    stringer: polylinePath(stringer, false),
  };
}

/** What the 3D tile draws: the turned board, or — for a board whose turn can't be worked out — the
 * TEMPLATE tile's lying outline instead. */
export type ThreeDTilePicture =
  | ({ kind: "turned" } & ReturnType<typeof threeDTileArt>)
  | ({ kind: "fallback" } & ReturnType<typeof outlineTileArt>);

/**
 * The 3D tile's picture for the board in the design store. The rack's art throws on any value that
 * isn't a finite number (`buildRackBoardArt`); rather than break the whole menu, the tile then shows
 * the board's outline lying down, exactly as TEMPLATE's tile does.
 */
export function threeDTilePicture(profile: BoardSideProfile, geometry: OutlineGeometry): ThreeDTilePicture {
  try {
    return { kind: "turned", ...threeDTileArt(buildRackBoardArt(profile, geometry)) };
  } catch {
    return { kind: "fallback", ...outlineTileArt(geometry, "lying") };
  }
}
