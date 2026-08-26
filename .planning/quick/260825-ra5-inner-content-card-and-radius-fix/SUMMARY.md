---
id: 260825-ra5
slug: inner-content-card-and-radius-fix
date: 2026-08-25
type: quick
status: complete
---
# Inner content card — and a radius regression it exposed

## What was asked

Thinner canvas frame, rounded corners, and a faint line around the panel — clarified by a
zoomed screenshot of the bench showing the content in its own rounded, faint-edged card
*inside* the panel.

I had guessed at three readings and asked; the screenshot settled it in one message. Worth
remembering: for a visual detail, a picture beats a multiple-choice question.

## Built

`TabbedPanel` now renders two nested boundaries doing different jobs:

- **panel** — `--surf-line`, 3.01:1 against the canvas. Says where the working surface starts.
- **inner card** — `--surf-line-faint`, fully rounded, 1.67:1 against the panel. Says where
  the content sits inside it.

`line-faint` is correct for the inner edge *because* it recedes: it is a grouping hint, not a
structural boundary, and it reads against `panel` rather than against the canvas, where the
same token was invisible (1.22:1) and caused the earlier complaint.

Canvas frame 24/16px → 12px.

## The regression it exposed

Measuring the new corner returned **0px**. `--radius` — the base every `--radius-*` in the
Tailwind bridge is built from (`calc(var(--radius) * n)`) — was **undefined**.

It was swept away in `8d69b05`, when the four-theme change regenerated the LAYER 1 / LAYER 2
region wholesale and the declaration happened to sit inside the replaced span. From that
commit until now, **all ~51 `rounded-*` utilities in the app resolved to nothing** — buttons,
cards, inputs, dialogs, the tab strip, every one square.

`rounded-full` kept working, being a literal `9999px` rather than a var. The pills stayed
round, so nothing looked obviously broken, which is most of why it survived three commits and
several screenshots.

**Restored, with a test.** `lib/theme.test.ts` now asserts globals.css still declares
`--radius`, beside the other checks that read the stylesheet — same class of failure: a thing
the CSS must contain, with nothing in the type system to notice when it stops.

## Lesson recorded

Regenerating a region of globals.css from a definition is safer than hand-editing four
near-identical blocks — that is why it was adopted — but it will silently delete anything
inside the replaced span that the generator does not know about. `--radius` was not a colour,
so the theme generator had no reason to emit it. Check what a wholesale replacement is
throwing away, not just what it writes.

## Verified

build ✓ · tsc ✓ · 670 tests ✓. Measured after the fix: tab 10px, panel 0px top-left (square
to meet the tab) / 10px top-right, inner card 10px all round, and an unrelated `<select>`
back to 10px — confirming the app-wide fix, not just the new markup.
