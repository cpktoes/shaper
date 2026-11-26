import { describe, expect, it } from "vitest";
import { phase16Boards } from "./__fixtures__/phase16-boards";
import {
  BOTTOM_CUT_NAMES,
  BOTTOM_FLOOR,
  BOTTOM_SECTIONS,
  DEFAULT_BOTTOM,
  RAIL_ROLL_SMOOTHNESS,
  bottomDataRows,
  bottomFloorFlags,
  cutFoamOffParts,
  foamOff,
  refAt,
  resolveBottom,
  resolveCut,
  rise,
  sectionsFoamOff,
  smoothstep,
  startingCut,
  takesRailRoll,
  tidyRailRoll,
  type BoardBottom,
  type BottomBoard,
  type BottomCutName,
  type BottomCutSpec,
  type ResolvedCut,
} from "./bottom";
import { bottomPrintLines } from "./bottom-print";
import type { DesignSummaryFields } from "./design";
import {
  bottomRailLift,
  deriveEffectiveRails,
  designBottomBoard,
  designCrossSectionInput,
  designFinPlacement,
  designSideProfile,
  LIVE_DESIGN_RULES,
  railAnchorStations,
  railsOnTheBottom,
  summarizeDesign,
} from "./design";
import { formatBottomDepth, formatMark } from "./measure-display";
import { buildOutline } from "./outline";
import { BOARD_PRESETS } from "./presets";
import { inchesToMm, mm, UNITS_SYSTEMS, type Mm } from "./units";
import { boardSections } from "./volume";

/*
 * A nose concave's Rail Roll (the founder, 2026-11-25, quick 261125-mf8; spike 005's Edge Roll, renamed): above 0 the
 * bottom outside the concave's edge curves up to the rail by that much at the rail, full from the nose tip back to Deepest
 * At, gone by End. It is not in sketch 021, so it has no golden: every expected value here is worked out by the app's own
 * functions (rise, smoothstep, refAt, formatBottomDepth, the constants), none is typed; only inch inputs like
 * inchesToMm(1 / 4) are.
 */

const TOL = 9;
const NOSE_CONCAVES: readonly BottomCutName[] = ["Teardrop Nose Concave", "Blended Nose Concave", "Slight Single Concave Entry"];

function boardOf(fields: DesignSummaryFields): BottomBoard {
  return designBottomBoard(fields.outline, buildOutline(fields.outline), designSideProfile(fields, LIVE_DESIGN_RULES), designFinPlacement(fields));
}

/** The four presets as their cards open them (`asis`, the preset's own Hard Edge). */
const PRESETS = BOARD_PRESETS.map((preset) => {
  const label = `${preset.id}|asis|${preset.rails.tailHardEdge ? "hard" : "soft"}`;
  const fields = phase16Boards().find((b) => b.label === label)!.fields;
  return { id: preset.id, fields, board: boardOf(fields) };
});
const SHORT = PRESETS.find((p) => p.id === "shortboard")!;

/** A bottom whose nose is `name` on its starting numbers, then `patch`; the rest flat. */
function noseBottom(board: BottomBoard, name: BottomCutName, patch: Partial<BottomCutSpec> = {}): BoardBottom {
  return { ...structuredClone(DEFAULT_BOTTOM), nose: { ...startingCut("nose", name, board), ...patch } };
}

/** Stations every 1/2" from the tail to the nose tip, the tip included: ahead of a nose cut's Start too. */
function stationsOf(board: BottomBoard): Mm[] {
  const out: Mm[] = [];
  for (let s = 0; s < board.length; s += inchesToMm(1 / 2)) out.push(mm(s));
  out.push(board.length);
  return out;
}

/** Points across a station from the stringer to the rail, the concave's edge and the rail included. */
function acrossOf(board: BottomBoard, cut: ResolvedCut, s: Mm): Mm[] {
  const W = board.railAt(s);
  const out: Mm[] = [];
  for (let j = 0; j <= 24; j++) out.push(mm((W * j) / 24));
  const C = Math.max(0, refAt(board, "narrowest", s) - cut.offRail);
  if (C < W) out.push(mm(C));
  return out;
}

/** The concave's edge at a station: the reference rail less Off Rail, never below 0. */
const edgeAt = (board: BottomBoard, cut: ResolvedCut, s: Mm) => Math.max(0, refAt(board, "narrowest", s) - cut.offRail);

/** The sections the litres, the 3D board and the floor's rail form read, for a board with this bottom. */
function sectionsOf(fields: DesignSummaryFields, bottom: BoardBottom) {
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  const board = designBottomBoard(fields.outline, geometry, profile, designFinPlacement(fields));
  return boardSections(designCrossSectionInput(geometry, profile, rails, fields.outline.length, { bottom, board }));
}

const ROLL = inchesToMm(1 / 4);

describe("a Rail Roll of 0 is exactly today (quick 261125-mf8, D-04)", () => {
  it.each(PRESETS.map((p) => [p.id, p] as const))("%s: no key and a roll of 0 take the same foam everywhere, ahead of the cut's Start too", (_id, { board }) => {
    for (const name of NOSE_CONCAVES) {
      const keyless = noseBottom(board, name);
      expect("railRoll" in keyless.nose).toBe(false);
      const zero = noseBottom(board, name, { railRoll: mm(0) });
      const a = resolveBottom(keyless, board);
      const b = resolveBottom(zero, board);
      expect(a.nose.railRoll).toBe(0);
      expect(b.nose.railRoll).toBe(0);
      expect(resolveCut("nose", keyless.nose, board).railRoll).toBe(0);
      let ahead = 0;
      for (const s of stationsOf(board)) {
        if (s > a.nose.start) ahead++;
        for (const y of acrossOf(board, a.nose, s)) {
          const pa = cutFoamOffParts(a.nose, board, a.wingRule, s, y);
          const pb = cutFoamOffParts(b.nose, board, b.wingRule, s, y);
          expect(pb.concave).toBe(pa.concave);
          expect(pb.lift).toBe(pa.lift);
          expect(foamOff(b, board, s, y)).toBe(foamOff(a, board, s, y));
          expect(sectionsFoamOff(b, board, s, y)).toBe(sectionsFoamOff(a, board, s, y));
        }
      }
      expect(ahead, `${name}: stations ahead of its Start`).toBeGreaterThan(0);
    }
  });

  it("no name opens with a Rail Roll key, and tidying a cut with none hands back the very same object", () => {
    for (const section of BOTTOM_SECTIONS) {
      for (const name of BOTTOM_CUT_NAMES[section]) {
        const cut = startingCut(section, name, SHORT.board);
        expect("railRoll" in cut, name).toBe(false);
        expect(tidyRailRoll(section, cut)).toBe(cut);
      }
    }
    const zero = { ...startingCut("nose", "Blended Nose Concave", SHORT.board), railRoll: mm(0) };
    const tidy = tidyRailRoll("nose", zero);
    expect("railRoll" in tidy).toBe(false);
    expect(tidy).toEqual(startingCut("nose", "Blended Nose Concave", SHORT.board));
    const rolled = { ...zero, railRoll: ROLL };
    expect(tidyRailRoll("nose", rolled)).toBe(rolled);
  });
});

describe("what a Rail Roll does to the board (quick 261125-mf8, D-02)", () => {
  /** Each nose concave on each preset with a 1/4" roll, beside the same cut with none. */
  const CASES = PRESETS.flatMap(({ id, board }) =>
    NOSE_CONCAVES.map((name) => {
      const rolled = resolveBottom(noseBottom(board, name, { railRoll: ROLL }), board);
      const keyless = resolveBottom(noseBottom(board, name), board);
      return [`${id} ${name}`, { board, rolled, keyless }] as const;
    }),
  );

  it.each(CASES)("%s: nothing changes inside the concave's edge, and the concave's own work never changes", (_label, { board, rolled, keyless }) => {
    expect(rolled.nose.railRoll).toBe(ROLL);
    let inside = 0;
    for (const s of stationsOf(board)) {
      const C = edgeAt(board, rolled.nose, s);
      for (const y of acrossOf(board, rolled.nose, s)) {
        const p = cutFoamOffParts(rolled.nose, board, rolled.wingRule, s, y);
        const q = cutFoamOffParts(keyless.nose, board, keyless.wingRule, s, y);
        expect(p.concave).toBe(q.concave);
        if (y <= C) {
          inside++;
          expect(p.lift).toBe(0);
        }
      }
    }
    expect(inside).toBeGreaterThan(0);
  });

  it.each(CASES)("%s: the whole roll stands at the rail from Deepest At to the nose tip, ahead of the Start too", (_label, { board, rolled }) => {
    const cut = rolled.nose;
    let ahead = 0;
    let checked = 0;
    for (const s of stationsOf(board)) {
      const W = board.railAt(s);
      if (s < cut.deepest || W <= 0 || !(W > edgeAt(board, cut, s))) continue;
      checked++;
      const p = cutFoamOffParts(cut, board, rolled.wingRule, s, mm(W));
      expect(p.lift).toBeCloseTo(cut.railRoll, TOL);
      if (s > cut.start) {
        ahead++;
        expect(p.concave).toBe(0);
      }
    }
    expect(checked).toBeGreaterThan(0);
    expect(ahead).toBeGreaterThan(0);
  });

  it.each(CASES)("%s: between End and Deepest At the roll fades by the app's own smoothstep, and from End back it is gone", (_label, { board, rolled }) => {
    const cut = rolled.nose;
    let between = 0;
    const stations = [...stationsOf(board), cut.end];
    for (const s of stations) {
      const W = board.railAt(s);
      if (W <= 0) continue;
      if (s <= cut.end) {
        for (const y of acrossOf(board, cut, s)) expect(cutFoamOffParts(cut, board, rolled.wingRule, s, y).lift).toBe(0);
        continue;
      }
      if (s >= cut.deepest || !(W > edgeAt(board, cut, s))) continue;
      between++;
      const want = cut.railRoll * smoothstep((s - cut.end) / (cut.deepest - cut.end));
      expect(cutFoamOffParts(cut, board, rolled.wingRule, s, mm(W)).lift).toBeCloseTo(want, TOL);
    }
    expect(between).toBeGreaterThan(0);
  });

  it.each(CASES)("%s: a curved roll from the edge to the rail, below a chine's straight line, never falling outward", (_label, { board, rolled }) => {
    const cut = rolled.nose;
    let curved = 0;
    for (const s of stationsOf(board)) {
      const W = board.railAt(s);
      const C = edgeAt(board, cut, s);
      if (s < cut.deepest || W <= 0 || !(W > C)) continue;
      let last = 0;
      for (let k = 0; k <= 20; k++) {
        const y = mm(C + ((W - C) * k) / 20);
        const u = Math.min(1, (y - C) / (W - C));
        const lift = cutFoamOffParts(cut, board, rolled.wingRule, s, y).lift;
        expect(lift).toBeCloseTo(cut.railRoll * rise(u, RAIL_ROLL_SMOOTHNESS), TOL);
        if (k > 0 && k < 20) {
          curved++;
          expect(lift).toBeLessThan(cut.railRoll * u);
        }
        expect(lift).toBeGreaterThanOrEqual(last);
        last = lift;
      }
    }
    expect(curved).toBeGreaterThan(0);
  });

  it("the roll's curve is the Rolled Vee's own, at its starting Smoothness", () => {
    expect(RAIL_ROLL_SMOOTHNESS * 100).toBe(startingCut("tail", "Rolled Vee", SHORT.board).smoothness);
  });

  it.each(CASES)("%s: a lift, never the stringer, and never held by the floor", (_label, { board, rolled, keyless }) => {
    for (const s of stationsOf(board)) {
      expect(foamOff(rolled, board, s, mm(0))).toBe(foamOff(keyless, board, s, mm(0)));
      const W = board.railAt(s);
      if (s < rolled.nose.deepest || W <= 0 || !(W > edgeAt(board, rolled.nose, s))) continue;
      // nothing else is cut at the rail here, so the bottom's one number there is the roll itself, however thin the foam
      expect(sectionsFoamOff(rolled, board, s, mm(W))).toBeCloseTo(rolled.nose.railRoll, TOL);
    }
  });

  it("a 1/2\" roll runs out to the rail in full where the foam under it is thinner than the floor would allow a concave", () => {
    const board = SHORT.board;
    const big = inchesToMm(1 / 2);
    const rolled = resolveBottom(noseBottom(board, "Blended Nose Concave", { railRoll: big }), board);
    const thin = stationsOf(board).filter((s) => {
      const W = board.railAt(s);
      return s >= rolled.nose.deepest && W > edgeAt(board, rolled.nose, s) && board.thicknessAt(s) - BOTTOM_FLOOR < big;
    });
    expect(thin.length).toBeGreaterThan(0);
    for (const s of thin) expect(sectionsFoamOff(rolled, board, s, mm(board.railAt(s)))).toBeCloseTo(big, TOL);
  });
});

describe("only the three nose concaves take a Rail Roll (quick 261125-mf8, D-01)", () => {
  it("takesRailRoll says yes for exactly the three nose concaves", () => {
    const yes: string[] = [];
    for (const section of BOTTOM_SECTIONS) for (const name of BOTTOM_CUT_NAMES[section]) if (takesRailRoll(section, name)) yes.push(name);
    expect(yes.sort()).toEqual([...NOSE_CONCAVES].sort());
    // the nose concaves' names on another section's key are not nose cuts
    for (const name of NOSE_CONCAVES) {
      expect(takesRailRoll("center", name)).toBe(false);
      expect(takesRailRoll("tail", name)).toBe(false);
    }
  });

  it("a roll stored on any other cut reads 0, takes no foam and is tidied away", () => {
    const board = SHORT.board;
    for (const section of BOTTOM_SECTIONS) {
      for (const name of BOTTOM_CUT_NAMES[section]) {
        if (takesRailRoll(section, name)) continue;
        const keyless = { ...structuredClone(DEFAULT_BOTTOM), [section]: startingCut(section, name, board) };
        const stored = { ...structuredClone(DEFAULT_BOTTOM), [section]: { ...startingCut(section, name, board), railRoll: ROLL } };
        const a = resolveBottom(keyless, board);
        const b = resolveBottom(stored, board);
        expect(b[section].railRoll, name).toBe(0);
        for (const s of stationsOf(board).filter((_, k) => k % 6 === 0)) {
          for (const y of acrossOf(board, a[section], s)) expect(sectionsFoamOff(b, board, s, y)).toBe(sectionsFoamOff(a, board, s, y));
        }
        expect("railRoll" in tidyRailRoll(section, stored[section]), name).toBe(false);
      }
    }
  });

  it("a negative roll, or one that is not a finite number, reads 0, takes no foam and is tidied away", () => {
    const board = SHORT.board;
    const keyless = resolveBottom(noseBottom(board, "Blended Nose Concave"), board);
    for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY, "x" as unknown as number, null as unknown as number]) {
      const stored = noseBottom(board, "Blended Nose Concave", { railRoll: bad as Mm });
      const read = resolveBottom(stored, board);
      expect(read.nose.railRoll, String(bad)).toBe(0);
      for (const s of stationsOf(board).filter((_, k) => k % 4 === 0)) {
        for (const y of acrossOf(board, read.nose, s)) expect(sectionsFoamOff(read, board, s, y)).toBe(sectionsFoamOff(keyless, board, s, y));
      }
      expect("railRoll" in tidyRailRoll("nose", stored.nose), String(bad)).toBe(false);
    }
  });

  it("a nose concave with Depth 0 is not there, so its roll takes no foam anywhere", () => {
    for (const { board } of PRESETS) {
      for (const name of NOSE_CONCAVES) {
        const read = resolveBottom(noseBottom(board, name, { depth: mm(0), railRoll: ROLL }), board);
        for (const s of stationsOf(board)) {
          for (const y of acrossOf(board, read.nose, s)) {
            const p = cutFoamOffParts(read.nose, board, read.wingRule, s, y);
            expect(p.concave).toBe(0);
            expect(p.lift).toBe(0);
            expect(foamOff(read, board, s, y)).toBe(0);
          }
        }
      }
    }
  });
});

describe("what follows a Rail Roll, with no formula of its own (quick 261125-mf8, D-03)", () => {
  it.each(PRESETS.map((p) => [p.id, p] as const))("%s: DATA's Rail lift reads the roll ahead of Deepest At, and RAILS thins the nose rail by it", (_id, { fields, board }) => {
    const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
    const effective = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
    const anchors = railAnchorStations(profile.effectiveFoil, fields.outline.length);
    for (const name of NOSE_CONCAVES) {
      const resolved = resolveBottom(noseBottom(board, name, { railRoll: ROLL }), board);
      const cut = resolved.nose;
      let rows = 0;
      for (const row of bottomDataRows(resolved, board)) {
        const W = board.railAt(row.station);
        if (row.station < cut.deepest || row.width === null || W <= 0 || !(W > edgeAt(board, cut, row.station))) continue;
        rows++;
        expect(row.railLift).toBeCloseTo(cut.railRoll, TOL);
      }
      expect(rows, name).toBeGreaterThan(0);
      const liftAt = bottomRailLift(resolved, board);
      expect(liftAt(anchors.nose), name).toBeCloseTo(cut.railRoll, TOL);
      const rails = railsOnTheBottom(effective, liftAt, anchors);
      expect(rails.nose.boardThickness).toBeCloseTo(Math.max(BOTTOM_FLOOR, effective.nose.boardThickness - liftAt(anchors.nose)), TOL);
      expect(rails.nose.boardThickness).toBeLessThan(effective.nose.boardThickness);
      // The centre and tail rails stand behind the roll's End or in its last fade: the same rail where the lift there is
      // 0, lowered by just that lift where the fade still reaches.
      for (const key of ["center", "tail"] as const) {
        const lift = liftAt(anchors[key]);
        if (lift === 0) expect(rails[key], `${name} ${key}`).toBe(effective[key]);
        else expect(rails[key].boardThickness, `${name} ${key}`).toBeCloseTo(Math.max(BOTTOM_FLOOR, effective[key].boardThickness - lift), TOL);
      }
      // the tail is always behind a nose concave's End
      expect(rails.tail, name).toBe(effective.tail);
    }
  });

  it("the litres fall with a roll, and fall again with a bigger one", () => {
    for (const { id, fields, board } of PRESETS) {
      const litres = [0, 1 / 8, 1 / 4].map((r) => {
        const patch = r > 0 ? { railRoll: inchesToMm(r) } : {};
        return summarizeDesign({ ...fields, bottom: noseBottom(board, "Blended Nose Concave", patch) }).volumeLitres;
      });
      expect(litres[1], id).toBeLessThan(litres[0]);
      expect(litres[2], id).toBeLessThan(litres[1]);
    }
  }, 120_000);

  it("the floor's rail form guards it: on the Shortboard a 1/2\" roll is flagged at the nose, 1/8\" and none are not", () => {
    const { fields, board } = SHORT;
    for (const name of NOSE_CONCAVES) {
      const flagOf = (patch: Partial<BottomCutSpec>) => {
        const bottom = noseBottom(board, name, patch);
        return bottomFloorFlags(resolveBottom(bottom, board), board, sectionsOf(fields, bottom)).find((f) => f.section === "nose");
      };
      const big = flagOf({ railRoll: inchesToMm(1 / 2) });
      expect(big, name).toBeDefined();
      expect(big!.rails.length, name).toBeGreaterThan(0);
      expect(big!.stringer, name).toEqual([]);
      expect(flagOf({ railRoll: inchesToMm(1 / 8) }), name).toBeUndefined();
      expect(flagOf({}), name).toBeUndefined();
    }
  }, 120_000);
});

describe("the printed line names a Rail Roll only above 0 (quick 261125-mf8, D-07)", () => {
  it.each(UNITS_SYSTEMS)("%s: after the off-the-rail figure, a comma and the roll as a depth reads, before the Teardrop's closing", (system) => {
    const board = SHORT.board;
    for (const name of NOSE_CONCAVES) {
      const today = bottomPrintLines(resolveBottom(noseBottom(board, name), board), board, system)[0];
      expect(bottomPrintLines(resolveBottom(noseBottom(board, name, { railRoll: mm(0) }), board), board, system)[0]).toBe(today);
      const rolled = resolveBottom(noseBottom(board, name, { railRoll: ROLL }), board);
      const off = `${formatMark(rolled.nose.offRail, system)} off the rail`;
      const roll = formatBottomDepth(ROLL, system);
      const want = today.replace(`${off}`, `${off}, ${roll} rail roll`);
      expect(want).not.toBe(today);
      const line = bottomPrintLines(rolled, board, system)[0];
      expect(line).toBe(want);
      if (rolled.nose.closesToPoint) expect(line.endsWith(`, ${roll} rail roll, closes to a point.`)).toBe(true);
      else expect(line.endsWith(`, ${roll} rail roll.`)).toBe(true);
      if (system === "metric") {
        expect(roll).toMatch(/^\d+\.\d mm$/);
        expect(roll).not.toContain('"');
      }
    }
  });
});
