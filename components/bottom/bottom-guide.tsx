"use client";

import { useMemo, type ReactNode } from "react";
import { bandBoardName } from "@/components/design/board-name-copy";
import { useDesign } from "@/components/design/design-store";
import { GUIDE_NO_CAPTION, GUIDE_NO_TAG } from "@/lib/geometry/guide-card";
import { GuideTab } from "@/components/guide/guide-tab";
import { GUIDE_COPY } from "@/components/guide/guide-copy";
import type { GuideViewCard, GuideViewGroup } from "@/components/guide/guide-view";
import { useUnits } from "@/components/units-provider";
import type { BottomCutName } from "@/lib/geometry/bottom";
import type { GuideCartoonKey } from "@/lib/geometry/bottom-draw";
import { BottomCartoon } from "./bottom-cartoon";
import { BOTTOM_COPY } from "./bottom-copy";
import { BOTTOM_GUIDE_WORDS, guideHow, type BottomGuideCard } from "./bottom-guide-words";

/**
 * GUIDE (Phase 17, D-17, D-18; UI-SPEC §5): what every cut is, what it does and how it is shaped — nineteen cards in
 * four groups (Nose, Center, Tail, then the channels), each with a cartoon of the cut on the board the shaper has open.
 *
 * Since quick 261114-ko2 the cards are drawn by the GUIDE every page shares (`components/guide`, Phase 18): the same
 * tab, the same card, so BOTTOM reads as one with TEMPLATE, ROCKER, RAILS, VOLUME and FINS. What is BOTTOM's own stays
 * its own — the founder's words (`bottom-guide-words.ts`, held to his page), the cut drawn alone at its starting
 * numbers (`BottomCartoon`), and the `On this board` tag that follows the board's bottom.
 *
 * A card is words and a picture, never a control: nothing here can be pressed, and nothing here changes the board.
 */

type GuideGroupKey = BottomGuideCard["section"];

const GROUP_ORDER: readonly GuideGroupKey[] = ["nose", "center", "tail", "channels"];

/** What a card's cartoon draws: made once here, so a card is handed the very same object on every draw. */
const CUT_OF: ReadonlyMap<string, GuideCartoonKey> = new Map(
  BOTTOM_GUIDE_WORDS.map((card) => [
    card.key,
    card.section === "channels" ? { section: "channels" } : { section: card.section, name: card.key as BottomCutName },
  ]),
);

export function BottomGuide() {
  const { system } = useUnits();
  const { bottom, bottomBoard, outlineGeometry, boardName, modelId } = useDesign();

  // The groups and every card's drawing are made together, once per board, bottom and system: a memoised card then
  // redraws only when one of those changes — never because a slider elsewhere moved.
  const { groups, art } = useMemo(() => {
    const art = new Map<string, ReactNode>();
    const groups: GuideViewGroup[] = GROUP_ORDER.map((group) => ({
      key: group,
      name: BOTTOM_COPY.guideGroups[group],
      note: null,
      cards: BOTTOM_GUIDE_WORDS.filter((card) => card.section === group).map((card): GuideViewCard => {
        const on = card.section === "channels" ? bottom.channels.count > 0 : bottom[card.section].name === card.key;
        art.set(
          card.key,
          <BottomCartoon cut={CUT_OF.get(card.key)!} board={bottomBoard} geometry={outlineGeometry} wingRule={bottom.wingRule} />,
        );
        return {
          id: card.key,
          name: card.key,
          tag: on ? { kind: "on", text: GUIDE_COPY.onThisBoard } : GUIDE_NO_TAG,
          caption: GUIDE_NO_CAPTION,
          figure: null,
          lines: { is: card.is, does: card.does, info: null, how: guideHow(card, system) },
        };
      }),
    }));
    return { groups, art };
  }, [bottom, bottomBoard, outlineGeometry, system]);

  return (
    <GuideTab
      page="bottom"
      intro={BOTTOM_COPY.guideIntro(bandBoardName(modelId, boardName))}
      groups={groups}
      renderArt={(card) => art.get(card.id)}
      rootAttributes={{ "data-bottom-guide": "" }}
    />
  );
}
