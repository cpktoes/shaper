/**
 * The BOTTOM screen's small picture in the ☰ menu's screen tiles (Phase 17, UI-SPEC §9), and the tile's line.
 *
 * TEMPLATE's board lying nose left (`outlineTileArt(geometry, "lying")`) with THIS board's own bottom on it: the shade
 * (`bottomShadeBands`, the top view's own function on a coarse 40 × 12 grid), its pencil lines, and the section's
 * cutting line at the wide point — which is what tells a flat board's tile from TEMPLATE's. Never a made-up cut: a
 * flat board's tile is the board and its cutting line alone (the tiles' rule, "never a made-up number").
 *
 * Every coordinate is in the board's own millimetres, laid as TEMPLATE's tile lays them (x = −station, y = across), so
 * the browser fits it into the tile with `preserveAspectRatio` meet and the proportions stay true.
 *
 * Pure (CLAUDE.md Rule 1): no React, browser or database import.
 */
import { BOTTOM_SECTIONS, type BottomBoard, type ResolvedBottom } from "./bottom";
import { bottomPencilLines, bottomShadeBands, polylinesPathData, shadePathData, TILE_GRID, type BoardToDrawing } from "./bottom-draw";
import type { OutlineGeometry } from "./outline";
import { outlineTileArt } from "./screen-tiles";
import { mm } from "./units";

/** The tile's map: TEMPLATE's tile's own, nose left. */
const LYING: BoardToDrawing = (s, y) => ({ x: -s, y });

/** The cutting line stands past the rail by this share of the board's length either side — inside the 4% of air
 * TEMPLATE's tile leaves round the board. */
const CUT_LINE_REACH = 0.02;

/** What the BOTTOM tile draws, every path in the board's own millimetres (lying, nose left). */
export interface BottomTileArt {
  viewBox: string;
  /** The board's outline, closed (TEMPLATE's tile's). */
  board: string;
  /** One path per 1/32" level of shade, shallowest first — none on a flat bottom. */
  shade: string[];
  /** Every pencil line, one path — empty on a flat bottom. */
  pencil: string;
  /** The section's cutting line, across the board at the wide point. */
  cutLine: { x1: number; y1: number; x2: number; y2: number };
}

/**
 * The BOTTOM tile's picture (UI-SPEC §9): TEMPLATE's lying board, this board's shade at 40 × 12 and its pencil lines,
 * and the cutting line at the wide point.
 */
export function bottomTileArt(geometry: OutlineGeometry, resolved: ResolvedBottom, board: BottomBoard): BottomTileArt {
  const base = outlineTileArt(geometry, "lying");
  const shade = bottomShadeBands(resolved, board, TILE_GRID).map((level) => shadePathData(level.rects, LYING));
  const pencil = polylinesPathData(bottomPencilLines(resolved, board, null).flatMap((line) => line.runs), LYING);
  const reach = board.railAt(mm(board.widePoint)) + CUT_LINE_REACH * board.length;
  return {
    viewBox: base.viewBox,
    board: base.board,
    shade,
    pencil,
    cutLine: { x1: -board.widePoint, y1: -reach, x2: -board.widePoint, y2: reach },
  };
}

/**
 * The BOTTOM tile's line (UI-SPEC § Copywriting, the tile line): `All flat`, `1 cut` or `{n} cuts` — the sections that
 * cut anything — then ` · {k} channels`; channels alone read `{k} channels`.
 */
export function bottomTileLine(resolved: ResolvedBottom): string {
  const cuts = BOTTOM_SECTIONS.filter((section) => resolved[section].kind !== "flat" && resolved[section].depth > 0).length;
  const ch = resolved.channels;
  const channels = ch.count >= 4 && ch.depth > 0 ? `${ch.count} channels` : null;
  if (cuts === 0) return channels ?? "All flat";
  const cutWords = cuts === 1 ? "1 cut" : `${cuts} cuts`;
  return channels ? `${cutWords} · ${channels}` : cutWords;
}
