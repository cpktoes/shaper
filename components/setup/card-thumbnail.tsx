"use client";

/**
 * The board-picture box shared by every card on the setup screen — the preset cards
 * (`preset-card.tsx`) and both saved-board rack variants (`board-rack-card.tsx`). Both files used
 * to draw this exact two-div stack from their own copied markup; D-02 factors it into one shared
 * piece so the two can never drift apart again.
 *
 * The outer box here is the "window" layer (`--surf-tab-active`, with the structural
 * `--surf-line` border); the inner box is the "well" (`--surf-panel`, with the receding
 * `--surf-line-faint` border) holding a live `OutlineViewer` — never a cached or pre-rendered
 * image, so the picture and the board it opens can never disagree. `showConstruction={false}` and
 * `hideCallouts` keep the drawing a plain silhouette on every card. (The sand-framed outer band,
 * `--surf-canvas`, is the card shell's own `p-3` in each caller — outside this component, and
 * untouched by it.)
 *
 * **The one thing this file adds beyond what both cards already drew: `max-shell:h-[387px]` on
 * the inner box.** That caps the thumbnail's height on the phone shell (D-08) while leaving the
 * `aspect-[340/620]` class in place — an element with both a definite width (the card's own,
 * unchanged) and a definite height (this cap) ignores its own `aspect-ratio` declaration, so the
 * ratio class does nothing on a phone and governs everything at `shell:` width and up, where the
 * cap doesn't apply. Verified in WebKit at iPhone-14 width on 2026-09-10: a plain height rule
 * computed to exactly 387px with the ratio still declared alongside it.
 *
 * The arithmetic behind 387px: `OutlineViewer`'s frame is a fixed 340 (wide) x 620 (tall) viewBox
 * (`components/outline/outline-viewer.tsx`), fitted with `preserveAspectRatio="xMidYMid meet"`.
 * A 387px-tall box on a card roughly 330px wide gives 387 / 620 = 0.624px per viewBox unit by
 * height, against roughly 306 / 340 = 0.90px per unit available by width — height is the tighter
 * constraint, so the meet-fit scales the whole 620-unit-tall frame down to 387px, and the board's
 * own drawn length (the frame minus its own top/bottom padding) comes out to about 357px, centred,
 * with white space either side from the frame's narrower drawn width. This is deliberately
 * CSS-only: cropping the frame's *width* does nothing for a fixed-width, height-capped box, and
 * shrinking the frame's own vertical padding was measured at plan time to buy under 3% more board
 * length — not worth a `lib/geometry` change. So: no new `OutlineViewer` option, no viewBox
 * change, no geometry change. Just a height cap on the box the frame already fits itself into.
 *
 * This file exists — rather than two calls to `OutlineViewer` with a copy-pasted wrapper each —
 * because the two cards drew this box from near-identical duplicated markup, and D-02 exists
 * specifically to close off that drift risk: whatever this box's rule is, both cards must obey
 * the same rule, written once.
 */

import { OutlineViewer } from "@/components/outline/outline-viewer";
import type { OutlineGeometry } from "@/lib/geometry/outline";
import type { OutlineSpec } from "@/lib/geometry/board";

interface CardThumbnailProps {
  geometry: OutlineGeometry;
  outline: OutlineSpec;
}

export function CardThumbnail({ geometry, outline }: CardThumbnailProps) {
  return (
    <div className="rounded-lg border border-surf-line bg-surf-tab-active p-3">
      <div className="relative aspect-[340/620] w-full max-shell:h-[387px] overflow-hidden rounded-lg border border-surf-line-faint bg-surf-panel">
        <OutlineViewer geometry={geometry} outline={outline} showConstruction={false} hideCallouts />
      </div>
    </div>
  );
}
