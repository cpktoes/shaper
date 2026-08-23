---
id: 260823-ffv
slug: rebuild-the-summary-screen-as-a-portrait
description: Rebuild the Summary screen as a portrait order-form layout
date: 2026-08-23
status: complete
branch: design/order-form-summary
commits:
  - c3a8bbf feat(summary): add fin box system to the design store
  - 59f9366 feat(summary): rebuild the summary as a portrait order form
  - a093c1c feat(summary): draw deck and bottom in one unfilled outline panel
  - a5e29ce feat(summary): station lines on the outlines, widepoint and offset as core dims
---

# Quick Task 260823-ffv — Summary as a shop order form

`/design/summary` is now a **single portrait page laid out like a real custom board order form**,
modelled on `LB_order_form.pdf`. This lives on `design/order-form-summary`; the landscape dashboard
is untouched on `main`, so the two styles can be compared side by side.

## What was built

**`components/summary/order-form-primitives.tsx`** — the sheet's drafting vocabulary, declared once:
`FormBox` (hairline-boxed panel with an ALL-CAPS caption), `RailLabel` (the vertical `RIDER INFO` /
`SURFBOARD SHAPE AND DESIGN` / `GLASSING` spine labels), `OrderFormField`, `OrderFormTick`,
`LogoBlock`.

**`components/summary/order-form.tsx`** — the sheet. Three bands, matching the muse: header
(logo · rider info · shaper-use-only), body (dimensions · rocker · marking data + drawings + fin
numbers · rail sections), glassing.

**`app/design/summary/order-form.css`** — the paper's proportions and type scale, plus the portrait
print path.

## Decisions honoured

- **D-01** — the computed fin placement numbers sit **beside the bottom outline**, next to the
  drawing that carries the fin marks. `SHAPER USE ONLY` keeps only Blank & Rocker / Board# / Price.
- **D-02** — Board Name and the new Fin System selector are live; every other field is a blank
  ruled write-in line. Both states are the *same* `OrderFormField` component, distinguished only by
  whether it was handed a `value`/`onChange` pair — so making a field live later is adding two
  props, not rewriting the panel.
- **Volume** — only the final litres figure lands on the sheet, at the end of the core dimensions
  row (confirmed by the user mid-task). No other volume-screen rows appear.

## Changes against the muse

| Muse | Sheet |
|---|---|
| `TAIL SHAPE` row | Removed — the tail is built into the outline. |
| `CONTOURS`/`RAILS` checkboxes | Real rail section plots + the rail band marking data table. |
| `FIN SETUP` checkboxes | Fin *system* selector (FCS II, FCS Original, Futures, Lokbox, Probox, Glass-On). |
| Single board outline area | One `OUTLINE` box holding both drawings — `DECK` and `BOTTOM`, captioned beneath as the muse captions its own pair. No callout dimensions, no interior wash; fin marks on `BOTTOM` only. |
| `ROCKER` | Kept as a placeholder, ticks and all, until the rocker screen fills it. |
| `CLEAR FORM` | `Print Order Form`, below the paper and `data-print-hide`. |

## Follow-up: one shared outline panel (user request)

Deck and bottom started as a box each. They now share one, drawn stroke-only:

- **One box, not two.** Two captions, two borders and two sets of padding for what a shaper reads
  as a single pair of views was chrome the sheet could not spare. The width it gives back went to
  the marking data and the fin numbers either side — at the final weights all three panels are
  *wider* than they were as separate boxes (311 / 263 / 288px against 297 / 296 / 271), and each
  drawing is slightly larger too.
- **No fill.** Set by overriding `--outline-board-fill` to `transparent` on the panel rather than
  by changing `OutlineViewer`. That token is a screen affordance which globals.css already
  suppresses for print, on the grounds that ink inside the outline is wasted on a template meant to
  be cut along and marked on. This sheet is that template wherever it is looked at, so the override
  only brings the screen into line with what already printed.
- `FormBox` gained a `style` passthrough for that override — documented as being for CSS custom
  properties, not for one-off layout.

## Follow-up: station lines, and widepoint instead of centre width (user request)

**Faint interior lines on both drawings.** The stringer, the mid-length centreline, the nose and
tail 12" stations, and the widepoint station with its two rail knots. These had shared a gate with
the callouts (`hideCallouts`) because until now every consumer wanted both or neither; they are now
separable via a new additive `showStationLines` prop, defaulting off so the preset thumbnails stay
bare. The order form wants the lines without the callouts — it carries its dimensions in their own
row, but a shaper marking a blank still works off the stations.

**`WIDEPOINT` + `WP OFFSET` replace the muse's `CENTER`.** `CENTER` assumes the widest point *is*
the middle of the board, which is only true when the offset happens to be zero — and the offset is
an input a shaper sets deliberately. Reporting the width without saying where along the board it
was measured left the sheet's most-used marking number ambiguous. Seven cells now, no clipping at
print width.

**New `formatSignedInchesFraction` in `lib/geometry/units.ts`,** with tests. The outline editor was
hand-rolling this sign logic inline for its Offset slider; the order form needed the same thing, so
it moved to `units.ts` and both call it. Writing the tests turned up a quirk worth knowing about:
`formatInchesFraction` takes its sign from the *raw* value before rounding, so a value a hair below
zero comes back as `-0"`. The new function normalises that to `0"` rather than changing
`formatInchesFraction`, whose output is pinned by golden tests across the rail, fin and volume
screens.

## Notable implementation detail

`OutlineViewer` gained one additive, display-only prop, `cropToBoard`, following the same
convention as its existing `hideCallouts` / `hideFinMarks` / `pinCalloutText` gates.

The `hideCallouts` frame is a 340-unit-wide thumbnail box in which a 19" board draws only 151 units
— 55% of the width is empty air. `preserveAspectRatio="xMidYMid meet"` fits the whole frame,
padding included: harmless in a preset card (roughly square), ruinous in the order form's tall
narrow panel, where the board came out at 43% of the height available to it, marooned in white
space. `cropToBoard` frames the viewBox to the board's own width instead. It defaults to `false`,
so the preset-card thumbnails render exactly as before (verified).

## Verification

- `npx tsc --noEmit` — clean.
- `npx vitest run` — 638 passed / 7 files (5 new, covering `formatSignedInchesFraction`).
- `npx eslint` on all changed paths — clean.
- Browser: sheet renders at desktop width, no console errors; preset thumbnails on `/` unchanged.
- **Print fit**: pinned to the printable page box (733.4 × 995.5px = Letter portrait less the 8mm
  `@page` margin, the smaller of Letter/A4 on each axis), the sheet measures zero overflow and the
  fit-scale stays at 1. Both `data-print-unfold` containers (rail data, fin placement) fit without
  scrolling, so releasing their overflow in print spills nothing. **One portrait page.**

## Not done (out of scope)

- Persisting the rider/glassing/price fields — Phase 2's named-model saving.
- Real shop logo upload — a paid-tier feature; `LogoBlock` is isolated so it replaces one element.
- The rocker curve itself — the box is a placeholder until the rocker feature exists.
