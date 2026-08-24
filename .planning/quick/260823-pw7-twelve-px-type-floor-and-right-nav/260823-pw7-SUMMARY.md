---
id: 260823-pw7
slug: twelve-px-type-floor-and-right-nav
description: 9pt (12px) minimum type across both sheets, right-justified nav
date: 2026-08-23
status: complete
branch: design/order-form-summary
commits:
  - 5621dfa feat(summary): 9pt type floor across both sheets, right-justified nav
---

# Quick Task 260823-pw7 — a 9pt floor, and the nav to the right

## Nothing prints below 9pt

Smallest printed text was 7.9px; it is now **exactly 12px**, and every distinct size on both sheets
sits at or above it: 12, 12.8, 13.2, 13.9, 14.7, 15.8, 16.9, 20.5, 20.8.

**The floor lives in the clamp minimum, not only the coefficient.** `clamp(12px, …, …)` holds at any
container width, so the guarantee does not depend on the sheet being printed at the width it was
calibrated for; the `cqw` coefficients are then set so the printed size lands on 12px as well
(`1.636cqw` × 733.448px = 12.0px).

The floor compresses the bottom of the scale — `micro`, `caption` and `group` all land on 12px and are
no longer separated by size. They stay apart on weight and colour, which was carrying most of that
distinction at 8px anyway. Noted in the stylesheet so it reads as a decision rather than an oversight.

**It still fits.** A ~50% type increase on the denser page, and both sheets come out zero overflow,
zero clipped elements, at **zoom 1** — which is the part that matters: a zoom below 1 would have
scaled the type straight back under the floor.

## The bug this uncovered

`useOrderFormPrintFit` pinned each **sheet** to the page box but left the **root** — the `@container`
every `cqw` size resolves against — at whatever width the print viewport handed it. Two consequences,
both silent:

- The printed type size was not knowable from the design. The "printed size is 83% of screen" model
  every previous task in this branch reasoned with was an assumption that stopped being true when the
  two-page split moved sizing from the root onto the sheets.
- Had the print viewport come out wider than expected, the sheet would have overflowed, the hook's
  guard would have zoomed it down, and the type would have dropped back below the floor.

The root is now pinned to the printable width too, restoring the invariant the hook's own head comment
describes: the layout it measures is the layout that prints. This is what turned the measurement from
14.4px (screen-derived) into the intended 12px.

## What had to give at 9pt

Captions began folding onto two lines — a panel's own name wrapping reads as a broken box. Two fixes:

- **Structural:** `FormBox`'s caption never wraps and a long `captionRight` truncates instead, so this
  cannot regress the next time a note gets longer.
- **Textual:** the notes were shortened to suit the width they actually have — `marking data overleaf`
  → `overleaf`, `dimensions on the rows above` → `dimensions above`, `added with the rocker screen` →
  `placeholder`, `marking data — plots overleaf` → `plots overleaf`. The `WP Offset` dimension caption
  became `Offset`, which reads unambiguously next to `Widepoint`.

Three wraps remain, all intentional: the logo block's two-line placeholder (its own `<br />`), the fin
system's secondary note, and a sentence-length footnote on page 2.

## Nav menu

`justify-between` on the nav — wordmark left, links right.

## Verification

- `npx tsc --noEmit` — clean. `npx eslint` — clean (one pre-existing unused-var warning in
  `outline.test.ts`, untouched). `npx vitest run` — 638 passed / 7 files.
- **Smallest printed size: 12.0px**, measured with the root pinned to the printable width. No size
  below it anywhere on either sheet.
- **Both sheets zero overflow, zero clipped elements, zoom 1.** Still two pages.
- Wrap audit across every text node, excluding vertical-writing-mode spines (which my line-count
  arithmetic reads as false positives): three wraps, all intentional.
- **AA re-run:** zero failures, minimum ratio 4.83:1.
- Screen chrome was already compliant — nav links are `text-xs` (12px), the wordmark `text-sm` (14px)
  — and none of it prints anyway.
