---
gsd_plan_version: 1.0
quick_id: 260822-vws
slug: replace-the-cyan-accent-with-a-deeper-su
date: 2026-08-22
status: complete
---

# Quick Task 260822-vws — Deeper surf blue accent

Founder: "the cyan isn't a great color. Let's get another accent blue that's dark
enough to be AA, yet surf inspired."

## Candidates measured

| hex | | vs white | fill pairing |
|---|---|---|---|
| `#0077BE` | Pacific blue | 4.79:1 | scrapes AA |
| **`#006994`** | **sea blue** | **6.09:1** | **chosen** |
| `#046E8F` | shorebreak | 5.78:1 | |
| `#01579B` | deep ocean | 7.40:1 | |
| `#00587A` | deep lagoon | 7.84:1 | |
| `#0B4F6C` | slate ocean | 8.94:1 | |

`#006994` is a deep sea blue — unmistakably blue rather than teal, with real headroom
over the 4.5 line rather than scraping it the way `#0077BE` (4.79) would, applying the
same reasoning that settled the muted token at `#6B6B6B`.

## Two structural consequences

**1. Accent fills now take WHITE text.** A blue dark enough to pass AA as text is, by
definition, dark — `#006994` reads 6.09:1 against white but only 3.10:1 against black.
That inverts the rule Task 3 established for the bright cyan (which needed black), so
every selected chip flips its label to `text-surf-base`.

**2. One token replaces two.** The bright cyan needed a darkened `-ink` sibling because
at 1.54:1 it could not be text or a stroke. A single dark blue does both jobs, so
`surf-accent-cyan` and `surf-accent-cyan-ink` collapse into `surf-accent-blue` across
all 38 usages.

Orange is unaffected: it is only ever used as ink (warning text), never as a fill, so
the black-on-orange pairing from Task 3 has no live call site to contradict.

## Tasks

- [x] T1 — Replace the two cyan tokens with `--color-surf-accent-blue`
- [x] T2 — Rename all 38 usages across 15 files
- [x] T3 — Flip selected-chip and fill text to `text-surf-base`
- [x] T4 — Verify: measured contrast on every rendered pairing, six screens, lint,
      tests, build

## Verification

- Every accent fill measures >= 4.5:1 with its text, in the live DOM.
- Accent text and strokes on white measure >= 4.5:1.
- Summary print sheet unchanged.
