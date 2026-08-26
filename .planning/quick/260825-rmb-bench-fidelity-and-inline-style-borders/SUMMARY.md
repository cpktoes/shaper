---
id: 260825-rmb
slug: bench-fidelity-and-inline-style-borders
date: 2026-08-25
type: quick
status: complete
---
# The bench's slider tracked the wrong token — and what auditing for it found

## The reported bug

The specimen's slider track was `--surf-ground`. In the app it is `bg-muted`, which the
shadcn bridge maps to `--surf-well`. So moving **Window** moved a channel the app draws from
**Well**, and moving Well did nothing — the opposite of the truth.

It mattered more than a normal fidelity slip: it hid that `well` is what defines a slider's
unfilled extent, which was the exact subject of the preceding conversation about dropping the
stroke. Verified by driving the pickers: Window no longer moves the track, Well does.

## Auditing the rest of the specimen found three more

Rather than fix one and find a fourth next round, every mocked element was compared against
the app's real classes:

| element | bench had | app uses |
|---|---|---|
| slider track | `ground` | `well` |
| chip border | `ink` | `on-accent` |
| inactive icon button | 30% muted mix on `ground` | `line` on `sidebar` |
| active icon button edge | `accent` | `on-accent` |

## A third hiding place for the on-fill mistake

The audit turned up that `outline-controls.tsx` sets its tail-shape chips through a `style`
object — putting them out of reach of **both** earlier passes. The border migration matched
`border-surf-muted/N` classes in `.tsx`; the color-mix sweep only looked in `globals.css`.
Inline styles are neither.

So that one control kept an ad-hoc 30% muted mix long after every other border moved to the
line token, **and** had `borderColor: accent` on the active chip — the same value as its own
fill, so the edge the border exists to draw was not drawn at all.

That is the third variant of the same mistake, after text (260824-nhh) and the pill edges in
fin-controls: **anything drawn on the accent fill must take the fill's paired colour.**

## Verified

build ✓ · tsc ✓ · 670 tests ✓. Active chip measured at `#1f2a3b` on `#8ec1b8`, inactive at
`#897c58` on white, no `color-mix` left in any chip. Bench republished.

## Lesson

Grepping classes finds class-based styling. It does not find `style={{ … }}`, and it does not
find CSS-declared derivations. A token migration needs all three sweeps — and the reliable
check is still measuring the rendered value in the browser, which is how both this and the
`--radius` regression surfaced.
