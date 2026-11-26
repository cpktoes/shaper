import { describe, expect, it, vi } from "vitest";
// Fitting a board file is slow work, and a busy machine (the whole suite at once) can stretch a case past the default five
// seconds: the cases here are generous rather than flaky.
vi.setConfig({ testTimeout: 60_000 });
import { buildBoardSurface } from "../geometry/board-surface";
import { DEFAULT_BOTTOM, cutKind, resolveBottom, startingCut, takesRailRoll, type BoardBottom, type BottomCutName } from "../geometry/bottom";
import { designBottomBoard, designCrossSectionInput, designFinPlacement, designSideProfile, deriveEffectiveRails, LIVE_DESIGN_RULES } from "../geometry/design";
import { buildOutline } from "../geometry/outline";
import { inchesToMm } from "../geometry/units";
import { phase16Boards } from "../geometry/__fixtures__/phase16-boards";
import { brdBottomStations, brdText } from "./brd";
import { brdLookFromBytes } from "./brd-look";

/**
 * A nose concave with a Rail Roll comes back with its roll (quick 261125-v2f, D-01, D-06). The app's own boards, each with a
 * nose concave written at a depth and a Rail Roll on BOTTOM's own controls, saved as a board file with the app's own writer and
 * opened again through the real import (`brdLookFromBytes`, what Open a board file does). Before this task most of them
 * opened with no roll and a stray 1/16" belly in the centre standing in for it (spike 007, Finding B); now the nose's dish,
 * which turns up again before the rail, brings the nose concave back with its roll and a flat centre and tail.
 */

/** The written board's bytes: the `label` board with `nose` at `depthIn` and a Rail Roll of `rollIn` (none at 0), and a centre cut if given. */
function noseRollBytes(
  label: string,
  nose: BottomCutName,
  depthIn: number,
  rollIn: number,
  centre?: { name: BottomCutName; depthIn: number },
): Uint8Array {
  const f = phase16Boards().find((b) => b.label === label)!.fields;
  const geometry = buildOutline(f.outline);
  const profile = designSideProfile(f, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(f.rails, profile.effectiveFoil, f.railsImportFoilThickness);
  const board = designBottomBoard(f.outline, geometry, profile, designFinPlacement(f));
  const bottom: BoardBottom = structuredClone(DEFAULT_BOTTOM);
  if (depthIn > 0) {
    bottom.nose = { ...startingCut("nose", nose, board), depth: inchesToMm(depthIn) };
    if (rollIn > 0) bottom.nose.railRoll = inchesToMm(rollIn);
  }
  if (centre) bottom.center = { ...startingCut("center", centre.name, board), depth: inchesToMm(centre.depthIn) };
  const surface = buildBoardSurface({
    sections: designCrossSectionInput(geometry, profile, rails, f.outline.length, { bottom, board }),
    geometry,
    rockerAt: profile.rockerAt,
  });
  return Uint8Array.from(brdText(surface, { bottomStations: brdBottomStations(resolveBottom(bottom, board)) }).text, (ch) => ch.charCodeAt(0));
}

/** Opened again: the nose concave is back with its roll and depth within 1/16", nothing in the centre or tail, and the board that opens carries it. */
function expectRollBack(bytes: Uint8Array, depthIn: number, rollIn: number) {
  const result = brdLookFromBytes(bytes, "Rolled.brd");
  if (!result.ok) throw new Error("the file would not read");
  const fitted = result.look.bottom!.bottom;
  const nose = fitted.nose;
  expect(takesRailRoll("nose", nose.name), nose.name).toBe(true);
  expect(nose.railRoll ?? 0).toBeGreaterThan(0);
  expect(Math.abs((nose.railRoll ?? 0) - inchesToMm(rollIn))).toBeLessThanOrEqual(inchesToMm(1 / 16));
  expect(Math.abs(nose.depth - inchesToMm(depthIn))).toBeLessThanOrEqual(inchesToMm(1 / 16));
  expect(cutKind(fitted.center.name), fitted.center.name).toBe("flat");
  expect(cutKind(fitted.tail.name), fitted.tail.name).toBe("flat");
  expect(result.fields?.bottom?.nose.railRoll).toBe(nose.railRoll);
}

describe("brdLookFromBytes on a board with a rolled nose concave and no other cut (quick 261125-v2f)", () => {
  it("the Mid-length with a Blended Nose Concave 3/16\" and a 1/8\" Rail Roll opens with a nose concave, about that roll, and a flat centre", () => {
    expectRollBack(noseRollBytes("midlength|asis|hard", "Blended Nose Concave", 3 / 16, 1 / 8), 3 / 16, 1 / 8);
  });
});
