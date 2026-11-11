/**
 * The channelled boards every G-17-6 litres test reads (Phase 17, plan 17-19): the four presets as their cards open
 * them (`phase16Boards()`'s `<id>|asis|<edge>`), each with the tail's Hard Edge on and off, each with a flat tail and a
 * Rolled Vee tail, each with four, six and eight channels on their starting numbers — 48 boards — and one more, the
 * diagnosis's own RAILS board (`.planning/debug/finished-rail-rounds-channels.md`): the Fish, Hard Edge, Rolled Vee,
 * eight channels at Off Stringer 3".
 *
 * The set exists so the litres of boards that carry channels can be written down before 17-20 changes how channels meet
 * the finished rail (`scripts/extract-phase17-channel-litres-pin.ts`), and so 17-20's tests can hold the boards that
 * must not move — the Hard Edge tails, and any board whose channels never reach the rail's curve — to the last digit.
 * Labels are `<id>|<edge>|<tail>|<count>`, plus `|off-stringer-3in` on the last. No litres figure is typed here;
 * the only figures are the inch counts that name the setups.
 */
import { startingChannels, DEFAULT_BOTTOM, pickCut, type BoardBottom, type ChannelCount } from "../bottom";
import { designBottomBoard, designFinPlacement, designSideProfile, LIVE_DESIGN_RULES, type DesignSummaryFields } from "../design";
import { buildOutline } from "../outline";
import { BOARD_PRESETS } from "../presets";
import { inchesToMm } from "../units";
import { phase16Boards } from "./phase16-boards";

const COUNTS: readonly ChannelCount[] = [4, 6, 8];

/** The 49 channelled boards, in preset order, then edge (hard before soft), then tail (flat before Rolled Vee), then count. */
export function phase17ChannelBoards(): { label: string; fields: DesignSummaryFields }[] {
  const bases = phase16Boards();
  const boards: { label: string; fields: DesignSummaryFields }[] = [];
  const channelled = (base: DesignSummaryFields, tail: "flat" | "rolled-vee", count: ChannelCount, offStringerInches?: number) => {
    const geometry = buildOutline(base.outline);
    const profile = designSideProfile(base, LIVE_DESIGN_RULES);
    const board = designBottomBoard(base.outline, geometry, profile, designFinPlacement(base));
    let bottom: BoardBottom = structuredClone(DEFAULT_BOTTOM);
    if (tail === "rolled-vee") bottom = pickCut(bottom, "tail", "Rolled Vee", board);
    bottom.channels = startingChannels(count, board, bottom.channels);
    if (offStringerInches !== undefined) bottom.channels = { ...bottom.channels, offStringer: inchesToMm(offStringerInches) };
    return { ...base, bottom };
  };
  for (const preset of BOARD_PRESETS) {
    for (const edge of ["hard", "soft"] as const) {
      const base = bases.find((b) => b.label === `${preset.id}|asis|${edge}`)!.fields;
      for (const tail of ["flat", "rolled-vee"] as const) {
        for (const count of COUNTS) {
          boards.push({ label: `${preset.id}|${edge}|${tail}|${count}`, fields: channelled(base, tail, count) });
        }
      }
    }
  }
  const fishHard = bases.find((b) => b.label === "fish|asis|hard")!.fields;
  boards.push({ label: "fish|hard|rolled-vee|8|off-stringer-3in", fields: channelled(fishHard, "rolled-vee", 8, 3) });
  return boards;
}
