/**
 * Puts a page's words and its worked-out cards together into the groups `GuideTab` draws (Phase 18):
 * the words page's groups in order, each card's words in the shaper's system beside its tag, caption and
 * drawing. Pure; no React. Throws when a words card has no worked-out card, so a page can never draw a
 * card with no picture or quietly drop one.
 */
import type { GuideCaption, GuideFigure, GuidePageBuild, GuideTag } from "@/lib/geometry/guide-card";
import type { UnitsSystem } from "@/lib/geometry/units";
import { guideLines, type GuideWordsCard, type GuideWordsGroup } from "./guide-copy";

/** One card as `GuideCard` draws it. Every field is made once per board and system, so a memoised card
 * redraws only when its own tag, caption, drawing or words change. */
export type GuideViewCard = {
  id: string;
  name: string;
  tag: GuideTag;
  caption: GuideCaption;
  figure: GuideFigure;
  lines: { is: string; does: string; info: string | null; how: string };
};

export type GuideViewGroup = { key: string; name: string; note: string | null; cards: readonly GuideViewCard[] };

export function guideView(
  groups: readonly GuideWordsGroup[],
  words: readonly GuideWordsCard[],
  build: GuidePageBuild,
  system: UnitsSystem,
): GuideViewGroup[] {
  for (const card of words) {
    if (!build.has(card.id)) throw new Error(`the GUIDE card ${card.id} has words but nothing worked out to draw`);
  }
  return groups.map((group) => ({
    key: group.name,
    name: group.name,
    note: group.note,
    cards: words
      .filter((card) => card.group === group.name)
      .map((card) => {
        const model = build.get(card.id)!;
        return {
          id: card.id,
          name: model.name ?? card.name,
          tag: model.tag,
          caption: model.caption,
          figure: model.figure,
          lines: guideLines(card, system),
        };
      }),
  }));
}
