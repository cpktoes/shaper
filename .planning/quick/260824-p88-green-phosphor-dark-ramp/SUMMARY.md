---
id: 260824-p88
slug: green-phosphor-dark-ramp
date: 2026-08-24
type: quick
status: complete
---

# Green phosphor dark ramp — summary

Dark replaced with a CRT terminal scheme: `#00ff40` on `#12141a`, `#a8ffbe` muted, orange
warning pair unchanged, wash 20% → 5%. Light untouched. Dark is now a deliberate break
from light rather than a translation of it.

## Every pairing passes

Tightest is `warning-ink on well` at 5.52:1. `ink on ground` 13.48, `ink-muted on ground`
15.53, `on-accent on accent` 13.48.

**It also fixes the blue ramp's well problem.** `accent-ink on well` 3.28 → **8.61**,
`line on well` 2.36 → **8.61**. A colour this bright is legible on every surface in the
ramp, so the WELL CAVEAT in globals.css now applies to the *light* ramp only and says so.

## Three consequences, recorded at the tokens

**The accent pair collapsed.** Every other ramp ships the accent twice — a fill too bright
to be text, and a darkened sibling that can be. Here one value does both, which is legal
(13.48:1 works as text, stroke and fill alike) but costs the drawings their colour
hierarchy: the board outline (`ink`) and the construction scaffolding (`accent-ink`) are
both green now, where they were black and blue. They fall back to stroke weight and dash
pattern to distinguish themselves.

**`line-faint` is not faint.** Same value as ink, so every hairline glows — including the
tab strip's active-tab border and the nav divider. Fine for the aesthetic; just no longer
doing the "recede" job the name implies.

**`ink-muted` is brighter than `ink`** (15.53 vs 13.48), inverting primary/secondary
weight. Arguably right on a phosphor screen where pale green reads as washed-out rather
than louder, but it is the opposite of every other ramp.

## This ramp proves the on-fill fix was necessary

The blue palette did not — its `on-accent` happened to equal `ink`. Here `on-accent` is
the **ground** (`#12141a`), the inverse of the fill, while `ink` is the fill's own value:

| | |
|---|---|
| correct: `on-accent` on `accent` | 13.48:1 |
| pre-260824-nhh: `ink` on `accent` | **1:1 — invisible** |

Verified live on the outline screen: the active tail chip inverts to dark-on-green at
13.48:1 while the four inactive chips stay green-on-dark at the same ratio. That is the
conditional inline style from 260824-nhh doing exactly its job.

## Verified

build ✓ · tsc ✓ · 659/659 ✓ · eslint 0 errors. Tokens read out of the live DOM:
ground `#12141a`, ink `#00ff40`, muted `#a8ffbe`, on-accent `#12141a`, wash `5%`.

## Not evaluated

Halation. Saturated pure hues on near-black are known to blur for some readers
(astigmatism especially), and WCAG contrast math does not model it — so a 13.48:1 score
is not evidence either way. Worth a look on a real screen at length before committing to
it as the shipped dark theme.
