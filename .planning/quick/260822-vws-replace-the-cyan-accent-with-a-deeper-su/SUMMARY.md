---
gsd_summary_version: 1.0
quick_id: 260822-vws
slug: replace-the-cyan-accent-with-a-deeper-su
date: 2026-08-22
status: complete
commits:
  - b7fe483 feat(design): replace the cyan accent with a deeper surf blue
---

# Summary — Deeper surf blue accent

`--color-surf-accent-blue: #006994` — a deep sea blue at **6.09:1** on white.

## Why this one

| hex | | vs white |
|---|---|---|
| `#0077BE` | Pacific blue | 4.79:1 — scrapes AA |
| **`#006994`** | **sea blue** | **6.09:1 — chosen** |
| `#046E8F` | shorebreak | 5.78:1 |
| `#01579B` | deep ocean | 7.40:1 |
| `#00587A` | deep lagoon | 7.84:1 |
| `#0B4F6C` | slate ocean | 8.94:1 |

Unmistakably blue rather than teal, with headroom over the 4.5 line rather than
scraping it — the same reasoning that settled the muted token at `#6B6B6B`.

## Two structural consequences

**Accent fills now take white text.** A blue dark enough to pass AA as text is by
definition dark: 6.09:1 against white, 3.10:1 against black. That inverts the pairing
the bright cyan needed. Selected chips, the aim-table highlight and Print Summary all
flip to `text-surf-base`.

**One token replaced two.** The bright cyan needed a `-ink` sibling because at 1.54:1 it
could only be a fill. A dark blue is both fill and text/stroke, so `surf-accent-cyan`
and `surf-accent-cyan-ink` collapsed into `surf-accent-blue` across 15 files.

## Caught while applying

The tail-shape and fin-setup icons colour themselves by an `active` prop and would have
rendered dark-on-dark once the fill went dark. They now invert with their labels. Both
files also still held warm-grey hexes as raw SVG attributes — invisible to every
class-based sweep in the earlier tasks — now on the surf tokens.

## Orange is untouched

It is only ever used as ink for warning text, never as a fill, so the black-on-orange
pairing from 260822-vo2 has no live call site to contradict the new white-on-blue rule.
The bright orange stays defined for a future warning fill with its pairing noted.

## Verification

Measured in the live DOM rather than from the tokens: selected chip 6.09:1, Print
Summary 6.09:1 white on blue, summary print scale unchanged at 0.39. Lint clean, 633
tests pass, production build compiles.
