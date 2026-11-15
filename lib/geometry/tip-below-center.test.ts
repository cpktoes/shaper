import { describe, expect, it } from "vitest";
import { isPickable } from "@/lib/blanks/catalog";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { DEFAULT_FIT_DEFAULTS, toFitSettings } from "@/lib/fit-defaults-preference";
import { DEFAULT_BLANK_CUT, type TipStyle } from "./blank";
import { judgeBlank, prepareBlank, type BoardFitContext, type PreparedBlank } from "./blank-fit";
import { DEFAULT_BOARD_SPEC } from "./board";
import { buildBlankProfile } from "./board-profile";
import { DEFAULT_FOIL_SPEC, type FoilStationKey } from "./foil";
import { buildOutline, sampleOutline } from "./outline";
import { TIP_BELOW_CENTER_EPSILON_MM, tipBelowCenterLine, tipsBelowCenter, type TipsBelowCenter } from "./tip-below-center";
import { inchesToMm, mm, type Mm } from "./units";

/**
 * A tip below the board's own centre (quick 261115-dhq; the to-do of 2026-10-02, the founder's pick "Steer it").
 *
 * The named catalogue test the to-do asked for, run on the seeded catalogue through the fit's own judge and the
 * profile every screen reads. The case the to-do was written from — the default 6'0" board with a 1 1/4" centre on
 * the Arctic Foam 7'9" SBF, measured 2026-10-02 — no longer happens: the founder corrected that blank's T12 rocker
 * from 1 1/16" to 1 5/8" on 2026-10-14, and with the default 1/2" and 5/8" tips no fitting blank drops a tip below
 * the centre at any centre tried. A thick tail tip on a thin board still does, on dozens of blanks, which is what
 * the line is for.
 */

/** Judging every seeded blank at several centres is a sweep, not a check: give it the room the fit sweeps get. */
const SWEEP_TIMEOUT_MS = 120_000;
const SETTINGS = toFitSettings(DEFAULT_FIT_DEFAULTS);
const BLANKS: readonly PreparedBlank[] = readSeedCatalog().filter(isPickable).map(prepareBlank);
const GEOMETRY = buildOutline(DEFAULT_BOARD_SPEC.outline);

/** The default 6'0" board at a centre, with the given tips, cut one way or the other. */
function board(centreIn: number, tipStyle: TipStyle, tips = { noseTip: DEFAULT_FOIL_SPEC.noseTip, tailTip: DEFAULT_FOIL_SPEC.tailTip }): BoardFitContext {
  return {
    board: {
      length: DEFAULT_BOARD_SPEC.outline.length,
      centerThickness: inchesToMm(centreIn),
      noseTip: tips.noseTip,
      tailTip: tips.tailTip,
      nose12Offset: mm(0),
      tail12Offset: mm(0),
      ...DEFAULT_BLANK_CUT,
      tipStyle,
    },
    halfWidthAt: (s: Mm) => sampleOutline(GEOMETRY, s),
    widePointStation: GEOMETRY.widePointStation,
  };
}

/** Every fitting blank for the board, with the profile it opens at (the fitting placement nearest the centre). */
function fittingProfiles(ctx: BoardFitContext) {
  const out: { name: string; below: TipsBelowCenter }[] = [];
  for (const prepared of BLANKS) {
    const verdict = judgeBlank(prepared, ctx, SETTINGS);
    if (!verdict.fits) continue;
    const profile = buildBlankProfile(prepared, ctx.board, verdict.placement);
    out.push({ name: `${prepared.record.vendor} ${prepared.record.name}`, below: tipsBelowCenter(profile) });
  }
  return out;
}

const flagged = (rows: { name: string; below: TipsBelowCenter }[]) =>
  rows.filter((r) => r.below.nose !== null || r.below.tail !== null);

function rocker(values: Partial<Record<FoilStationKey, number>>): { stationRocker: Record<FoilStationKey, Mm> } {
  // A healthy rocker: every station well above any centre the cases below set.
  const base: Record<FoilStationKey, Mm> = { tailTip: mm(10), tail12: mm(8), center: mm(0), nose12: mm(20), noseTip: mm(90) };
  for (const [key, v] of Object.entries(values) as [FoilStationKey, number][]) base[key] = mm(v);
  return { stationRocker: base };
}

describe("tipsBelowCenter — reading the side profile", () => {
  it("reports nothing on a board whose tips both rise from the centre", () => {
    expect(tipsBelowCenter(rocker({}))).toEqual({ nose: null, tail: null });
  });

  it("reports an end by the deeper of its tip and its 12\" station, in millimetres under the centre", () => {
    expect(tipsBelowCenter(rocker({ center: 5, tailTip: 2, tail12: 1 }))).toEqual({ nose: null, tail: mm(4) });
    expect(tipsBelowCenter(rocker({ center: 5, noseTip: 4, nose12: 7 }))).toEqual({ nose: mm(1), tail: null });
    expect(tipsBelowCenter(rocker({ center: 5, noseTip: 3, tailTip: 2 }))).toEqual({ nose: mm(2), tail: mm(3) });
  });

  it("never counts float noise", () => {
    expect(tipsBelowCenter(rocker({ center: 5, tail12: 5 - TIP_BELOW_CENTER_EPSILON_MM / 2 }))).toEqual({ nose: null, tail: null });
  });
});

describe("tipBelowCenterLine — the words under Pin tips to", () => {
  it("names the tail and the amount, then the suggestion, in both systems", () => {
    const below = { nose: null, tail: inchesToMm(1 / 4) };
    expect(tipBelowCenterLine(below, "imperial")).toBe(
      "The tail would sit 1/4\" below the board's center. Pin tips to Bottom to keep the rocker above it.",
    );
    expect(tipBelowCenterLine(below, "metric")).toBe(
      "The tail would sit 6 mm below the board's center. Pin tips to Bottom to keep the rocker above it.",
    );
  });

  it("names the nose alone, and both ends in one sentence", () => {
    expect(tipBelowCenterLine({ nose: inchesToMm(1 / 8), tail: null }, "imperial")).toBe(
      "The nose would sit 1/8\" below the board's center. Pin tips to Bottom to keep the rocker above it.",
    );
    expect(tipBelowCenterLine({ nose: inchesToMm(1 / 8), tail: inchesToMm(3 / 16) }, "imperial")).toBe(
      "The nose would sit 1/8\" and the tail 3/16\" below the board's center. Pin tips to Bottom to keep the rocker above it.",
    );
  });

  it("says nothing of a drop the readings beside it would print as nothing", () => {
    // Under half a sixteenth prints as 0 in Imperial; the same drop is a whole millimetre in Metric.
    const tiny = { nose: null, tail: mm(0.6) };
    expect(tipBelowCenterLine(tiny, "imperial")).toBeNull();
    expect(tipBelowCenterLine(tiny, "metric")).toBe(
      "The tail would sit 1 mm below the board's center. Pin tips to Bottom to keep the rocker above it.",
    );
    expect(tipBelowCenterLine({ nose: null, tail: null }, "imperial")).toBeNull();
  });
});

describe("the named catalogue test — the default 6'0\" board on every seeded blank", () => {
  it("with the default tips, no fitting blank drops a tip below the centre at any thin centre, under either cut", () => {
    for (const tipStyle of ["pinDeck", "bottom"] as const) {
      for (const centreIn of [1, 1.25, 1.5, 2.5]) {
        const rows = fittingProfiles(board(centreIn, tipStyle));
        expect(rows.length, `${tipStyle} ${centreIn}" fits`).toBeGreaterThan(0);
        expect(flagged(rows).map((r) => r.name), `${tipStyle} ${centreIn}"`).toEqual([]);
      }
    }
  }, SWEEP_TIMEOUT_MS);

  it("a 1\" centre with a 1\" tail tip under Deck drops the tail on real blanks — never the nose — and Bottom never does", () => {
    const tips = { noseTip: DEFAULT_FOIL_SPEC.noseTip, tailTip: inchesToMm(1) };
    const deck = fittingProfiles(board(1, "pinDeck", tips));
    const dropped = flagged(deck);
    expect(dropped.length).toBeGreaterThanOrEqual(2);
    expect(dropped.every((r) => r.below.nose === null && r.below.tail !== null)).toBe(true);
    const names = dropped.map((r) => r.name);
    expect(names).toContain(`Millennium Foam 6'11"F`);
    expect(names).toContain(`Marko Foam 6'0" M-Thick`);
    // The steer line on the Millennium, the deepest of them: a quarter inch, and read as a mark in Metric.
    const millennium = dropped.find((r) => r.name === `Millennium Foam 6'11"F`)!;
    expect(tipBelowCenterLine(millennium.below, "imperial")).toBe(
      "The tail would sit 1/4\" below the board's center. Pin tips to Bottom to keep the rocker above it.",
    );
    expect(tipBelowCenterLine(millennium.below, "metric")).toBe(
      "The tail would sit 7 mm below the board's center. Pin tips to Bottom to keep the rocker above it.",
    );

    const bottom = fittingProfiles(board(1, "bottom", tips));
    expect(bottom.length).toBeGreaterThan(0);
    expect(flagged(bottom)).toEqual([]);
  }, SWEEP_TIMEOUT_MS);
});
