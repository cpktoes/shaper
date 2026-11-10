"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { GuideCartoon } from "./guide-cartoon";
import { GUIDE_COPY } from "./guide-copy";
import type { GuideViewCard } from "./guide-view";

/**
 * One GUIDE card (Phase 18, D-05 to D-10; UI-SPEC §3), dressed as Phase 17's: the name with the board's
 * own value (or `On this board`) beside it, the drawing of the open board with its caption, the two
 * sentences, the Model info note where a FINS card has one, and the How to shape note under a dashed rule.
 *
 * A card is words and a picture, never a control: nothing on it can be pressed or focused, and nothing on
 * it changes the board. It is drawn again only when its own tag, caption, drawing or words change.
 */

/** The small accent capitals: a word tag and the `How to shape` label. */
const ACCENT_CAPS = "text-[10px] font-display text-surf-accent-ink uppercase tracking-architectural font-extrabold";
/** The same capitals, muted: the `Model info` label. */
const MUTED_CAPS = "text-[10px] font-display text-surf-ink-muted uppercase tracking-architectural font-extrabold";
/** A value tag: the control's own value, never upper-cased. */
const VALUE_TAG = "text-[11px] font-semibold tabular-nums whitespace-nowrap text-surf-accent-ink";
/** A note under its own dashed rule. */
const NOTE = "border-t border-dashed border-surf-line-faint pt-2 text-xs leading-normal text-surf-ink-muted";

export const GuideCard = memo(function GuideCard({ card }: { card: GuideViewCard }) {
  const { tag, caption, lines } = card;
  const on = tag.kind === "on";
  return (
    <li
      data-guide-card={card.id}
      data-guide-on={on ? "true" : "false"}
      className={cn(
        "flex min-w-0 cursor-default flex-col gap-2 rounded-lg border p-3 max-shell:p-2 [@media(max-height:500px)]:p-2",
        on ? "border-surf-line" : "border-surf-line-faint",
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <h4 className="min-w-0 text-sm leading-tight font-semibold text-surf-ink">{card.name}</h4>
        {tag.kind !== "none" && (
          <span data-guide-tag={tag.kind} className={cn("ml-auto text-right", tag.kind === "value" ? VALUE_TAG : ACCENT_CAPS)}>
            {tag.text}
          </span>
        )}
      </div>
      <div aria-hidden="true" className="flex flex-col gap-1">
        <GuideCartoon figure={card.figure} />
        {caption.kind !== "none" && (
          <p
            data-guide-caption={caption.kind}
            className="text-right text-[10px] font-bold uppercase tracking-[0.12em] text-balance text-surf-ink-muted"
          >
            {caption.kind === "dashed" ? "dashed · " : "drawn as · "}
            {caption.parts.map((part, i) =>
              part.figure ? (
                // A figure keeps its unit in its own case (`+13 mm`, never `+13 MM`) and is never split across two lines.
                <span key={i} className="whitespace-nowrap normal-case tracking-normal">
                  {part.text}
                </span>
              ) : (
                <span key={i}>{part.text}</span>
              ),
            )}
          </p>
        )}
      </div>
      <p data-guide-text className="text-[13px] leading-[1.45] text-surf-ink-muted">
        <span className="font-semibold text-surf-ink">{lines.is}</span> {lines.does}
      </p>
      {lines.info !== null && (
        <p data-guide-info className={NOTE}>
          <span className={cn(MUTED_CAPS, "mb-1 block")}>{GUIDE_COPY.modelInfo}</span>
          {lines.info}
        </p>
      )}
      <p data-guide-how className={NOTE}>
        <span className={cn(ACCENT_CAPS, "mb-1 block")}>{GUIDE_COPY.howToShape}</span>
        {lines.how}
      </p>
    </li>
  );
});
