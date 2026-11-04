/**
 * The board set every Phase 16 relation test reads (research Pattern 1): the four presets as their
 * cards open them — each on the blank its Phase 14 records were taken on (`recordedPresetDesignFields`,
 * so a later preset pick never moves a record) — each also re-cut with a swallow, a diamond, a pin and a
 * round tail, and each of those with the tail's Hard Edge on and off. Forty boards.
 *
 * Two pairs read alike on purpose and are kept anyway, as the research found them: the Fish opens as a
 * swallow, so `fish|asis` is `fish|swallow`; and a pin and a round tail draw the same foam the litres
 * count. Labels are `${preset.id}|${tail}|hard` and `…|soft`.
 */
import type { TailShape } from "../board";
import type { DesignSummaryFields } from "../design";
import { BOARD_PRESETS } from "../presets";
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
