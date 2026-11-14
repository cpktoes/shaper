import { describe, expect, it, vi } from "vitest";
import { brdText } from "../export/brd";
import { readAnyBrd } from "../export/brd-read";
import { isPickable } from "../blanks/catalog";
import { readSeedCatalog, SEED_CSV_DIR } from "../blanks/seed-files";
import { DEFAULT_FIT_DEFAULTS, toFitSettings } from "../fit-defaults-preference";
import { buildBoardSurface } from "./board-surface";
import { DEFAULT_BLANK_CUT } from "./blank";
import { boardOnBlank, judgeBlank, listBlanks, prepareBlank, type PreparedBlank } from "./blank-fit";
import { fitBoardToBrd, lineLowestAt, BRD_FIT_TIP_SKIP_MM, type BrdFit } from "./brd-fit";
import {
  BRD_BEND_MIN_GAIN_MM,
  BRD_BEND_STEP_MM,
  BRD_SUGGEST_STEPS,
  brdBlankFitContext,
  bendsToward,
  suggestBlanks,
  type BrdBlankCut,
} from "./brd-blank-suggest";
import { floorOf, ROCKER_BEND_MIN_FROM_TIP_IN, ROCKER_CHANGE_MAX_MM, withCustomRocker, type BlankRockerSpec } from "./custom-rocker";
import { designCrossSectionInput, designSideProfile, deriveEffectiveRails, LIVE_DESIGN_RULES } from "./design";
import { buildOutline } from "./outline";
import { rockerStationPositions } from "./rocker";
import { inchesToMm, mm, mmToInches } from "./units";
import { phase16Boards } from "./__fixtures__/phase16-boards";
import type { P2 } from "./bezier-fit";
import type { ReadBrdBoard } from "../export/brd-read";

/**
 * Which blank to suggest for a board read from a `.brd` (quick 261113-gwo). The round trip is the best test, because the
 * right answer is known: each preset is shaped in its own blank, written with the app's own `.brd` writer, read back by the
 * forgiving reader and fitted, and that maker's suggestion has to be the preset's own blank. Every expected figure comes from
 * the app's own functions (Rule 1); the surfaces and the catalogue are slow, so each is built once and shared.
 */

// Writing a preset as a .brd and fitting it is slow work, and a busy machine (the whole suite at once) can stretch it past the
// default five seconds: the cases here are generous rather than flaky.
vi.setConfig({ testTimeout: 60_000 });

const MAKERS = ["US Blanks", "Arctic Foam", "Marko Foam", "Millennium Foam"] as const;
const CUT: BrdBlankCut = { deckSkin: DEFAULT_FIT_DEFAULTS.deckSkin, tipStyle: DEFAULT_FIT_DEFAULTS.tipStyle };
const SETTINGS = toFitSettings(DEFAULT_FIT_DEFAULTS);
const PREPARED: PreparedBlank[] = readSeedCatalog(SEED_CSV_DIR).filter(isPickable).map(prepareBlank);

interface Trip {
  file: ReadBrdBoard;
  fit: BrdFit;
  own: { vendor: string; name: string };
}

const BOARDS = phase16Boards();
const trips = new Map<string, Trip>();

function tripOf(label: string): Trip {
  const known = trips.get(label);
  if (known) return known;
  const fields = BOARDS.find((b) => b.label === label)!.fields;
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
  const fit = fitBoardToBrd({ length: b.length, outline: b.outline, bottom: b.bottom, deck: b.deck });
  const trip = { file: b, fit, own: { vendor: fields.blank!.copy.vendor, name: fields.blank!.copy.name } };
  trips.set(label, trip);
  return trip;
}

const suggest = (trip: Trip, over: Partial<Parameters<typeof suggestBlanks>[0]> = {}) =>
  suggestBlanks({
    fit: trip.fit,
    bottom: trip.file.bottom,
    prepared: PREPARED,
    makers: MAKERS,
    cut: CUT,
    settings: SETTINGS,
    ...over,
  });

describe("brdBlankFitContext", () => {
  it("is the board ROCKER would judge with no blank picked: the fit's own length, centre and tips, no fine-tunes", () => {
    const { fit } = tripOf("shortboard|asis|hard");
    const ctx = brdBlankFitContext(fit, CUT);
    expect(ctx.board).toEqual({
      length: fit.outline.length,
      centerThickness: fit.foil.center,
      noseTip: fit.foil.noseTip,
      tailTip: fit.foil.tailTip,
      nose12Offset: 0,
      tail12Offset: 0,
      deckSkin: CUT.deckSkin,
      tipStyle: CUT.tipStyle,
      fineTuneSurface: DEFAULT_BLANK_CUT.fineTuneSurface,
    });
    expect(ctx.widePointStation).toBe(buildOutline(fit.outline).widePointStation);
    expect(ctx.halfWidthAt(mm(fit.outline.length / 2))).toBeGreaterThan(0);
  });
});

describe("suggestBlanks — each preset shaped in its own blank comes back as US Blanks' pick", () => {
  const cases: [string, number][] = [
    ["shortboard|asis|hard", 1],
    ["fish|asis|hard", 1],
    ["midlength|asis|hard", 1],
    ["longboard|asis|hard", 4],
  ];

  it.each(cases)("%s", (label, maxGapMm) => {
    const trip = tripOf(label);
    const result = suggest(trip);
    expect(result.map((s) => s.vendor)).toEqual([...MAKERS]);
    const us = result[0];
    expect(us.pick).not.toBeNull();
    expect(us.pick!.record.vendor).toBe(trip.own.vendor);
    expect(us.pick!.record.name).toBe(trip.own.name);
    expect(us.pick!.gap.largest).toBeLessThan(maxGapMm);
    if (label !== "longboard|asis|hard") expect(us.pick!.bends).toBeNull();
  });

  it("names the four blanks the plan measured", () => {
    const names = cases.map(([label]) => tripOf(label).own.name);
    expect(names).toEqual(['6\'3"RP', '5\'10"RP', '7\'4"SP', '9\'3"Y']);
  });
});

describe("suggestBlanks — what a pick is", () => {
  const trip = tripOf("shortboard|asis|hard");
  const ctx = brdBlankFitContext(trip.fit, CUT);
  const result = suggest(trip);

  it("always fits, at the placement it names", () => {
    for (const { pick } of result) {
      expect(pick).not.toBeNull();
      const prepared = PREPARED.find((p) => p.record === pick!.record)!;
      const verdict = judgeBlank(prepared, ctx, SETTINGS);
      expect(verdict.fits).toBe(true);
      expect(verdict.placement).toBe(pick!.placement);
    }
  });

  it("is its maker's closest: no other fitting blank of that maker has a smaller widest gap", () => {
    const fits = listBlanks(PREPARED, ctx, SETTINGS).fits;
    const L = ctx.board.length;
    const centre = lineLowestAt(trip.file.bottom, L / 2);
    const gapOf = (prepared: PreparedBlank, placement: number) => {
      const ob = boardOnBlank(prepared, ctx.board, mm(placement));
      let largest = 0;
      for (let i = 0; i <= BRD_SUGGEST_STEPS; i++) {
        const s = (L * i) / BRD_SUGGEST_STEPS;
        if (s < BRD_FIT_TIP_SKIP_MM || s > L - BRD_FIT_TIP_SKIP_MM) continue;
        const board = ob.rockerAt(s) - ob.rockerAt(L / 2);
        largest = Math.max(largest, Math.abs(board - (lineLowestAt(trip.file.bottom, s) - centre)));
      }
      return largest;
    };
    for (const { vendor, pick } of result) {
      const rivals = fits.filter((v) => v.prepared.record.vendor === vendor);
      expect(rivals.length).toBeGreaterThan(0);
      const best = Math.min(...rivals.map((v) => gapOf(v.prepared, v.placement)));
      expect(pick!.gap.largest).toBeCloseTo(best, 9);
    }
  });

  it("holds the board's lift on the blank at the four stations a shaper reads, off its own centre", () => {
    const L = ctx.board.length;
    for (const { pick } of result) {
      const prepared = PREPARED.find((p) => p.record === pick!.record)!;
      const ob = boardOnBlank(prepared, ctx.board, pick!.placement);
      const stations = Object.fromEntries(rockerStationPositions(mm(L)).map((s) => [s.key, s.station]));
      for (const key of ["noseTip", "nose12", "tail12", "tailTip"] as const) {
        expect(pick!.lift[key]).toBeCloseTo(ob.rockerAt(stations[key]) - ob.rockerAt(L / 2), 9);
      }
    }
  });

  it("reports where the widest gap is, as a distance from the tail", () => {
    for (const { pick } of result) {
      expect(pick!.gap.at).toBeGreaterThanOrEqual(BRD_FIT_TIP_SKIP_MM - 1e-9);
      expect(pick!.gap.at).toBeLessThanOrEqual(ctx.board.length - BRD_FIT_TIP_SKIP_MM + 1e-9);
    }
  });
});

describe("suggestBlanks — makers", () => {
  const trip = tripOf("shortboard|asis|hard");

  it("gives a maker nothing when no blank of theirs fits, and still one entry per maker, in order", () => {
    const result = suggest(trip, { settings: { ...SETTINGS, extraLength: inchesToMm(200) } });
    expect(result.map((s) => s.vendor)).toEqual([...MAKERS]);
    expect(result.every((s) => s.pick === null)).toBe(true);
  });

  it("answers only for the makers it is given, in the order given", () => {
    const one = suggest(trip, { makers: ["Marko Foam"] });
    expect(one).toHaveLength(1);
    expect(one[0].vendor).toBe("Marko Foam");
    expect(one[0].pick!.record.vendor).toBe("Marko Foam");
    const two = suggest(trip, { makers: ["Millennium Foam", "US Blanks"] });
    expect(two.map((s) => s.vendor)).toEqual(["Millennium Foam", "US Blanks"]);
  });
});

describe("bendsToward", () => {
  const trip = tripOf("shortboard|asis|hard");
  const ctx = brdBlankFitContext(trip.fit, CUT);
  const usRp = PREPARED.find((p) => p.record.vendor === "US Blanks" && p.record.name === '6\'3"RP')!;
  const ordered: BlankRockerSpec = {
    changes: [
      { end: "nose", amount: mm(-inchesToMm(1 / 4)), fromTip: inchesToMm(18) },
      { end: "tail", amount: inchesToMm(1 / 8) },
    ],
  };
  const L = ctx.board.length;
  const bent = boardOnBlank(withCustomRocker(usRp, ordered), ctx.board, mm(0));
  const bottom: P2[] = Array.from({ length: BRD_SUGGEST_STEPS + 1 }, (_, i): P2 => {
    const s = (L * i) / BRD_SUGGEST_STEPS;
    return [s, bent.rockerAt(s)];
  });
  const found = bendsToward(usRp, ctx, mm(0), bottom);

  it("finds a Customize Rocker order that brings a blank to a line made from one", () => {
    expect(found).not.toBeNull();
    expect(found!.largest).toBeLessThan(1);
  });

  it("stays inside Customize Rocker's own limits", () => {
    const centreIn = Math.floor(mmToInches(mm(usRp.lengthMm / 2)) + 1e-9);
    const { changes } = found!.spec;
    expect(changes.filter((c) => c.end === "nose").length).toBeLessThanOrEqual(1);
    expect(changes.filter((c) => c.end === "tail").length).toBeLessThanOrEqual(1);
    for (const change of changes) {
      expect(Math.abs(change.amount)).toBeLessThanOrEqual(ROCKER_CHANGE_MAX_MM + 1e-9);
      const steps = change.amount / BRD_BEND_STEP_MM;
      expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-6);
      const others = { changes: changes.filter((c) => c !== change) };
      expect(change.amount).toBeGreaterThanOrEqual(floorOf(usRp, change, others, BRD_BEND_STEP_MM) - 1e-9);
      if (change.fromTip !== undefined) {
        const inches = mmToInches(change.fromTip);
        expect(Math.abs(inches - Math.round(inches))).toBeLessThan(1e-6);
        expect(Math.round(inches)).toBeGreaterThanOrEqual(ROCKER_BEND_MIN_FROM_TIP_IN);
        expect(Math.round(inches)).toBeLessThan(centreIn);
      }
    }
  });

  it("reports the exact gap, not the straight-line model's: it equals a fresh measurement of the bent blank", () => {
    const ob = boardOnBlank(withCustomRocker(usRp, found!.spec), ctx.board, mm(0));
    const centre = lineLowestAt(bottom, L / 2);
    let largest = 0;
    let at = 0;
    for (let i = 0; i <= BRD_SUGGEST_STEPS; i++) {
      const s = (L * i) / BRD_SUGGEST_STEPS;
      if (s < BRD_FIT_TIP_SKIP_MM || s > L - BRD_FIT_TIP_SKIP_MM) continue;
      const d = Math.abs(ob.rockerAt(s) - ob.rockerAt(L / 2) - (lineLowestAt(bottom, s) - centre));
      if (d > largest) {
        largest = d;
        at = s;
      }
    }
    expect(found!.largest).toBeCloseTo(largest, 9);
    expect(found!.at).toBeCloseTo(at, 9);
  });

  it("is at least 1/16\" closer than the natural blank, or it says nothing", () => {
    const natural = boardOnBlank(usRp, ctx.board, mm(0));
    const centre = lineLowestAt(bottom, L / 2);
    let largest = 0;
    for (let i = 0; i <= BRD_SUGGEST_STEPS; i++) {
      const s = (L * i) / BRD_SUGGEST_STEPS;
      if (s < BRD_FIT_TIP_SKIP_MM || s > L - BRD_FIT_TIP_SKIP_MM) continue;
      largest = Math.max(largest, Math.abs(natural.rockerAt(s) - natural.rockerAt(L / 2) - (lineLowestAt(bottom, s) - centre)));
    }
    expect(largest - found!.largest).toBeGreaterThanOrEqual(BRD_BEND_MIN_GAIN_MM);
  });

  it("says nothing for a line the natural blank already is", () => {
    const natural = boardOnBlank(usRp, ctx.board, mm(0));
    const same: P2[] = Array.from({ length: BRD_SUGGEST_STEPS + 1 }, (_, i): P2 => {
      const s = (L * i) / BRD_SUGGEST_STEPS;
      return [s, natural.rockerAt(s)];
    });
    expect(bendsToward(usRp, ctx, mm(0), same)).toBeNull();
  });
});
