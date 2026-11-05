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
 */
import { DEFAULT_BOARD_SPEC, type TailShape } from "../board";
import type { DesignSummaryFields } from "../design";
import { BOARD_PRESETS } from "../presets";
import { DEFAULT_RAIL_BAND_SPEC, type RailBandSpec } from "../rail-bands";
import { inchesToMm } from "../units";
import { DEFAULT_VOLUME_SPEC } from "../volume";
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
