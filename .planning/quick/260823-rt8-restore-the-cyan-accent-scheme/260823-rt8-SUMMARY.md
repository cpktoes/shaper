---
id: 260823-rt8
slug: restore-the-cyan-accent-scheme
description: Restore the original two-token cyan accent
date: 2026-08-23
status: complete
branch: design/order-form-summary
commits:
  - 48c7ef1 feat(design): restore the original two-token cyan accent
---

# Quick Task 260823-rt8 — the cyan accent is back

Reverses the colour decision in `b7fe483` (which replaced the cyan pair with a single `#006994` sea
blue), keeping every structural change made since.

## Two tokens, because one cannot do both jobs

`#00e5ff` is **1.54:1 on white** — measured, not assumed. It can only ever be a fill. That is why the
scheme is a pair:

| Token | Value | Role | Measured |
|---|---|---|---|
| `--color-surf-accent-cyan` | `#00e5ff` | fills only, always `text-surf-black` | **12.28:1** black on cyan |
| `--color-surf-accent-cyan-ink` | `#00767f` | accent text, drawing strokes | **5.39:1** on white |

Going bright again inverts the fill rule `b7fe483` had inverted: accent fills return to **black** text,
and the tail-shape and fin-setup icons, which sit on those fills, return to a dark stroke.

The user was offered a single AA-safe cyan-ish token as the simpler alternative and chose the faithful
two-token restoration.

## Every call site re-mapped by role

The `b7fe483` diff was used as the authority for which role each site had, rather than inferring it
from the current code:

- **Fills → cyan + black text:** slider range and thumb, fin setup/model toggles (3), tail-shape
  chips, toe-aim highlight, three sidebar buttons' hover, the nav's active underline, the print button.
- **Text → ink:** fin-controls (3), rail-controls, preset-card, continue-board-card, nav wordmark hover.
- **Strokes → ink:** outline-viewer construction lines, fin-viewer marks and legend, rail plot `band1`.
- **Icons on a fill → dark stroke:** `tail-shape-icon`, `fin-setup-icon`.
- **Thin rings/focus borders → ink:** setup cards' hover/focus rings, the order form's focus borders.

Built after `b7fe483` and so absent from its diff, mapped by the same rule: `--outline-board-fill`
(a wash → cyan), `--outline-construction` (lines → ink), `--order-form-shade` (a tint → cyan), and
`.slider-accent` (fills → cyan, keeping the `surf-black` hairline from `260823-qr3`).

## The order form got slightly better

The 7% shade tint behind the logo block and spine labels is now mixed from a *lighter* colour, so the
muted text on it gained contrast rather than losing it — the plan predicted this and the measurement
confirmed it:

**Minimum contrast on the order form: 4.83:1 → 5.10:1.** Zero AA failures, and the 9pt floor from
`260823-pw7` still holds at exactly 12px.

## Verification

- `npx tsc --noEmit` — clean. `npx eslint` — clean (one pre-existing unused-var warning in
  `outline.test.ts`, untouched). `npx vitest run` — 638 passed / 7 files.
- **No `accent-blue` reference remains** anywhere in `components/` or `app/`.
- **Token maths measured in the browser**, not taken from the old commit message: cyan on white
  1.54:1, black on cyan 12.28:1, white on cyan 1.54:1, ink on white 5.39:1 — confirming both why the
  pair exists and why fills must be black.
- **Every element actually painted cyan was checked**, not just the source: 9 fills on the fins
  screen, all carrying black text, worst case **12.28:1**.
- Order form: zero AA failures, min ratio **5.10:1**, smallest print 12px, both sheets zoom 1 with
  zero overflow, still two pages.

## Note

Mid-verification a probe reported the summary root missing; the browser tab had drifted to
`/design/outline` rather than the page under test. Cheap to catch by asserting the path before
measuring, which the final audit does — a probe that cannot find its subject should say so rather
than throw something that looks like a code fault.
