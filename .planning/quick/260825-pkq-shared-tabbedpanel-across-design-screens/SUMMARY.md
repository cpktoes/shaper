---
id: 260825-pkq
slug: shared-tabbedpanel-across-design-screens
date: 2026-08-25
type: quick
status: complete
---
# One TabbedPanel, four screens

## Why extract rather than copy twice more

Template and Volume were bare canvases while Rails and Fins had tabs and a panel — four
screens reading as four layouts. Adding the treatment to two more meant a fifth and sixth
copy of the markup, which is precisely the drift this codebase already warns about in the
`.slider-accent` note (written after fourteen copies of one slider style). Now
`components/viewer/tabbed-panel.tsx`, used by all four.

Template and Volume have one region each, so their tab renders as a plain element, not a
`<button>` — **a control that controls nothing is worse than a label**, for a pointer and for
anyone arrowing through it. The multi-tab screens gained `role="tablist"` / `role="tab"` /
`aria-selected`, which the hand-rolled buttons never had.

## The missing thin line was a token choice

The panel edge used `--surf-line-faint`, which is **1.22:1** against Daylight's canvas —
present in the DOM, invisible on screen. A panel boundary is structural: it says where the
working surface starts. Moved to `--surf-line`, the token carrying the 3:1 non-text target,
which measures **3.01:1** there.

That is why it looked right in Phosphor (`#3e783e` on `#142414`) and wrong in Daylight — the
treatment was only ever working in the high-contrast themes.

## Canvas frame

40/20px → 24/16px (Volume 48/32 → 24/16). The band of canvas around the panel was doing more
work than it needed to.

## Bench: hex and picker now drive each other

Both controls wrote state but not each other. `sync(false)` skips `syncInputs()` deliberately
— rewriting the field being typed in would fight the caret — but that also left the peer
stale, so swatch and hex could show different colours for one token. Each now writes the
other directly. Short hex expands on the way to the picker (`<input type="color">` takes only
six digits); the text field keeps what was typed.

Verified both directions plus `#abc → #aabbcc`.

## Verified

build ✓ · tsc ✓ · 669 tests ✓ · eslint 0 errors. All four screens in Daylight; rails tab
switching still works; panel edge measured at 3.01:1; no inline tab markup left outside
`tabbed-panel.tsx`. Bench re-synced (4 × 16 + fill) and republished.
