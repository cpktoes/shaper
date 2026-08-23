---
id: 260823-ggs
slug: move-the-rail-band-and-fin-placement-dat
description: Move the rail band and fin placement data to a second page of the order form
date: 2026-08-23
mode: quick
branch: design/order-form-summary
---

# Quick Task 260823-ggs — the order form becomes two pages

The rail band marking data and the fin placement numbers move off the front of the form onto a
second page, which prints on the back. The front stops being a page of tiny text competing with the
drawings and becomes what the muse's front actually is: dimensions, drawings, and room to mark them
up.

## What the front gains

With both tables gone, the body row's full width is free. That space goes to the muse's own use for
it — its board outlines live inside a big panel captioned `COLOR DESIGN AND LOGOS`, blank around the
drawings so a customer can sketch artwork on it. The `OUTLINE` panel takes that name and that job:
the two drawings, larger, with genuine blank space around them.

The rail *section plots* stay on the front. They are drawings, not text, and the user's reason for
this change was graphical space. (They could join their own data on the back later if the pairing
matters more than the picture — worth revisiting after a look.)

## Page structure

**Page 1 — the order form.** Header (logo · rider info · shaper use only), dimensions row, rocker
placeholder, `COLOR DESIGN & LOGOS` with the deck and bottom drawings, rail section plots, glassing.

**Page 2 — the shaper's reference.** A slim identification strip so a loose back page is still
attributable to a board, then the rail band marking data and the fin placement numbers, each with a
full half-page instead of a cramped column — which is what lets the type come up to a size that can
actually be read at the blank.

## Tasks

### Task 1 — Two sheets

**Files:** `components/summary/order-form.tsx`

- Extract the repeated sheet chrome into one `Sheet` wrapper so both pages share a border, padding
  and the `data-order-form-sheet` hook.
- Page 1 as above; the outline panel widens to the full body row and is recaptioned.
- Page 2: identification strip (board name, length × width × thickness, volume), then `RAIL BANDS`
  and `FIN PLACEMENT` side by side, each full height.
- Page markers on both, so the pair reads as a pair.

### Task 2 — Two-page print path

**Files:** `app/design/summary/order-form.css`, `components/summary/use-print-fit.ts`

- The hook currently pins **the root** to one page box, which is what kept the sheet to a single
  page. It must now size **each sheet** instead, and measure each one's overflow separately — the
  root is no longer a page, it is a stack of them.
- `break-after: page` between sheets; the last must not force a trailing blank page.
- Screen: the two sheets stack with a gap so the pair is legible as two pages.

**Verify:** `npx tsc --noEmit`, `npx eslint`, `npx vitest run`; in the browser confirm each sheet
measures zero overflow at the printable page box and that exactly one page break falls between them.

## Out of scope

- Reflowing the rail/fin tables themselves — they are the same components, given more room.
- Anything on the front beyond the outline panel's new width and caption.
