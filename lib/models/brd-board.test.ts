import { describe, expect, it } from "vitest";
import { brdBottomStations, brdText } from "@/lib/export/brd";
import { brdFitLook } from "@/lib/export/brd-fit-preview";
import { readAnyBrd } from "@/lib/export/brd-read";
import type { P2 } from "@/lib/geometry/bezier-fit";
import { buildBoardSurface } from "@/lib/geometry/board-surface";
import { fitBoardToBrd, type BrdFit } from "@/lib/geometry/brd-fit";
import { DEFAULT_BOTTOM, bottomHasCut, resolveBottom, sectionsFoamOff, startingCut } from "@/lib/geometry/bottom";
import { brdFittedBottomBoard } from "@/lib/geometry/brd-bottom";
import {
  type DesignSummaryFields,
  designBottomBoard,
  designCrossSectionInput,
  designFinPlacement,
  designSideProfile,
  deriveEffectiveRails,
  LIVE_DESIGN_RULES,
} from "@/lib/geometry/design";
import { DEFAULT_FIN_PLACEMENT_SPEC } from "@/lib/geometry/fins";
import { buildOutline } from "@/lib/geometry/outline";
import { effectiveWingRadius, outlineForFins, wingRadiusTop } from "@/lib/geometry/wings";
import { DEFAULT_RAIL_BAND_SPEC } from "@/lib/geometry/rail-bands";
import { inchesToMm, mm } from "@/lib/geometry/units";
import { DEFAULT_VOLUME_SPEC } from "@/lib/geometry/volume";
import { phase16Boards, phase16WingBoards } from "@/lib/geometry/__fixtures__/phase16-boards";
import { BOARD_NAME_MAX_LENGTH, readBoardEntry } from "./board-file";
import { buildSnapshot } from "./design-snapshot";
import { brdBoardFields, brdBoardName } from "./brd-board";

/**
 * The board a closest fit opens as (quick 261113-et0, E1): the fit's outline, rocker and foil on a new board's defaults,
 * read back through the same check a JSON board file passes. The app's own Shortboard and Midlength are written by the
 * app's writer, read by the forgiving reader and fitted, so the right answer is known.
 */

function fitOf(label: string) {
  return fitOfFields([...phase16Boards(), ...phase16WingBoards()].find((b) => b.label === label)!.fields);
}

function fitOfFields(fields: DesignSummaryFields) {
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  const surface = buildBoardSurface({
    sections: designCrossSectionInput(geometry, profile, rails, fields.outline.length),
    geometry,
    rockerAt: profile.rockerAt,
  });
  const read = readAnyBrd(Uint8Array.from(brdText(surface).text, (ch) => ch.charCodeAt(0)));
  if (!read.ok) throw new Error("the app's own file would not read");
  const b = read.board;
  return fitBoardToBrd({ length: b.length, outline: b.outline, bottom: b.bottom, deck: b.deck });
}

/** The outline the way the fit draws its own: a first point off the stringer gets its straight end. */
function drawn(fit: BrdFit): P2[] {
  const points = buildOutline(fit.outline).points.map((p): P2 => [p.station, p.halfWidth]);
  return points[0][1] > 1e-6 ? [[points[0][0], 0], ...points] : points;
}

describe("brdBoardName", () => {
  it("takes the file's name without a final .brd, in any case", () => {
    expect(brdBoardName("6'10 Egg.brd")).toBe("6'10 Egg");
    expect(brdBoardName("BOARD.BRD")).toBe("BOARD");
    expect(brdBoardName("plain")).toBe("plain");
    expect(brdBoardName("a.brd.brd")).toBe("a.brd");
  });
});

describe.each(["shortboard|asis|hard", "midlength|asis|hard"])("brdBoardFields of the fitted %s", (label) => {
  const fit = fitOf(label);
  const fields = brdBoardFields(fit, "My Fit.brd")!;

  it("opens, named after the file", () => {
    expect(fields).not.toBeNull();
    expect(fields.boardName).toBe("My Fit");
  });

  it("carries the fit's outline, rocker and foil exactly, no blank and no bottom", () => {
    expect(fields.outline).toEqual(fit.outline);
    expect(fields.rocker).toEqual(fit.rocker);
    expect(fields.foil).toEqual(fit.foil);
    expect(fields.blank).toBeNull();
    expect("bottom" in fields).toBe(false);
  });

  it("leaves rails, fins and volume at a new board's defaults", () => {
    expect(fields.rails).toEqual(DEFAULT_RAIL_BAND_SPEC);
    expect(fields.fins).toEqual(DEFAULT_FIN_PLACEMENT_SPEC);
    expect(fields.volume).toEqual(DEFAULT_VOLUME_SPEC);
    expect(fields.finsImportTemplate).toBe(true);
    expect(fields.railsImportFoilThickness).toBe(true);
    expect(fields.finSystem).toBe("fcs2");
  });

  it("draws exactly the outline the preview's dashed line showed, point for point", () => {
    const ours = drawn(fit);
    const theirs = buildOutline(fields.outline).points.map((p): P2 => [p.station, p.halfWidth]);
    const theirsDrawn: P2[] = theirs[0][1] > 1e-6 ? [[theirs[0][0], 0], ...theirs] : theirs;
    expect(theirsDrawn).toHaveLength(fit.lines.outline.length);
    for (let i = 0; i < ours.length; i++) {
      expect(theirsDrawn[i][0]).toBeCloseTo(fit.lines.outline[i][0], 9);
      expect(theirsDrawn[i][1]).toBeCloseTo(fit.lines.outline[i][1], 9);
    }
  });

  it("draws exactly the side profile the preview showed at all 201 stations", () => {
    const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
    const centre = fit.lines.bottom[100][1];
    for (let i = 0; i <= 200; i++) {
      const s = mm(fit.lines.bottom[i][0]);
      expect(profile.rockerAt(s)).toBeCloseTo(fit.lines.bottom[i][1] - centre, 9);
      expect(profile.thicknessAt(s)).toBeCloseTo(fit.lines.deck[i][1] - fit.lines.bottom[i][1], 9);
    }
  });
});

describe("brdBoardFields names", () => {
  const fit = fitOf("shortboard|asis|hard");

  it("cuts a very long file name to the board name limit, in whole letters", () => {
    const fields = brdBoardFields(fit, `${"é".repeat(250)}.brd`)!;
    expect(Array.from(fields.boardName)).toHaveLength(BOARD_NAME_MAX_LENGTH);
  });

  it("gives a file with no name a board with an empty name rather than refusing it", () => {
    const fields = brdBoardFields(fit, ".brd");
    expect(fields).not.toBeNull();
    expect(fields!.boardName).toBe("");
  });
});

describe("brdBoardFields with a bottom (quick 261113-gwr)", () => {
  const fit = fitOf("shortboard|asis|hard");
  const board0 = brdFittedBottomBoard(fit);
  const concave = {
    ...structuredClone(DEFAULT_BOTTOM),
    nose: { ...startingCut("nose", "Blended Nose Concave", board0), depth: inchesToMm(3 / 16) },
    center: { ...startingCut("center", "Deep Single Concave", board0), depth: inchesToMm(4 / 16) },
    tail: { ...startingCut("tail", "Double Concave Exit", board0), depth: inchesToMm(2 / 16), troughAt: inchesToMm(4.625) },
  };

  it("carries a bottom that cuts, and it reads back deep-equal through the board reader", () => {
    expect(bottomHasCut(concave)).toBe(true);
    const fields = brdBoardFields(fit, "Cut.brd", concave)!;
    expect(fields.bottom).toEqual(concave);
    const entry = readBoardEntry({ name: fields.boardName, design: buildSnapshot(fields) }, {});
    expect(entry?.fields.bottom).toEqual(concave);
  });

  it("leaves no bottom key for a flat bottom, for none, and for null, as a new board's opening bottom", () => {
    for (const bottom of [DEFAULT_BOTTOM, undefined, null]) expect("bottom" in brdBoardFields(fit, "Flat.brd", bottom)!).toBe(false);
  });

  it("opens a board whose finished stringer is the file's: rocker plus the concave's lift, all 201 stations", () => {
    const text = (() => {
      const f = phase16Boards().find((b) => b.label === "shortboard|asis|hard")!.fields;
      const g = buildOutline(f.outline);
      const p = designSideProfile(f, LIVE_DESIGN_RULES);
      const r = deriveEffectiveRails(f.rails, p.effectiveFoil, f.railsImportFoilThickness);
      const b0 = designBottomBoard(f.outline, g, p, designFinPlacement(f));
      const bottom = { ...structuredClone(DEFAULT_BOTTOM), center: { ...startingCut("center", "Deep Single Concave", b0), depth: inchesToMm(4 / 16) } };
      const surface = buildBoardSurface({ sections: designCrossSectionInput(g, p, r, f.outline.length, { bottom, board: b0 }), geometry: g, rockerAt: p.rockerAt });
      return brdText(surface, { bottomStations: brdBottomStations(resolveBottom(bottom, b0)) }).text;
    })();
    const read = readAnyBrd(Uint8Array.from(text, (ch) => ch.charCodeAt(0)));
    if (!read.ok) throw new Error("the app's own file would not read");
    const look = brdFitLook(read.board);
    expect(look.bottom).not.toBeNull();
    const fields = brdBoardFields(look.fit, "Concave.brd", look.bottom!.bottom)!;
    expect(fields.bottom).toBeDefined();
    const opened = designBottomBoard(fields.outline, buildOutline(fields.outline), designSideProfile(fields, LIVE_DESIGN_RULES), designFinPlacement(fields));
    const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
    const resolved = resolveBottom(fields.bottom!, opened);
    const finished = (s: number) => profile.rockerAt(mm(s)) + sectionsFoamOff(resolved, opened, mm(s), mm(0));
    const L = look.fit.outline.length;
    let worst = 0;
    for (let i = 0; i <= 200; i++) {
      const s = look.fit.lines.bottom[i][0];
      const ours = finished(s) - finished(L / 2);
      const drawn = look.fit.lines.bottom[i][1] - look.fit.lines.bottom[100][1];
      worst = Math.max(worst, Math.abs(ours - drawn));
    }
    expect(worst).toBeLessThan(0.05);
  }, 120_000);
});

describe("brdBoardFields with wings (quick 261113-hyy)", () => {
  const winged = fitOf("wing|shortboard|one");
  const plain = fitOf("shortboard|asis|hard");

  it("keeps the fitted wing exactly, through the board reader, so it opens on the WINGS tab as a wing a shaper added", () => {
    expect(winged.outline.wings).toHaveLength(1);
    const fields = brdBoardFields(winged, "Flyer.brd")!;
    expect(fields.outline.wings).toEqual(winged.outline.wings);
    expect(fields.outline).toEqual(winged.outline);
    expect(fields.outline.wings![0].lock).toBeNull();
    // And the board draws the outline the preview's dashed line showed.
    const theirs = buildOutline(fields.outline).points.map((p): P2 => [p.station, p.halfWidth]);
    const drawnTheirs: P2[] = theirs[0][1] > 1e-6 ? [[theirs[0][0], 0], ...theirs] : theirs;
    const ours = drawn(winged);
    expect(drawnTheirs).toHaveLength(ours.length);
    for (let i = 0; i < ours.length; i++) {
      expect(drawnTheirs[i][0]).toBeCloseTo(ours[i][0], 9);
      expect(drawnTheirs[i][1]).toBeCloseTo(ours[i][1], 9);
    }
  }, 120_000);

  it("leaves a wingless fit with no wings key at all", () => {
    expect("wings" in brdBoardFields(plain, "Plain.brd")!.outline).toBe(false);
  }, 120_000);
});

describe("brdBoardFields with a rounded wing (quick 261113-m5w)", () => {
  // The Shortboard's own wing 1 made a 1 inch step over a 1 inch run, rounded as far as the slider goes, written and read back.
  const one = phase16WingBoards().find((b) => b.label === "wing|shortboard|one")!.fields;
  const step = { depth: inchesToMm(1), run: inchesToMm(1) };
  const rounded = fitOfFields({
    ...one,
    outline: { ...one.outline, wings: [{ ...one.outline.wings![0], ...step, radius: wingRadiusTop(step, "imperial") }] },
  });

  it("keeps the fitted wing, radius included, exactly through the board reader: the WINGS tab's Corner radius opens on it", () => {
    expect(rounded.fileWingCorners[0].rounded).toBe(true);
    expect(rounded.outline.wings![0].radius).toBeGreaterThan(0);
    const fields = brdBoardFields(rounded, "Rounded.brd")!;
    expect(fields.outline.wings).toEqual(rounded.outline.wings);
    expect(fields.outline).toEqual(rounded.outline);
    expect(fields.outline.wings![0].lock).toBeNull();
    expect(effectiveWingRadius(fields.outline.wings![0])).toBeGreaterThan(0);
  }, 120_000);

  it("still reads the step sharp for the fins: outlineForFins takes the radius off", () => {
    const fields = brdBoardFields(rounded, "Rounded.brd")!;
    expect(outlineForFins(fields.outline).wings![0].radius).toBe(0);
    expect(fields.outline.wings![0].radius).not.toBe(0);
  }, 120_000);
});
