---
gsd_plan_version: 1.0
quick_id: 260822-was
slug: construction-lines-onto-the-accent-colou
date: 2026-08-22
status: complete
---

# Quick Task 260822-was — Accent construction lines + draggable control targets

Founder: "make the construction lines use the accent color and make the control points
stand out as something to drag. I'm thinking small round target that use both the
accent, orange, and board fill color."

## What the scan turned up

The construction overlay draws seven `r=4` dots in three colours, and **only five of
them are draggable**:

| dot | source | draggable |
|---|---|---|
| tail pod knot | `geometry.knots[0]` | no |
| widepoint knot | `geometry.knots[1]` | **yes** |
| nose tip knot | `geometry.knots[2]` | no |
| 4 handle ends | `geometry.handles[].to` | **yes** |

Every one currently renders as the same flat dot, so nothing distinguishes a grab
handle from a fixed reference mark. The invisible `DRAG_HIT_RADIUS` circles sit on top
of all of them, which is why the affordance reads as arbitrary today.

So the target treatment goes on exactly the five draggable points, and the two fixed
knots stay plain small dots. Then the shape means something: round target = grab it.

## Design

**Target** — three concentric parts, using the three colours asked for:

- outer disc filled with the **board fill** wash, so it reads as sitting on the board
- **accent** ring around it, tying it to every other interactive thing in the app
- **orange** core, the hot spot

**Sizing counter-scales.** A drag handle is a UI affordance, not geometry — the same
argument that pinned the callout text in 260822-vbo. At unit sizes a handle would be a
different physical size on every window, and a hit target that changes size with the
window is a usability problem, not just a cosmetic one. `useSvgFitScale` is already
wired in this component, so the radii are expressed in CSS px and divided by the fit.

**Construction lines** move from the teal `#4d8a86` to the accent, by repointing
`--outline-construction`.

## Note on the orange

Orange is the warning colour from 260822-vo2. Using it as a drag hot spot is a
different register — a 5px core inside a target on a drawing is not going to be read as
a warning message under a slider — and it is the founder's explicit call. Worth
recording that the semantic is now "attention" rather than strictly "warning".

## Tasks

- [x] T1 — Repoint `--outline-construction` at the accent
- [x] T2 — Split construction dots: fixed knots only; drop the handle-end dots the
      targets now cover
- [x] T3 — Draw the three-part target on the five draggable points, counter-scaled
- [x] T4 — Counter-scale the hit radius too; keep it above the visuals and make the
      visuals pointer-events:none so they never steal the grab
- [x] T5 — Verify: drag still works on every target, sizes hold across viewports, lint,
      tests, build

## Verification

- All five targets render and remain draggable; a drag still changes the outline.
- Target and hit radius measure the same on-screen size at 1024x700 and 1440x900.
- The two fixed knots stay plain — no false affordance.
- Summary and preset thumbnails unaffected (both pass `showConstruction={false}`).
