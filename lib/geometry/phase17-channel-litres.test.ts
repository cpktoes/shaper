import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { asD30Read } from "./__fixtures__/phase16-boards";
import { phase17ChannelBoards } from "./__fixtures__/phase17-channel-boards";
import pin from "./__fixtures__/phase17-channel-litres-pin.json";
import { bottomHasChannels } from "./bottom";
import {
  deriveEffectiveRails,
  designBottomBoard,
  designCrossSectionInput,
  designFinPlacement,
  designSideProfile,
  LIVE_DESIGN_RULES,
  summarizeDesign,
  type DesignSummaryFields,
} from "./design";
import { sampledFinishedRail, SECTION_POINTS } from "./finished-rail";
import { buildOutline } from "./outline";
import { mm } from "./units";
import { boardSections, TAIL_ROLL_PANELS, tailRollStations } from "./volume";

/**
 * Phase 17, plans 17-19 and 17-20 (gap G-17-6, the founder's ruling of 2026-11-10: "channels are the last cut, made after
 * the rail is shaped"; "record the before/after litres per preset"): the litres of the 49 channelled boards, written by
 * scripts/extract-phase17-channel-litres-pin.ts from the app as it stood before the channels were cut straight up into
 * the finished rail, and the relations 17-20 holds today's litres to against that record:
 *
 * - a board whose channels never reach the finished rail's own run — at every litres station, no point from the rail's
 *   outermost point down to its bottom edge has the channels' foam on it, and no wall stands between the two — reads
 *   its pinned litres to the last digit;
 * - a Hard Edge tail reads within a hundred-thousandth of a litre (its rail's run stands straight up, so cutting it
 *   straight up moves at most a few millionths);
 * - every other board within a hundredth of a litre (the Shortboard, the Fish, the Mid-length) or 0.15 L (the
 *   Longboard, whose rolled rail most channels reach).
 *
 * Which rule holds each board is worked out here from the app's own sections and samplers; nothing here types a figure.
 */

const PIN = pin as { provenance: string; litres: Record<string, string> };
// Pinned before quick 261113-psx moved the tail rail's default blend; read as D-30 read it.
const BOARDS = phase17ChannelBoards().map((board) => ({ ...board, fields: asD30Read(board.fields) }));

/** The finished rail's run in a half: its outermost point (the deck run's last) down to its bottom edge. */
const OUTERMOST = SECTION_POINTS.deck - 1;
const BOTTOM_EDGE = SECTION_POINTS.deck + SECTION_POINTS.rail - 2;

/** A cap a board other than a Hard Edge tail is held within, by preset. */
const CAP_LITRES: Record<string, number> = { shortboard: 0.01, fish: 0.01, midlength: 0.01, longboard: 0.15 };
/** A Hard Edge tail is held within this of its pin. */
const HARD_EDGE_LITRES = 1e-5;

/** Whether, at any litres station, a channel reaches the finished rail's own run: its foam on a point of the run, or a
 * wall standing between the run's bottom edge and its outermost point. Read from the sections without the bottom. */
function channelsReachTheRail(fields: DesignSummaryFields): boolean {
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  const board = designBottomBoard(fields.outline, geometry, profile, designFinPlacement(fields));
  const input = designCrossSectionInput(geometry, profile, rails, fields.outline.length, { bottom: fields.bottom!, board });
  const { foamOffAt, sectionsOffAt, bottomWallsAt, ...plain } = input;
  expect(foamOffAt && sectionsOffAt && bottomWallsAt).toBeDefined();
  const read = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);
  // every station the litres read: the board's own, and the tail roll's in its last inch (`tailRollFoam`)
  for (const section of [...boardSections(plain), ...boardSections(plain, tailRollStations(TAIL_ROLL_PANELS))]) {
    if (!section.result) continue;
    const half = section.drawn ?? section.blended ?? sampledFinishedRail(section.result, section.domed, section.halfWidth);
    for (let k = OUTERMOST; k <= BOTTOM_EDGE; k++) {
      const y = mm(half[k][0]);
      if (read(foamOffAt!(section.station, y)) > read(sectionsOffAt!(section.station, y))) return true;
    }
    const yEdge = half[BOTTOM_EDGE][0];
    const yOut = half[OUTERMOST][0];
    if (bottomWallsAt!(section.station).some((w) => w > yEdge && w < yOut)) return true;
  }
  return false;
}

type Rule = "exact" | "hard edge, 1e-5 L" | "cap";

const ROWS = BOARDS.map((board) => {
  const id = board.label.split("|")[0];
  const before = Number(PIN.litres[board.label]);
  const after = summarizeDesign(board.fields).volumeLitres;
  const rule: Rule = !channelsReachTheRail(board.fields) ? "exact" : board.label.split("|")[1] === "hard" ? "hard edge, 1e-5 L" : "cap";
  return { board, id, before, after, rule };
});

describe("the 49 channelled boards' litres, before and after the channels were cut straight up (G-17-6)", () => {
  it("the set has 49 boards with unique labels, and every one carries channels", () => {
    expect(BOARDS).toHaveLength(49);
    expect(new Set(BOARDS.map((board) => board.label)).size).toBe(49);
    for (const board of BOARDS) {
      expect(bottomHasChannels(board.fields.bottom!), board.label).toBe(true);
    }
  });

  it("the pin holds exactly those boards, in order, and names its generator", () => {
    expect(Object.keys(PIN.litres)).toEqual(BOARDS.map((board) => board.label));
    expect(PIN.provenance).toContain("GENERATED by scripts/extract-phase17-channel-litres-pin.ts");
  });

  it("the generator refuses to run once volume.ts names sectionsOffAt (17-20's seam input), and volume.ts names it", () => {
    const script = readFileSync(new URL("../../scripts/extract-phase17-channel-litres-pin.ts", import.meta.url), "utf8");
    expect(script).toContain('.includes("sectionsOffAt")');
    const volume = readFileSync(new URL("./volume.ts", import.meta.url), "utf8");
    expect(volume).toContain("sectionsOffAt");
  });

  it("before and after, board by board, with the rule that holds each", () => {
    const rows = ROWS.map(
      ({ board, before, after, rule }) =>
        `${board.label.padEnd(44)} ${before.toFixed(4)} L  ${after.toFixed(4)} L  ${(after - before >= 0 ? "+" : "") + (after - before).toFixed(4)}  ${rule}`,
    );
    console.info(`litres before (17-19's pin) and after (17-20), channelled boards (G-17-6):\n${rows.join("\n")}`);
  });

  for (const { board, id, before, after, rule } of ROWS) {
    it(`${board.label}: ${rule === "exact" ? "the pinned litres to the last digit" : rule === "cap" ? `within ${CAP_LITRES[id]} L of its pin` : `within ${HARD_EDGE_LITRES} L of its pin`}`, () => {
      if (rule === "exact") {
        expect(after.toPrecision(17)).toBe(PIN.litres[board.label]);
      } else if (rule === "hard edge, 1e-5 L") {
        expect(Math.abs(after - before)).toBeLessThan(HARD_EDGE_LITRES);
      } else {
        expect(CAP_LITRES[id]).toBeDefined();
        expect(Math.abs(after - before)).toBeLessThan(CAP_LITRES[id]);
      }
    });
  }
});
