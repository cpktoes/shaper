---
id: 260824-nhh
slug: fix-on-fill-foreground-tokens-that-break
date: 2026-08-24
type: quick
status: complete
---

# On-fill foregrounds — summary

Two defects, one mistake: naming a foreground after a **colour** rather than after the
**surface it sits on**. Both were invisible until the dark theme existed, because the two
tokens happened to hold the same value in light.

| | pairing | light | dark | now |
|---|---|---|---|---|
| A | `text-surf-black` on `bg-surf-accent-cyan` | 12.28:1 | **1.40:1** | 12.28:1 both |
| B | `text-white` on `bg-outline-ink` | 18.88:1 | **1.10:1** | 18.88 / 16.71 |

A was visible as the active Tail Shape / Fin Setup pills going illegible on their own cyan
fills. B blanked the McKee toe/aim table's header row and close button entirely.

## Changed

**Class A → `--surf-on-accent`** (11 sites): `fin-controls.tsx` ×3, `toe-aim-table-modal.tsx`,
`order-form.tsx`, plus hover-fill variants in `fin-placement-editor.tsx`, `outline-editor.tsx`,
`rail-band-editor.tsx`. Two needed more than a swap — the icon strokes in `fin-setup-icon.tsx`
and `tail-shape-icon.tsx` now branch on `active`, and `outline-controls.tsx` was setting one
colour for *both* the filled and unfilled state, which was only ever right while ink and
on-accent held the same value.

**Class B → new `--surf-on-ink`** (4 sites in `toe-aim-table-modal.tsx`). Ink is genuinely a
fill there, and the contract says every fill has an `on-` partner with no exceptions. It is
definitionally the ground, so it is derived (`--surf-on-ink: var(--surf-ground)`) rather than
added to each ramp — one line, no new value to tune, follows any theme automatically.

## Deliberately unchanged

`text-surf-black` on a *ground* is correct and stays: `site-nav.tsx`,
`order-form-primitives.tsx`, `order-form.tsx:460`, and the inactive half of every pill. The
defect was only where ink met a fill.

## Verified

- build ✓ · tsc ✓ · 659/659 tests ✓ · eslint 0 errors
- Measured live in the browser rather than inferred. Dark: ink-fill header 1.10 → **16.71**,
  accent-fill header and Thruster pill 1.40 → **12.28**. Light re-measured unchanged at
  18.88 / 12.28 / 12.28.
- Checked that the dimmer-looking "Squash" pill is not a missed case: it computes the same
  fill and foreground as "Thruster" and is simply inside the 0.45-opacity "Import Template
  Values" group, which is pre-existing.
- `grep` confirms no `bg-surf-accent-cyan … text-surf-black` or `bg-outline-ink … text-white`
  pairing remains anywhere.

## How it was found

Reproducing the Fins screen as a specimen in the colour bench. Building the filled fin
buttons meant asking what the app actually puts on that fill — and it was the wrong token.
The bench now carries `ink on accent` as an audit row, so this class of mistake shows up as a
failing pairing rather than waiting to be noticed.
