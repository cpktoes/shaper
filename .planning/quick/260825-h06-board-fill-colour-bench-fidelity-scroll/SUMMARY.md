---
id: 260825-h06
slug: board-fill-colour-bench-fidelity-scroll
date: 2026-08-25
type: quick
status: complete
---
# Board fill as a colour; tab panels; bench rail scroll

Three requests from the founder, one of which turned out to be an app bug rather than a
bench inaccuracy.

## 1. Board fill is a colour, not a percentage

`--ramp-<id>-fill` was a strength fed to `color-mix(accent, ground)`, so the wash could only
ever be a tint of the accent — and changing the accent silently moved the wash with it. Now a
literal colour, promoted to the contract as `--surf-board-fill` and bridged as
`--color-surf-board-fill`. Seeded with exactly what the old mixes rendered, so nothing moved
except Phosphor, where `#142414` was chosen:

| | old mix | now |
|---|---|---|
| daylight | `#8ec1b8` @10% on white | `#f4f9f8` |
| chalk | `#00e5ff` @6% on white | `#f0fdff` |
| slate | `#2d7495` @12% on `#12141a` | `#152029` |
| phosphor | — | `#142414` |

Print sets the fill to the default light ground rather than zeroing a strength, so the board
still prints hollow.

## 2. The tabs had nothing to open onto — an app bug, not a bench one

Every tab strip set `border-b-0` on the active tab: the folder treatment, where the tab drops
its bottom edge because the surface below continues the line. **There was no surface below.**
Content was plain `bg-surf-canvas`, no border, and on rails a `gap-2` besides. The tab was a
floating chip with an open bottom edge.

Invisible while `tab-active` and `canvas` held the same colour. Phosphor gave them `#050805`
and `#142414`, and suddenly canvas, tabs and cards read as one undifferentiated area — which
is what the founder saw.

**The direction of the fix was the founder's call.** The bench had drawn the bordered panel
since it was built, which is exactly what made the discrepancy visible. First instinct was to
make the bench honest about the weaker app treatment; the founder said "I like the bordered
panels in the bench", so the app came up to the bench instead. Content is now wrapped in a
bordered panel picking up the line the tab drops — square top-left to meet the first tab,
`-mt-px` to close the seam — and the panes inside stop repainting canvas over it.

## 3. Bench rail scrolls independently

`position: sticky` alone does not help a rail taller than the viewport: it pins, and the
overflow is simply unreachable. The rail now has `max-height: calc(100vh - 90px)` and its own
`overflow-y: auto` with `overscroll-behavior: contain`, so tokens scroll while the specimen
stays put. Verified: 1149px of content in a 670px window, scrolling independently of the page.
Below 960px the container is released so the mobile single-column layout still works.

## Still worth knowing

**Cards not separating is a palette choice, not a bug.** Phosphor sets `panel` equal to
`ground` (`#050805`), so a card has nothing to distinguish it. If cards should read as raised
in Phosphor, `panel` needs its own value — a bench edit, no code change.

Verified: build, tsc, 669 tests, both themes in-browser; bench re-synced (4 themes x 16
tokens + fill) and republished.
