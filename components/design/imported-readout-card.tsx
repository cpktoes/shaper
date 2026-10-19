"use client";

/**
 * The card a screen draws in its INPUTS section to say which board it is working from (quick
 * 261018-fg1, sketch 017 C). The founder, 2026-10-18: "Go with C readout card, figures in accent =
 * off" — a small card like Pick a Blank's (a 1px border in the line colour, 10px corners), a caption
 * in the ACCENT ink in tracked capitals, then each figure large (18px, semibold, tabular) in the
 * normal INK colour with its name under it in small tracked muted capitals. VOLUME's card also ends
 * with a ruled foot line.
 *
 * ONE card for ROCKER, RAILS, VOLUME and FINS, so the four screens never drift apart. It formats
 * nothing: `lib/geometry/imported-readout.ts` builds the caption, the figures and their names (every
 * number through the display boundary) and this component only lays them out.
 *
 * Why the grid is content-sized: the columns are `repeat(n, 1fr)` with no `min-w-0` on the cells, so
 * a column grows to its widest figure and the rest share what is left. Equal columns spilled at the
 * narrow sidebar widths (`182.9 cm` needs more than a third of a 260-dot sidebar). Figures never
 * wrap; names may wrap between words.
 *
 * Why the name comes first in the markup: it is a `dl` of name/value pairs inside a group named by
 * the caption, so a screen reader hears `Length, 6'0"`, name first. `flex-col-reverse` then draws
 * the figure above its name. `justify-end` in a reversed column means "to the top", so when a name
 * wraps to two lines in a narrow sidebar the figures in its row still line up along their tops.
 *
 * Phone padding is tighter (8px top and bottom, 10px sides — "phone real estate is expensive") under
 * BOTH switches that mean a phone: the `max-shell` width rule (an upright phone) and the inline
 * short-screen height rule (a phone held sideways). Never a third switch, and the pointer is not read.
 *
 * Why the card measures (fast task 178, 2026-10-18): a grid cannot wrap its columns by content, and
 * in the narrowest computer sidebar — an 820-dot window, where this list is 233 dots wide — VOLUME's
 * three Metric figures and their names need 243 dots side by side, so the third ran 10 dots into the
 * card's padding (FINS' five, at 247 of 247, were one rendering hair behind). So once React owns the
 * card it tries the designed column count in place, and if the list overflows it draws one column
 * fewer — three figures go two then one, five go two, two and one — checking again whenever its own
 * width changes or the fonts arrive. `importedReadoutColumnsThatFit` decides; this only measures.
 * It reads nothing about the device (width picks the layout, pointer the sizing, height the short
 * screen — CLAUDE.md — and this is none of them), only whether its own figures fit; wherever they do,
 * which is every window but that band, the markup is exactly the designed one, server-rendered and
 * all. Flex-wrap would wrap on its own but loses the aligned columns a second row sits under (FINS'
 * three then two), which is why it is not used.
 */

import { useId, useLayoutEffect, useRef, useState } from "react";
import {
  importedReadoutColumns,
  importedReadoutColumnsThatFit,
  type ImportedReadout,
  type ImportedReadoutColumns,
} from "@/lib/geometry/imported-readout";
import { keepFiguresTogether } from "@/lib/geometry/keep-figures-together";

/** Whole class names, written out so Tailwind sees them (it only generates classes it finds whole). */
const COLUMN_CLASS = {
  1: "grid-cols-[repeat(1,1fr)]",
  2: "grid-cols-[repeat(2,1fr)]",
  3: "grid-cols-[repeat(3,1fr)]",
} as const;

export function ImportedReadoutCard({ readout, className = "" }: { readout: ImportedReadout; className?: string }) {
  const captionId = useId();
  const designed = importedReadoutColumns(readout.items.length);
  const [columns, setColumns] = useState<ImportedReadoutColumns>(designed);
  const listRef = useRef<HTMLDListElement>(null);
  // Everything the card shows, as one string: a new figure or name means the columns are re-fitted.
  const content = `${readout.caption}\n${readout.items.map((item) => `${item.label}\t${item.value}`).join("\n")}`;

  useLayoutEffect(() => {
    const fit = () => {
      const list = listRef.current;
      if (!list) return;
      setColumns(
        importedReadoutColumnsThatFit(designed, (count) => {
          // Try the count in place, read whether the list overflows, and hand the template back to the class.
          list.style.gridTemplateColumns = `repeat(${count}, 1fr)`;
          const overflows = list.scrollWidth > list.clientWidth;
          list.style.gridTemplateColumns = "";
          return overflows;
        }),
      );
    };
    fit();
    const observer = new ResizeObserver(fit);
    if (listRef.current) observer.observe(listRef.current);
    void document.fonts.ready.then(fit);
    return () => observer.disconnect();
  }, [designed, content]);

  return (
    <div
      role="group"
      aria-labelledby={captionId}
      data-imported-readout
      className={`rounded-lg border border-surf-line px-3 pt-2.5 pb-[11px] max-shell:px-2.5 max-shell:pt-2 max-shell:pb-2 [@media(max-height:500px)]:px-2.5 [@media(max-height:500px)]:pt-2 [@media(max-height:500px)]:pb-2 ${className}`}
    >
      <div
        id={captionId}
        className="text-[10px] leading-tight font-extrabold uppercase tracking-architectural text-surf-accent-ink"
      >
        {readout.caption}
      </div>
      <dl ref={listRef} className={`mt-2 grid gap-x-2.5 gap-y-2 ${COLUMN_CLASS[columns]}`}>
        {readout.items.map((item) => (
          <div key={item.key} data-readout={item.key} className="flex flex-col-reverse justify-end">
            <dt className="mt-0.5 text-[10px] leading-tight font-bold uppercase tracking-[0.12em] text-surf-ink-muted">
              {keepFiguresTogether(item.label)}
            </dt>
            <dd className="text-lg leading-[1.15] font-semibold tabular-nums whitespace-nowrap text-surf-ink">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
      {readout.foot && (
        <p data-readout-foot className="mt-2 border-t border-surf-line-faint pt-[7px] text-xs text-surf-ink-muted">
          {readout.foot}
        </p>
      )}
    </div>
  );
}
