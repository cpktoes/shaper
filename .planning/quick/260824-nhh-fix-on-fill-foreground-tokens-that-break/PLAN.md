---
id: 260824-nhh
slug: fix-on-fill-foreground-tokens-that-break
date: 2026-08-24
type: quick
status: planned
---

# Fix on-fill foregrounds that break in dark mode

Every place the app puts text or an icon **on a filled surface** names the foreground with a
literal-era token that only happened to be right in light mode. Theming made both wrong.

## The two defects

**A — text on the accent fill.** `bg-surf-accent-cyan` paired with `text-surf-black`.
`surf-black` is an alias of `--surf-ink`, which is `#111111` in light but `#f2f4f7` in dark.

| | ratio | |
|---|---|---|
| light | 12.28:1 | pass |
| **dark** | **1.40:1** | fail |

Visible as the active Tail Shape / Fin Setup buttons ("Squash", "Thruster") going unreadable
on their own cyan fills.

**B — text on the ink fill.** `bg-outline-ink` paired with `text-white`. `outline-ink` is an
alias of `--surf-ink`, so in dark it is near-white and the text is white on near-white.

| | ratio | |
|---|---|---|
| light | 18.88:1 | pass |
| **dark** | **1.10:1** | effectively invisible |

Hits the toe/aim reference table's header row and its close button.

Both are the *same mistake*: naming the foreground after a colour rather than after the
surface it sits on. The token contract already encodes the rule — "every fill `--surf-<x>`
has a foreground `--surf-on-<x>`… no exceptions" — these call sites predate it.

## Fix

- **A** → `text-surf-on-accent` (`#111111` in both themes by design, 12.28:1 either way).
- **B** → a new `--surf-on-ink`. Ink is genuinely used as a fill here, so by the contract's own
  "no exceptions" rule it needs an `on-` partner. It is definitionally the ground, so it is
  derived (`--surf-on-ink: var(--surf-ground)`) rather than added to every ramp — one line,
  follows any theme automatically, and no new value to tune.

Naming it matters more than the value: `text-surf-base` at these call sites would read as
"the page background colour", which is confusing on a dark header. `text-surf-on-ink` says
what the role is.

## Call sites

Class A — accent fill:
1. `components/fins/fin-controls.tsx:144` (fin-setup pill)
2. `components/fins/fin-controls.tsx:363` (tail shape)
3. `components/fins/fin-controls.tsx:389` (fin setup)
4. `components/fins/toe-aim-table-modal.tsx:43` (highlighted header cell)
5. `components/summary/order-form.tsx:663` (Print Order Form)
6. `components/outline/outline-controls.tsx:323` (inline style — must become conditional;
   it currently sets one colour for both active and inactive)
7. `components/fins/fin-setup-icon.tsx:48` (icon stroke)
8. `components/outline/tail-shape-icon.tsx:105` (icon stroke)
9–11. hover states: `fin-placement-editor.tsx:154`, `outline-editor.tsx:97`,
   `rail-band-editor.tsx:207` (`hover:bg-surf-accent-cyan hover:text-surf-black`)

Class B — ink fill: `toe-aim-table-modal.tsx` lines 43, 68, 83, 109.

## Explicitly NOT changed

`text-surf-black` on a *ground* is correct and stays: `site-nav.tsx:34,48`,
`order-form-primitives.tsx:163`, `order-form.tsx:460`, and the inactive halves of the pills
at `fin-controls.tsx:145,364,390`. The bug is only where ink meets a fill.

## Verify

Build, tsc, tests, lint. Then in-browser at dark: the Fins sidebar pills and the toe/aim
modal, both of which were unreadable. Contrast recomputed for both classes in both themes.
