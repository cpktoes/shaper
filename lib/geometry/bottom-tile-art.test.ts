import { describe, expect, it } from "vitest";
import { phase16Boards } from "./__fixtures__/phase16-boards";
import { DEFAULT_BOTTOM, resolveBottom, startingChannels, startingCut, type BoardBottom, type BottomBoard } from "./bottom";
import { bottomPencilLines, bottomShadeBands, TILE_GRID } from "./bottom-draw";
import { bottomTileArt, bottomTileLine } from "./bottom-tile-art";
import { designBottomBoard, designFinPlacement, designSideProfile, LIVE_DESIGN_RULES } from "./design";
import { buildOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
import { outlineTileArt } from "./screen-tiles";
import { mm } from "./units";

/* The tile is a copy of the board's own drawing, every figure the app's (CLAUDE.md Rule 1). */

const BOARDS = BOARD_PRESETS.map((preset) => {
  const label = `${preset.id}|asis|${preset.rails.tailHardEdge ? "hard" : "soft"}`;
  const fields = phase16Boards().find((b) => b.label === label)!.fields;
  const geometry = buildOutline(fields.outline);
  const board: BottomBoard = designBottomBoard(fields.outline, geometry, designSideProfile(fields, LIVE_DESIGN_RULES), designFinPlacement(fields));
  return { id: preset.id, geometry, board };
});

function cut(board: BottomBoard, change: (b: BoardBottom) => void): BoardBottom {
  const bottom = structuredClone(DEFAULT_BOTTOM);
  change(bottom);
  return bottom;
}

describe("the BOTTOM tile's line (UI-SPEC § Copywriting)", () => {
  const { board } = BOARDS[0];
  it("reads All flat, 1 cut, n cuts, then the channels", () => {
    expect(bottomTileLine(resolveBottom(DEFAULT_BOTTOM, board))).toBe("All flat");
    const one = cut(board, (b) => (b.center = startingCut("center", "Deep Single Concave", board)));
    expect(bottomTileLine(resolveBottom(one, board))).toBe("1 cut");
    const two = cut(board, (b) => {
      b.center = startingCut("center", "Deep Single Concave", board);
      b.tail = startingCut("tail", "Panel Vee", board);
    });
    expect(bottomTileLine(resolveBottom(two, board))).toBe("2 cuts");
    const twoSix = cut(board, (b) => {
      b.center = startingCut("center", "Deep Single Concave", board);
      b.tail = startingCut("tail", "Panel Vee", board);
      b.channels = startingChannels(6, board, b.channels);
    });
    expect(bottomTileLine(resolveBottom(twoSix, board))).toBe("2 cuts · 6 channels");
    const channelsAlone = cut(board, (b) => (b.channels = startingChannels(8, board, b.channels)));
    expect(bottomTileLine(resolveBottom(channelsAlone, board))).toBe("8 channels");
    // a cut taken to no depth cuts nothing
    const none = cut(board, (b) => (b.center = { ...startingCut("center", "Deep Single Concave", board), depth: mm(0) }));
    expect(bottomTileLine(resolveBottom(none, board))).toBe("All flat");
  });
});

describe("the BOTTOM tile's picture (UI-SPEC §9)", () => {
  it.each(BOARDS.map((b) => [b.id, b] as const))("%s: a flat board is TEMPLATE's lying board and its cutting line at the wide point, never a made-up cut", (_id, t) => {
    const art = bottomTileArt(t.geometry, resolveBottom(DEFAULT_BOTTOM, t.board), t.board);
    const template = outlineTileArt(t.geometry, "lying");
    expect(art.board).toBe(template.board);
    expect(art.viewBox).toBe(template.viewBox);
    expect(art.shade).toEqual([]);
    expect(art.pencil).toBe("");
    expect(art.cutLine.x1).toBe(-t.board.widePoint);
    expect(art.cutLine.x2).toBe(-t.board.widePoint);
    // across the whole board there, inside the tile's own air
    const [minX, minY, w, h] = template.viewBox.split(" ").map(Number);
    expect(art.cutLine.y1).toBeLessThan(-t.board.railAt(t.board.widePoint));
    expect(art.cutLine.y2).toBeGreaterThan(t.board.railAt(t.board.widePoint));
    expect(art.cutLine.y1).toBeGreaterThanOrEqual(minY);
    expect(art.cutLine.y2).toBeLessThanOrEqual(minY + h);
    expect(art.cutLine.x1).toBeGreaterThanOrEqual(minX);
    expect(art.cutLine.x1).toBeLessThanOrEqual(minX + w);
  });

  it.each(BOARDS.map((b) => [b.id, b] as const))("%s: a cut board carries its own shade at 40 × 12, a path per level, and its pencil lines", (_id, t) => {
    const bottom = cut(t.board, (b) => {
      b.center = startingCut("center", "Early Double Concave", t.board);
      b.channels = startingChannels(6, t.board, b.channels);
    });
    const resolved = resolveBottom(bottom, t.board);
    const art = bottomTileArt(t.geometry, resolved, t.board);
    const levels = bottomShadeBands(resolved, t.board, TILE_GRID);
    expect(art.shade).toHaveLength(levels.length);
    expect(art.shade.length).toBeGreaterThan(0);
    art.shade.forEach((d, q) => expect(d.match(/M/g)!.length).toBe(levels[q].rects.length));
    const runs = bottomPencilLines(resolved, t.board, null).flatMap((l) => l.runs);
    expect(art.pencil.match(/M/g)!.length).toBe(runs.length);
  });
});
