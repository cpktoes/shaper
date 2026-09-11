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
 * **The one thing this file adds beyond what both cards already drew: a viewport-height-based
 * MAXIMUM on the inner box, active on the phone shell.** D-08's original cap was a fixed
 * `max-shell:h-[387px]` — right for exactly the one emulated phone it was measured against, and
 * wrong everywhere else: a real iPhone held sideways disproved it outright, growing the card to
 * 757px on a screen with only 237px of room, because a fixed number of dots cannot know how tall
 * the screen actually is (10-SWEEP.md, 2026-09-11). The shaper's own verdict from that sweep —
 * "even vertical, the boards are bigger than the screen" — is what replaces it: a board card
 * should be about three-quarters of the screen a shaper can actually see (one whole board, plus
 * the top of the next, so it's obvious the list scrolls), in both orientations, by construction.
 *
 * The cap is expressed as a `max-h-[...]` (not a fixed `h-[...]`) precisely so the box KEEPS its
 * `aspect-[340/620]` behaviour as the upper bound and the share becomes the clamp on top of it —
 * per the CSS sizing spec, an element with a definite width and an `aspect-ratio` computes its
 * preferred height from that ratio, and a `max-height` then clamps the result. On a screen tall
 * enough that the ratio's own height is already the smaller of the two, the ratio still wins and
 * the card can never grow absurd — this is what makes the fixed-height mistake (a definite height
 * that always overrides the ratio, correct at one size and wrong everywhere else) structurally
 * unrepeatable here.
 *
 * The share itself is written as three-quarters of a CARD, translated into a maximum height on
 * the THUMBNAIL, using two constants measured on this checkout on 2026-09-11 (not calculated on
 * paper — that is exactly the mistake this comment is replacing):
 *
 * 1. **Shell chrome — 56px.** The gap between the phone's viewport height and the setup screen's
 *    own scroller (`[data-setup-content]`'s scrolling ancestor) — the compact top bar plus
 *    whatever else sits above or below the scroller. Measured identical (56px) at two different
 *    viewport heights (640px and 900px) on the home route, confirming it really is a constant and
 *    not something that happens to match at one size.
 * 2. **Card chrome — 162.59375px.** The gap between a rendered card's own height and its
 *    thumbnail box's height — the name, the four-number dims line, and the descriptor or "Last
 *    touched"/"In progress" line, plus the button's own padding. Measured against the PRESET
 *    variant, which carries the largest of the three card families' extra text (its `text-sm`
 *    descriptor line is taller than the saved/in-progress variants' `text-xs` third line;
 *    in-progress measured 158.39px the same day, confirming preset is the larger of the two this
 *    suite can reach signed out — see this plan's SUMMARY for the saved variant's structural
 *    argument, since a fake/no-database test run cannot render a saved board to measure directly).
 *
 * Combining them: a card that is 75% of the scroller (`scrollerHeight = 100dvh - 56px`) is
 * `0.75 * (100dvh - 56px) = 75dvh - 42px` tall; subtracting the 162.59375px of card chrome (the
 * thumbnail box's own share of that card height) gives the thumbnail's own maximum:
 * `75dvh - 42px - 162.59375px = 75dvh - 204.6px` (rounded to one decimal for the class name — the
 * unrounded remainder is under a fifth of a pixel and invisible at any real device pixel ratio).
 *
 * `OutlineViewer`'s frame itself is untouched: still a fixed 340 (wide) x 620 (tall) viewBox
 * (`components/outline/outline-viewer.tsx`), fitted with `preserveAspectRatio="xMidYMid meet"`.
 * Whatever height this cap resolves to on a given screen, the frame's own meet-fit scales itself
 * into that box exactly as it always has — no new `OutlineViewer` option, no viewBox change, no
 * `lib/geometry` change. Just a height cap, now itself a function of the screen, on the box the
 * frame already fits itself into.
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
      <div className="relative aspect-[340/620] w-full max-shell:max-h-[calc(75dvh-204.6px)] overflow-hidden rounded-lg border border-surf-line-faint bg-surf-panel">
        <OutlineViewer geometry={geometry} outline={outline} showConstruction={false} hideCallouts />
      </div>
    </div>
  );
}
