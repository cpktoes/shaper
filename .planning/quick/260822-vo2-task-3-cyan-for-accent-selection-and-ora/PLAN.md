---
gsd_plan_version: 1.0
quick_id: 260822-vo2
slug: task-3-cyan-for-accent-selection-and-ora
date: 2026-08-22
status: complete
---

# Quick Task 260822-vo2 — Interactive controls & selection states

Task 3 of the design pivot. Founder's decision: **cyan for accent/selection, orange for
warnings.**

## Measured legibility rules

The brief says to pair accents with black or white "depending on legibility rules".
Measured, the answer is unambiguous and the same for both:

| fill | with `text-surf-black` | with `text-surf-base` | verdict |
|---|---|---|---|
| cyan `#00E5FF` | **12.28:1** | 1.54:1 | black |
| orange `#FF5722` | **5.97:1** | 3.16:1 | black |

**Neither accent survives as text or a stroke on the white ground:** cyan is 1.54:1
(effectively invisible) and orange 3.16:1 (below AA). So each accent needs an ink
variant for anything that is not a fill:

- `--color-surf-accent-cyan-ink: #00767F` — 5.39:1. Strokes in the drawings, link-style
  actions, CTAs.
- `--color-surf-accent-orange-ink: #C93F10` — 5.00:1. Warning text.

The bright values stay for fills, always carrying black text.

## Classification

Every current `--outline-accent` usage falls into one of four buckets:

**Selection / active — cyan fill, black text.** Selected tail-shape, fin-setup, thruster
and twin-template chips; the aim-table's highlighted cell; slider range and thumb; the
active nav link (as a cyan underline with black text — cyan *text* would be 1.54:1);
the Print Summary button.

**Warning — orange ink.** The slider constraint notes ("Clamped to 2" less than Tail
Block") on the outline and rails controls, and the fin panel's "· Modified" flag, which
tells a shaper the placement has been hand-tuned away from the model's calculated value.
On a tool whose value is numbers you can trust, that deviation is worth a caution colour.

**Link-style actions — cyan ink.** The Reset controls, the advanced disclosure toggles,
and the preset cards' "Start Shaping".

**Drawing strokes — cyan ink.** Fin base-length lines in the fin and outline viewers and
the rail plot's band-1 series. These are technical marks a shaper reads; at 1.54:1 the
bright cyan would be all but invisible on white.

**Not an accent at all.** The headline volume figure was amber to make it pop. In this
system prominence comes from size and weight, so it becomes `text-surf-black`.

## Grouping by whitespace

The chip rows are `gap-1.5` grids sitting flush against their sliders. They get real
separation from neighbouring controls and looser gaps between chips, so a group reads as
a group from its spacing rather than from a box drawn round it.

## Tasks

- [x] T1 — Add the two ink tokens; repoint `--outline-accent`/`-strong` at cyan
- [x] T2 — Selection states: chips, sliders, tabs, nav, Print Summary
- [x] T3 — Warnings onto orange ink
- [x] T4 — Link-style actions and CTAs onto cyan ink
- [x] T5 — Drawing strokes onto cyan ink
- [x] T6 — Headline volume figure off the accent
- [x] T7 — Group the selection chips with whitespace
- [x] T8 — Verify: contrast of every rendered pairing, six screens, lint, tests, build

## Verification

- No cyan or orange text/stroke on white anywhere below 4.5:1 — measured in-browser.
- Every accent fill carries black text.
- Summary print sheet unchanged.
- `npm run lint`, `npm test` and `npm run build` pass.
