"use client";

import { memo } from "react";
import { bandBoardName } from "@/components/design/board-name-copy";
import { useDesign } from "@/components/design/design-store";
import { useUnits } from "@/components/units-provider";
import type { BottomBoard, BottomCutName, BottomWingRule } from "@/lib/geometry/bottom";
import type { GuideCartoonKey } from "@/lib/geometry/bottom-draw";
import type { OutlineGeometry } from "@/lib/geometry/outline";
import { cn } from "@/lib/utils";
import { BottomCartoon } from "./bottom-cartoon";
import { BOTTOM_COPY } from "./bottom-copy";
import { BOTTOM_GUIDE_WORDS, guideHow, type BottomGuideCard } from "./bottom-guide-words";

/**
 * GUIDE (Phase 17, D-17, D-18; UI-SPEC §5): what every cut is, what it does and how it is shaped — nineteen cards in
 * four groups (Nose, Center, Tail, then the channels), each with a cartoon of the cut on the board the shaper has open.
 *
 * A card is words and a picture, never a control: nothing here can be pressed, and nothing here changes the board. The
 * cut a card names is drawn alone, at its starting numbers, whatever is cut on the board; the only thing that follows
 * the board's own bottom is the `On this board` tag and the card's stronger edge.
 *
 * The words are the founder's (`bottom-guide-words.ts`, copied from his page) and are drawn as plain text. The cards
 * scroll inside the folder; the page itself never scrolls. How many sit side by side is a question the card list asks
 * of its own width (a grid track rule): never more than three, never narrower than 236 dots — three across from about
 * 1200 dots of window, two below that, one on a phone.
 */

type GuideGroupKey = BottomGuideCard["section"];

interface GuideEntry {
  card: BottomGuideCard;
  /** What the cartoon draws: made once here, so a card is handed the very same object on every draw. */
  cut: GuideCartoonKey;
}

const GROUP_ORDER: readonly GuideGroupKey[] = ["nose", "center", "tail", "channels"];

/** The four groups and their cards, in the page's order. */
const GUIDE_GROUPS: readonly { group: GuideGroupKey; entries: readonly GuideEntry[] }[] = GROUP_ORDER.map((group) => ({
  group,
  entries: BOTTOM_GUIDE_WORDS.filter((card) => card.section === group).map((card) => ({
    card,
    cut: card.section === "channels" ? { section: "channels" } : { section: card.section, name: card.key as BottomCutName },
  })),
}));

/** The group heading (10/800 ink caps), as DATA's tables carry theirs. */
const GROUP_HEADING = "mt-4 mb-2 text-[10px] font-display text-surf-ink uppercase tracking-architectural font-extrabold";
/** The small accent caps: the `On this board` tag and the `How to shape` label. */
const ACCENT_CAPS = "text-[10px] font-display text-surf-accent-ink uppercase tracking-architectural font-extrabold";

export function BottomGuide() {
  const { system } = useUnits();
  const { bottom, bottomBoard, outlineGeometry, boardName, modelId } = useDesign();

  return (
    <div data-bottom-guide className="min-h-0 flex-1 overflow-y-auto pt-2">
      <p data-guide-intro className="max-w-prose text-xs leading-normal text-surf-ink-muted">
        {BOTTOM_COPY.guideIntro(bandBoardName(modelId, boardName))}
      </p>
      {GUIDE_GROUPS.map(({ group, entries }) => (
        <section key={group} data-guide-group={group}>
          <h3 className={GROUP_HEADING}>{BOTTOM_COPY.guideGroups[group]}</h3>
          {/* `role` is kept on purpose: Safari drops a list's meaning once its bullets are styled away. */}
          <ul
            role="list"
            className="grid list-none gap-2 [grid-template-columns:repeat(auto-fill,minmax(max(236px,calc((100%-16px)/3)),1fr))]"
          >
            {entries.map(({ card, cut }) => (
              <GuideCard
                key={card.key}
                card={card}
                cut={cut}
                how={guideHow(card, system)}
                on={card.section === "channels" ? bottom.channels.count > 0 : bottom[card.section].name === card.key}
                board={bottomBoard}
                geometry={outlineGeometry}
                wingRule={bottom.wingRule}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

interface GuideCardProps extends GuideEntry {
  /** The How to shape note as this shaper reads it: the page's line, its one spacing said in their own system. */
  how: string;
  /** Whether this cut is the one on the open board in its section (the channels: whether any are cut). */
  on: boolean;
  board: BottomBoard;
  geometry: OutlineGeometry;
  wingRule: BottomWingRule;
}

/** One card: the name (and the tag), the cartoon, the two sentences, and the shaping note under a dashed rule. Drawn
 * again only when its own tag or the board changes — never because a slider moved. */
const GuideCard = memo(function GuideCard({ card, cut, how, on, board, geometry, wingRule }: GuideCardProps) {
  return (
    <li
      data-guide-card={card.key}
      data-guide-on={on ? "true" : "false"}
      className={cn(
        "flex min-w-0 cursor-default flex-col gap-2 rounded-lg border p-3 max-shell:p-2 [@media(max-height:500px)]:p-2",
        on ? "border-surf-line" : "border-surf-line-faint",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="min-w-0 text-sm leading-tight font-semibold text-surf-ink">{card.key}</h4>
        {on && (
          <span data-guide-tag className={cn(ACCENT_CAPS, "flex-none")}>
            {BOTTOM_COPY.guideOnThisBoard}
          </span>
        )}
      </div>
      <BottomCartoon cut={cut} board={board} geometry={geometry} wingRule={wingRule} />
      <p data-guide-text className="text-[13px] leading-[1.45] text-surf-ink-muted">
        <span className="font-semibold text-surf-ink">{card.is}</span> {card.does}
      </p>
      <p data-guide-how className="border-t border-dashed border-surf-line-faint pt-2 text-xs leading-normal text-surf-ink-muted">
        <span className={cn(ACCENT_CAPS, "mb-1 block")}>{BOTTOM_COPY.guideHowToShape}</span>
        {how}
      </p>
    </li>
  );
});
