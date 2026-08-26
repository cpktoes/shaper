---
id: 260825-x7p
slug: summary-bars-board-fill
date: 2026-08-26
type: quick
status: complete
---
# Summary sheet's shaded panels now use the theme's board fill

## What changed

`--order-form-shade` (`app/design/summary/order-form.css`) was the accent hue mixed at 7% over
the sheet's own panel surface, computing to roughly `#f7fbfa` in Daylight — present in the
stylesheet but effectively invisible on a white sheet. It now reads `var(--color-surf-board-fill)`,
the app's existing per-theme "interior wash of a board" token, so the sheet's shaded panels
theme the same way the board drawings do. One declaration changed; nothing else touched.

The token is shared by exactly three call sites — `RailLabel`'s vertical spines (RIDER INFO,
SURFBOARD SHAPE AND DESIGN, GLASSING, SHAPING DATA), the logo block, and the "Shaper Use Only"
sub-box. Redefining the token, rather than tinting the bars alone, keeps all three moving
together as one family instead of leaving the logo block and sub-box pale beside newly-tinted
bars.

## Why (measured before changing)

Contrast for `text-surf-ink` and `text-surf-ink-muted` on the new fill was computed for all four
themes: muted ink lands at **5.35 / 5.11 / 6.36 / 5.11** (Daylight / Chalk / Slate / Phosphor)
against the 4.5:1 AA floor — every theme clears it, tightest is 5.11. That does spend headroom
versus the old shade's 6.02 / 5.81 / 7.45 / 5.96, roughly 0.7 of a point, but it does not spend
all of it.

`app/globals.css` pins `--surf-board-fill` to white inside `@media print` (the board prints
hollow so a cut template stays clean), and custom properties resolve at use time — so the shaded
panels now print with no fill too. Judged a near-no-op: they were already printing at an
effectively-white `#f7fbfa`, and each panel keeps its own `border-surf-ink` outline. Named
plainly because it's the one behaviour, beyond screen colour, that this change moved.

## Comment rewrite

The block comment above the declaration used to end by asserting 7% was the ceiling and
"raising it will not" keep muted text clear of AA — false as of this change. Rewritten to carry
the four-theme contrast table, the 4.5:1 floor, the print consequence, and the surviving
no-literals lesson from 260825-rqm (a literal here can't follow a theme; that bug hid in this
exact route-scoped declaration because it escaped a `globals.css` sweep).

## Verified

The plan's region-scoped grep gate passes: declaration is exactly
`--order-form-shade: var(--color-surf-board-fill);`, the comment block records `4.5:1`, `5.11`,
`print`, and `literal`, and no longer contains "raising it will not". All three
`bg-(--order-form-shade)` call sites are intact (count = 3). `git status --porcelain` shows only
`app/design/summary/order-form.css` modified.

`npx tsc --noEmit`, `npm run lint` (0 errors, 9 pre-existing unrelated warnings), `npm test`
(670 passed), and `npm run build` all pass.

The plan's `<human-check>` — stepping through all four themes on `/design/summary` and a
print-preview from a dark theme — is the orchestrator's to run in a browser and is still
pending.

## Self-Check: PASSED

- FOUND: `app/design/summary/order-form.css`
- FOUND: 8e56cd8 (Task 1 commit)
