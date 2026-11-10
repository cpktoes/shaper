"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { MIN_PINNED_FIT_SCALE } from "@/components/viewer/callout-primitives";
import { GUIDE_VIEWBOX_WIDTH, guideSlug, type GuidePage } from "@/lib/geometry/guide-card";
import { GuideCard } from "./guide-card";
import { GuideFitContext } from "./guide-cartoon";
import { GUIDE_COPY } from "./guide-copy";
import type { GuideViewGroup } from "./guide-view";

/**
 * The GUIDE tab's body, the same on every page (Phase 18, D-01, D-14, D-15; UI-SPEC §2, §6, §9): the
 * page's intro, then each group under its heading with its cards side by side — never more than three,
 * never narrower than 236 dots, a question the list asks of its own width (a grid track rule), never of
 * the device. One across on a phone.
 *
 * This box is the one thing that scrolls: the cards scroll inside the folder, the page never does. It can
 * take the keyboard's focus so the arrow keys scroll it (a scrollable region with nothing focusable inside
 * would otherwise be unreachable); nothing inside it can.
 *
 * It also measures, once for the whole tab, how many screen dots a drawing unit is on these cards, so every
 * drawing's words are pinned at 10 screen dots whatever the card's width.
 */

const GROUP_HEADING = "mt-4 mb-2 text-[10px] font-display text-surf-ink uppercase tracking-architectural font-extrabold";

export function GuideTab({ page, intro, groups }: { page: GuidePage; intro: string; groups: readonly GuideViewGroup[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => {
      const art = el.querySelector("[data-guide-cartoon]");
      const width = art ? art.getBoundingClientRect().width : 0;
      if (width > 0) setFit(Math.max(width / GUIDE_VIEWBOX_WIDTH, MIN_PINNED_FIT_SCALE));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={scroller}
      data-guide
      role="region"
      aria-label={GUIDE_COPY.regionLabel(page)}
      tabIndex={0}
      className="min-h-0 flex-1 overflow-y-auto pt-2 focus-ring-accent print:hidden"
    >
      <p data-guide-intro className="max-w-prose text-xs leading-normal text-surf-ink-muted">
        {intro}
      </p>
      <GuideFitContext.Provider value={fit}>
        {groups.map((group) => (
          <section key={group.key} data-guide-group={guideSlug(group.key)}>
            <h3 className={GROUP_HEADING}>
              {group.name}
              {group.note !== null && (
                <span className="ml-2 text-xs font-normal tracking-normal normal-case text-surf-ink-muted">{group.note}</span>
              )}
            </h3>
            {/* `role` is kept on purpose: Safari drops a list's meaning once its bullets are styled away. */}
            <ul
              role="list"
              className="grid list-none gap-2 [grid-template-columns:repeat(auto-fill,minmax(max(236px,calc((100%-16px)/3)),1fr))]"
            >
              {group.cards.map((card) => (
                <GuideCard key={card.id} card={card} />
              ))}
            </ul>
          </section>
        ))}
      </GuideFitContext.Provider>
    </div>
  );
}
