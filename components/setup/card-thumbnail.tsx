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
 * **The one thing this file adds beyond what both cards already drew: a MAXIMUM height on the
 * inner box, active on a touch pointer.** It is a maximum rather than a fixed height precisely so
 * the box KEEPS its `aspect-[340/620]` behaviour as the upper bound and the cap becomes a clamp
 * on top of it — per the CSS sizing spec, an element with a definite width and an `aspect-ratio`
 * computes its preferred height from that ratio, and a `max-height` then clamps the result. On a
 * screen tall enough that the ratio's own height is already the smaller of the two, the ratio
 * still wins and the card can never grow absurd.
 *
 * **The whole sum — the cap itself — lives in `app/globals.css` as one named custom property,
 * `--setup-card-thumb-max-h`; this file only points at it, one Tailwind class carrying the
 * pointer gate and that property's name and nothing else.** That is the structural half of
 * 10-REVIEW-2.md WR2-02's remedy, finished (10-09): there is one place the card's height is
 * decided, not a piece of arithmetic in this file depending on measurements written in another.
 *
 * **The gate is the pointer, not the layout (10-09).** D-08's original cap (and this plan's own
 * immediate predecessor) gated on `max-shell:` — the width/height layout switch. That is wrong by
 * this project's own rule: CLAUDE.md's Layout section says width picks the LAYOUT, the pointer
 * picks how BIG a thing draws — and how tall a picture of a board may draw is a sizing question.
 * Gating on `coarse:` instead means the cap reaches a phone whichever layout that phone's width
 * happens to select, and can never reach a desktop mouse at any width, which is also what keeps
 * this file correct on both sides of the sideways-layout decision (D-10) landing in the following
 * wave — the cap no longer needs to know which layout a width chose.
 *
 * **The cap can no longer resolve to zero (10-09, closing a fault a real phone found on
 * 2026-09-11).** The formula this file used to carry directly — three-quarters of the setup
 * screen's scroller, minus a fixed amount for the card's own text — has no lower bound, and that
 * fixed amount does not shrink when the screen does: held sideways, it ate the whole budget (about
 * 88px of board left at a 390px-tall screen, 35px at 320px, 5px at 280px, nothing at all at 270px
 * and under). `--setup-card-thumb-max-h` is now `max(a floor, that same share)`, so a non-positive
 * result is structurally impossible for any viewport height — see `app/globals.css`'s own comment
 * for the floor's value and why it was chosen.
 *
 * `OutlineViewer`'s frame itself is untouched: still a fixed 340 (wide) x 620 (tall) viewBox
 * (`components/outline/outline-viewer.tsx`), fitted with `preserveAspectRatio="xMidYMid meet"`.
 * Whatever height this cap resolves to on a given screen, the frame's own meet-fit scales itself
 * into that box exactly as it always has — no new `OutlineViewer` option, no viewBox change, no
 * `lib/geometry` change. Just a height cap, now itself a function of the screen and the pointer,
 * on the box the frame already fits itself into.
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
      <div className="relative aspect-[340/620] w-full coarse:max-h-(--setup-card-thumb-max-h) overflow-hidden rounded-lg border border-surf-line-faint bg-surf-panel">
        <OutlineViewer geometry={geometry} outline={outline} showConstruction={false} hideCallouts />
      </div>
    </div>
  );
}
