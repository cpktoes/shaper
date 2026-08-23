---
gsd_summary_version: 1.0
quick_id: 260822-vo2
slug: task-3-cyan-for-accent-selection-and-ora
date: 2026-08-22
status: complete
commits:
  - a9e411d feat(design): cyan for selection, orange for warnings
---

# Summary — Interactive controls & selection states

Task 3 of the 3-task design pivot. Founder's decision: cyan = accent/selection,
orange = warnings.

## The legibility rules, measured

| fill | + `text-surf-black` | + `text-surf-base` | used |
|---|---|---|---|
| cyan `#00E5FF` | **12.28:1** | 1.54:1 | black |
| orange `#FF5722` | **5.97:1** | 3.16:1 | black |

Neither accent survives as text or a stroke on white (cyan 1.54:1, orange 3.16:1), so
each has a darkened ink sibling:

- `--color-surf-accent-cyan-ink: #00767F` — 5.39:1
- `--color-surf-accent-orange-ink: #C93F10` — 5.00:1

Bright values are fills only; ink values carry text and strokes.

## Roles

| role | treatment |
|---|---|
| selection (chips, slider range/thumb, aim-table highlight, Print Summary) | cyan fill + black text |
| active nav | cyan underline + **black** text (cyan text would be 1.54:1) |
| warnings (clamp notes, "· Modified") | orange ink |
| link-style actions, card CTAs | cyan ink |
| drawing strokes (fin base lengths, template fin marks, rail band 1) | cyan ink |
| headline volume figure | plain `surf-black` — prominence from size and weight |

"· Modified" counts as a warning because it tells a shaper the fin placement has been
hand-tuned away from the model's calculated value. On a tool whose core value is numbers
a shaper trusts enough to cut foam to, that deviation deserves a caution colour.

## Token cleanup

`--outline-accent` and `--outline-accent-strong` are **deleted**, not repointed. Every
call site now names `surf-accent-cyan`, `surf-accent-cyan-ink` or `surf-accent-orange-ink`
directly, so the role is legible where it is used rather than hidden behind a token whose
name meant amber. 56 class usages converted; no `outline-accent` reference remains.

## Grouping

Selection chip rows went `gap-1.5` -> `gap-2.5` with `mt-2 mb-6` off the neighbouring
sliders, so a group reads as a group from its whitespace rather than from a drawn box.

## Verification

Contrast measured in the live DOM, not just computed from the tokens: selected chip
12.28:1, clamp warning `rgb(201,63,16)` at 5.00:1 (triggered by driving the tail-block
slider until the depth clamp fired). No accent text or stroke on white below AA anywhere.
All six screens checked. Lint clean, 633 tests pass, production build compiles.

## Design pivot complete

All three tasks are done: tokens + layout (260822-o99), typography (260822-ubq), controls
and selection (260822-vo2), plus four founder-review follow-ups — the AA contrast fix, the
plot-size and callout-legibility correction (260822-urx), the viewer-title removal, the
Inter heading switch, and the callout-size pinning (260822-vbo).

The `tailwind.config.js` the founder supplied was **never a file in this repo** — it was
pasted into the conversation as a spec, and Tailwind v4 has no JS config to put it in. The
`@theme` block in `app/globals.css` is and always was the only source of truth. Confirmed
by `git log --all -- 'tailwind.config*'` returning nothing.

Where the shipped tokens diverge from that spec: `display` is Inter not Space Grotesk,
`architectural` is 0.15em not 0.25em, `muted` is `#6B6B6B` not `#9E9E9E`, and the accent
is the sea blue `#006994` rather than cyan. Two tokens exist that the spec did not have —
the orange ink, and the accent's own dark value.
