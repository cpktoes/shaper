/**
 * The board set every Phase 16 relation test reads (research Pattern 1): the four presets as their
 * cards open them — each on the blank its Phase 14 records were taken on (`recordedPresetDesignFields`,
 * so a later preset pick never moves a record) — each also re-cut with a swallow, a diamond, a pin and a
 * round tail, and each of those with the tail's Hard Edge on and off. Forty boards.
 *
 * Two pairs read alike on purpose and are kept anyway, as the research found them: the Fish opens as a
 * swallow, so `fish|asis` is `fish|swallow`; and a pin and a round tail draw the same foam the litres
 * count. Labels are `${preset.id}|${tail}|hard` and `…|soft`.
 *
 * Plan 16-15 (D-32) adds 34 more (`phase16RailCharacterBoards`): boards whose tail and nose differ from the
 * centre in nothing but the Hard Edge, which the whole rail's fade must not move, and boards with one tuck box
 * ticked on one rail, which it does. `phase16LiveBoards` is all 74, the set the second pin records.
 *
 * Plan 16-16 (D-33, D-34) adds 28 winged boards (`phase16WingBoards`): each preset with the wing TEMPLATE's
 * "+ Add a wing" adds first, both wings, a deep wing, a square step, a rounded wing, a wing inside the tail
 * rail's fade and a wing with the tail's Hard Edge off — the boards whose deck must stay smooth across a wing.
 * `phase16SurfaceBoards` is all 102, the set the third pin records (the 74 for the tips, the 28 for both).
 */
import { DEFAULT_BOARD_SPEC, type OutlineSpec, type TailShape } from "../board";
import type { DesignSummaryFields } from "../design";
import { BOARD_PRESETS } from "../presets";
import { DEFAULT_RAIL_BAND_SPEC, type RailBandSpec } from "../rail-bands";
import { inchesToMm } from "../units";
import { DEFAULT_VOLUME_SPEC } from "../volume";
import { buildOutline } from "../outline";
import { NO_FIN_EDGES, nextWing, type Wing } from "../wings";
import { recordedPresetDesignFields } from "./phase14-preset-blanks";

/** The five tails each preset is tried with; `asis` keeps the preset's own tail. */
export const PHASE16_TAILS: Readonly<Record<"asis" | "swallow" | "diamond" | "pin" | "round", TailShape | null>> = {
  asis: null,
  swallow: { kind: "swallow", endWidth: inchesToMm(10), crotchDepth: inchesToMm(2.75) },
  diamond: { kind: "diamond", endWidth: inchesToMm(10), depth: inchesToMm(3) },
  pin: { kind: "pin" },
  round: { kind: "round" },
};

/** The forty boards, in preset order, then tail, then Hard Edge on before off. */
export function phase16Boards(): { label: string; fields: DesignSummaryFields }[] {
  const boards: { label: string; fields: DesignSummaryFields }[] = [];
  for (const preset of BOARD_PRESETS) {
    for (const [tailKey, tail] of Object.entries(PHASE16_TAILS)) {
      for (const hard of [true, false]) {
        const recorded = recordedPresetDesignFields(preset);
        const outline = tail ? { ...recorded.outline, tail } : recorded.outline;
        boards.push({
          label: `${preset.id}|${tailKey}|${hard ? "hard" : "soft"}`,
          fields: {
            ...recorded,
            railsImportFoilThickness: true,
            volume: DEFAULT_VOLUME_SPEC,
            outline,
            rails: { ...recorded.rails, tailHardEdge: hard },
          },
        });
      }
    }
  }
  return boards;
}

/** The six one-box changes the `tucked` boards make to a preset's rails (see `phase16RailCharacterBoards`). */
export const PHASE16_TUCKED: Readonly<Record<string, (rails: RailBandSpec) => RailBandSpec>> = {
  "tail-sbt": (r) => ({ ...r, tailHardEdge: false, tail: { ...r.tail, sharpBottomTuck: true } }),
  "tail-single": (r) => ({ ...r, tailHardEdge: false, tail: { ...r.tail, singleTuck: true } }),
  "he-centre-sbt": (r) => ({ ...r, tailHardEdge: true, center: { ...r.center, sharpBottomTuck: true } }),
  "nose-sbt": (r) => ({ ...r, nose: { ...r.nose, sharpBottomTuck: true } }),
  "nose-single": (r) => ({ ...r, nose: { ...r.nose, singleTuck: true } }),
  "centre-single-sbt": (r) => ({ ...r, center: { ...r.center, singleTuck: true, sharpBottomTuck: true } }),
};

/**
 * The 34 boards the second pin adds (Phase 16, D-32, plan 16-15), each on its preset's recorded blank like the
 * forty (the stock pair on the stock board), in this order:
 *
 * - `aligned|<preset>|hard` and `…|soft` — the tail and the nose take the centre's Family, Symmetrical, Single
 *   Tuck and Sharp Bottom Tuck (every other field kept), Hard Edge on then off. Their tail differs from the
 *   centre in nothing but the Hard Edge and their nose in nothing, so D-32 must not move their litres by a bit.
 * - `stock|hard` and `stock|soft` — the stock 6'0" every new shaper starts on, Hard Edge on then off: the same
 *   proof on the board VOLUME's reference picture draws.
 * - `tucked|<preset>|<variant>` — one discrete difference each, the boards D-32 does move (`PHASE16_TUCKED`):
 *   `tail-sbt` and `tail-single` (Hard Edge off, the tail's Sharp Bottom Tuck or Single Tuck ticked),
 *   `he-centre-sbt` (Hard Edge on, the centre's Sharp Bottom Tuck ticked), `nose-sbt` and `nose-single` (the
 *   nose's box ticked) and `centre-single-sbt` (the centre's Single Tuck and Sharp Bottom Tuck ticked).
 */
export function phase16RailCharacterBoards(): { label: string; fields: DesignSummaryFields }[] {
  const boards: { label: string; fields: DesignSummaryFields }[] = [];
  const aligned = (rails: RailBandSpec, key: "tail" | "nose") => ({
    ...rails[key],
    family: rails.center.family,
    symmetrical: rails.center.symmetrical,
    singleTuck: rails.center.singleTuck,
    sharpBottomTuck: rails.center.sharpBottomTuck,
  });
  for (const preset of BOARD_PRESETS) {
    for (const hard of [true, false]) {
      const recorded = recordedPresetDesignFields(preset);
      boards.push({
        label: `aligned|${preset.id}|${hard ? "hard" : "soft"}`,
        fields: {
          ...recorded,
          railsImportFoilThickness: true,
          volume: DEFAULT_VOLUME_SPEC,
          rails: {
            ...recorded.rails,
            tail: aligned(recorded.rails, "tail"),
            nose: aligned(recorded.rails, "nose"),
            tailHardEdge: hard,
          },
        },
      });
    }
  }
  for (const hard of [true, false]) {
    boards.push({
      label: `stock|${hard ? "hard" : "soft"}`,
      fields: {
        outline: DEFAULT_BOARD_SPEC.outline,
        rocker: DEFAULT_BOARD_SPEC.rocker,
        foil: DEFAULT_BOARD_SPEC.foil,
        rails: { ...DEFAULT_RAIL_BAND_SPEC, tailHardEdge: hard },
        railsImportFoilThickness: true,
        volume: DEFAULT_VOLUME_SPEC,
        blank: null,
      },
    });
  }
  for (const preset of BOARD_PRESETS) {
    for (const [variant, change] of Object.entries(PHASE16_TUCKED)) {
      const recorded = recordedPresetDesignFields(preset);
      boards.push({
        label: `tucked|${preset.id}|${variant}`,
        fields: { ...recorded, railsImportFoilThickness: true, volume: DEFAULT_VOLUME_SPEC, rails: change(recorded.rails) },
      });
    }
  }
  return boards;
}

/** The 74 boards of the second pin (D-32): the forty, then the 34 above. */
export function phase16LiveBoards(): { label: string; fields: DesignSummaryFields }[] {
  return [...phase16Boards(), ...phase16RailCharacterBoards()];
}

/**
 * The 28 winged boards the third pin adds (Phase 16, D-33, plan 16-16), each on its preset's recorded blank like
 * the forty, in preset order. `w1` is the wing TEMPLATE's "+ Add a wing" adds by hand (no fin edges: 11" from the
 * tail, 3/16" deep, a 1/4" run, sharp) and `w2` the second it adds behind it (`nextWing`), so:
 *
 * - `wing|<preset>|one` — `[w1]`; `…|two` — `[w1, w2]`.
 * - `…|deep` — w1 1" deep with a 1" run, sharp: the deepest wing TEMPLATE allows.
 * - `…|square` — w1 3/8" deep with no run, sharp: a square step, two widths at one station.
 * - `…|rounded` — w1 1/2" deep, a 1/2" run, a 1/4" corner radius.
 * - `…|infade` — w1 moved to 22", inside the tail rail's fade (Blends From 18" to Ends At).
 * - `…|one-soft` — `[w1]` with the tail's Hard Edge off, so the tail's tuck is the one the wing steps.
 *
 * Every size goes through `inchesToMm` (Rule 2).
 */
export function phase16WingBoards(): { label: string; fields: DesignSummaryFields }[] {
  const boards: { label: string; fields: DesignSummaryFields }[] = [];
  for (const preset of BOARD_PRESETS) {
    const recorded = recordedPresetDesignFields(preset);
    const plain: OutlineSpec = recorded.outline;
    const w1 = nextWing([], NO_FIN_EDGES, buildOutline(plain), "imperial");
    const w2 = nextWing([w1], NO_FIN_EDGES, buildOutline(plain), "imperial");
    const variants: [string, readonly Wing[], boolean][] = [
      ["one", [w1], true],
      ["two", [w1, w2], true],
      ["deep", [{ ...w1, depth: inchesToMm(1), run: inchesToMm(1), radius: inchesToMm(0) }], true],
      ["square", [{ ...w1, depth: inchesToMm(3 / 8), run: inchesToMm(0), radius: inchesToMm(0) }], true],
      ["rounded", [{ ...w1, depth: inchesToMm(1 / 2), run: inchesToMm(1 / 2), radius: inchesToMm(1 / 4) }], true],
      ["infade", [{ ...w1, station: inchesToMm(22) }], true],
      ["one-soft", [w1], false],
    ];
    for (const [variant, wings, keepHardEdge] of variants) {
      boards.push({
        label: `wing|${preset.id}|${variant}`,
        fields: {
          ...recorded,
          railsImportFoilThickness: true,
          volume: DEFAULT_VOLUME_SPEC,
          outline: { ...plain, wings },
          rails: keepHardEdge ? recorded.rails : { ...recorded.rails, tailHardEdge: false },
        },
      });
    }
  }
  return boards;
}

/** The 102 boards of the third pin (D-33, D-34): the 74, then the 28 winged boards above. */
export function phase16SurfaceBoards(): { label: string; fields: DesignSummaryFields }[] {
  return [...phase16LiveBoards(), ...phase16WingBoards()];
}
