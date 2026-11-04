import { describe, expect, it } from "vitest";
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import type { BoardSideProfile } from "./board-profile";
import { LIVE_DESIGN_RULES, designSideProfile } from "./design";
import { buildOutline } from "./outline";
import { BOARD_PRESETS, type BoardPreset } from "./presets";
import { buildRackBoardArt, stringerPoints, turnedBoardPoints } from "./rack-art";
import { boxOfPoints, outlineTileArt } from "./screen-tiles";
import { THREE_D_TILE_TURN_RAD, threeDTileArt, threeDTilePicture } from "./three-d-tile-art";
import { mm } from "./units";

/**
 * Phase 16 UI-SPEC §10: the 3D tile's picture — the Board Rack's turn at 50 degrees, lying nose left
 * and deck up, with the deck's stringer. Every expected value is a relation to the app's own
 * functions (CLAUDE.md Rule 1): the presets through `presetDesignFields`, the rack's turn through
 * `turnedBoardPoints` / `stringerPoints`, never a hand-typed number.
 */

const PRESET = Object.fromEntries(BOARD_PRESETS.map((preset) => [preset.id, preset])) as Record<
  BoardPreset["id"],
  BoardPreset
>;

function boardCase(preset: BoardPreset) {
  const fields = presetDesignFields(preset);
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  return { name: preset.name, geometry, profile, art: buildRackBoardArt(profile, geometry) };
}

const CASES = BOARD_PRESETS.map(boardCase);
const named = CASES.map((c) => [c.name, c] as const);

/** Every coordinate pair in a path written by `polylinePath` ("M x y L x y … [Z]"). */
function pathPoints(d: string): { x: number; y: number }[] {
  const numbers = d
    .replace(/[MLZ]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(Number);
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < numbers.length; i += 2) out.push({ x: numbers[i], y: numbers[i + 1] });
  return out;
}

function parseViewBox(viewBox: string) {
  const [minX, minY, width, height] = viewBox.split(" ").map(Number);
  return { minX, minY, width, height };
}

describe("threeDTileArt — the 3D tile: the rack's turn at 50 degrees, lying nose left", () => {
  it("turns the board 50 degrees, the 3D screen's first view", () => {
    expect(THREE_D_TILE_TURN_RAD).toBeCloseTo((50 * Math.PI) / 180, 12);
  });

  it.each(named)("%s: the board is the rack's turned outline, laid nose left and deck up", (_, c) => {
    const drawn = pathPoints(threeDTileArt(c.art).board);
    const turned = turnedBoardPoints(c.art, THREE_D_TILE_TURN_RAD);
    expect(drawn).toHaveLength(turned.length);
    turned.forEach((p, i) => {
      expect(drawn[i].x).toBeCloseTo(-p.station, 1);
      expect(drawn[i].y).toBeCloseTo(-p.x, 1);
    });
  });

  it.each(named)("%s: the view box is the board's own box with 4% of its longer side all round", (_, c) => {
    const art = threeDTileArt(c.art);
    const box = boxOfPoints(pathPoints(art.board));
    const vb = parseViewBox(art.viewBox);
    const pad = 0.04 * Math.max(box.width, box.height);
    expect(vb.minX).toBeCloseTo(box.minX - pad, 1);
    expect(vb.minY).toBeCloseTo(box.minY - pad, 1);
    expect(vb.width).toBeCloseTo(box.width + 2 * pad, 1);
    expect(vb.height).toBeCloseTo(box.height + 2 * pad, 1);
    // The stringer lies on the board, so inside the picture too.
    for (const p of pathPoints(art.stringer)) {
      expect(p.x).toBeGreaterThanOrEqual(vb.minX);
      expect(p.x).toBeLessThanOrEqual(vb.minX + vb.width);
      expect(p.y).toBeGreaterThanOrEqual(vb.minY);
      expect(p.y).toBeLessThanOrEqual(vb.minY + vb.height);
    }
  });

  it.each(named)("%s: the nose, the greatest station, is the leftmost point", (_, c) => {
    const drawn = pathPoints(threeDTileArt(c.art).board);
    const leftmost = Math.min(...drawn.map((p) => p.x));
    expect(leftmost).toBeCloseTo(-c.art.length, 1);
  });

  it.each(named)("%s: the board's path is closed and the stringer's open", (_, c) => {
    const art = threeDTileArt(c.art);
    expect(art.board.endsWith(" Z")).toBe(true);
    expect(art.stringer).not.toContain("Z");
    expect(art.stringer.startsWith("M ")).toBe(true);
  });

  it.each(named)("%s: the stringer is the rack's own, deck up, so the nose's rocker kicks up", (_, c) => {
    const drawn = pathPoints(threeDTileArt(c.art).stringer);
    const rack = stringerPoints(c.art, THREE_D_TILE_TURN_RAD);
    expect(drawn).toHaveLength(rack.length);
    rack.forEach((p, i) => {
      expect(drawn[i].x).toBeCloseTo(-p.station, 1);
      expect(drawn[i].y).toBeCloseTo(-p.x, 1);
    });
    // Deck up: the stringer at the nose stands higher in the picture (a smaller y) than at the middle.
    const middle = drawn[Math.floor(drawn.length / 2)];
    expect(drawn[drawn.length - 1].y).toBeLessThan(middle.y);
  });

  it("a swallow's stringer starts at the crotch of its notch; every other tail's at the tail", () => {
    const fish = CASES.find((c) => c.name === PRESET.fish.name)!;
    expect(fish.art.notch).not.toBeNull();
    expect(pathPoints(threeDTileArt(fish.art).stringer)[0].x).toBeCloseTo(-fish.geometry.centreCloseStation, 1);
    for (const c of CASES.filter((c) => c.art.notch === null)) {
      expect(pathPoints(threeDTileArt(c.art).stringer)[0].x).toBeCloseTo(0, 6);
    }
  });

  it("a board whose rack art can't be worked out throws before a picture is built — the tile's fallback trigger", () => {
    const good = CASES[0];
    const broken: BoardSideProfile = { ...good.profile, rockerAt: () => mm(Number.NaN) };
    expect(() => threeDTileArt(buildRackBoardArt(broken, good.geometry))).toThrow(/not a finite number/);
  });
});

describe("threeDTilePicture — what the tile draws, with its fallback", () => {
  it.each(named)("%s: a board that turns shows the turned picture", (_, c) => {
    expect(threeDTilePicture(c.profile, c.geometry)).toEqual({ kind: "turned", ...threeDTileArt(c.art) });
  });

  it("a board whose turn can't be worked out shows TEMPLATE's lying outline instead of breaking the menu", () => {
    const good = CASES[0];
    const broken: BoardSideProfile = { ...good.profile, rockerAt: () => mm(Number.NaN) };
    expect(threeDTilePicture(broken, good.geometry)).toEqual({
      kind: "fallback",
      ...outlineTileArt(good.geometry, "lying"),
    });
  });
});
