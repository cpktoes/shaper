---
id: 260824-p03
slug: apply-the-founder-s-new-light-and-dark-r
date: 2026-08-24
type: quick
status: complete
---

# The blue palette — summary

Both ramps replaced with the founder's bench-picked blue scheme. Applied **exactly as
given** — the four sub-bar pairings below are recorded, not silently corrected, because
they are the founder's colours and nothing renders wrong today.

## Two rules this palette changes

**The accent is no longer fill-only.** `#00e5ff` was 1.54:1 on white — so bright it could
never be a stroke, which is why the fill always needed a 1px ink boundary. `#3490bc` is
3.58:1 and `#2d7495` is 3.54:1 on the dark ground, both over the 3:1 graphical bar. The
fill can carry its own edge now. The darker sibling still exists because 3.58 is not 4.5.

**`on-accent` is no longer theme-invariant.** Old bright cyan took black text in both
themes; this blue takes dark text in light and light text in dark.

Precision worth keeping: in *this* palette `on-accent` happens to equal `ink` in both
themes, so the pre-260824-nhh call sites would have rendered it identically. That fix is
not what makes this palette work — it is what makes the two separable later. The file's
comment says exactly this rather than implying the fix was load-bearing here.

## Verified

build ✓ · tsc ✓ · 659/659 ✓ · eslint 0 errors. Measured live in the browser: dark active
pill = `#2d7495` fill with `#f2f4f7` text at **4.71:1**; tokens resolve to the new ramps and
the wash reads 20% in dark, 10% in light. Print still forces the light ramp at 0%.

## The well caveat — latent, not live

Both wells moved toward the mid-tones, squeezing everything that lives between ink and
ground:

| | pairing | ratio | bar |
|---|---|---|---|
| light | accent-ink on well | 3.36:1 | 4.5 |
| light | warning-ink on well | 3.46:1 | 4.5 |
| dark | accent-ink on well | 3.28:1 | 4.5 |
| dark | line on well | 2.36:1 | 3 |

**Why it is latent:** `--surf-well` has one consumer (the settings menu hover row, which
puts ink on it at 13.46:1 / 10.68:1). The app's inputs still sit on `--surf-ground`. It
becomes real the first time a well carries accent or warning text.

**The light case cannot be fixed by moving the well.** `accent-ink #2b799c` is 4.86:1 on
*pure white*, so any tint at all pushes it under — even the old near-white `#f4f5f7` gives
only 4.46. The ink has to darken.

Remedies, whichever direction is preferred:

- *Keep the wells, darken/lighten the inks* — light `accent-ink #2b799c → #236480`
  (6.55 ground / 4.53 well), light `warning-ink #c93f10 → #a8330d` (6.68 / 4.62), dark
  `accent-ink #3490bc → #4aabd6` (7.09 / 4.53), dark `line #6a707c → #828a98` (5.29 / 3.38).
- *Keep the inks, pull the wells toward their grounds* — works for dark (`well → #1b1f26`
  clears everything) but **not** for light, per the paragraph above.

## Bench gap closed

The bench never audited `accent-ink`, `warning-ink` or `line` against the **well** — it only
checked them against ground and panel. That omission is why these four could be picked
without warning. All three pairings added, and the bench reseeded with this palette as its
new baseline, so "Reset ramp" returns here.

## Also unchanged by choice

`--ramp-light-line` is now full ink strength (`#010d1f`), a deliberate move away from the
grey hairline. Nothing consumes `surf-line` yet — the app's borders still use
`surf-muted/20` mixes — so this lands only when borders are migrated to the token.
