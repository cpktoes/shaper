---
sketch: 002
name: input-output-distinction
question: "How should a viewer distinguish computed values from user inputs?"
winner: "C"
tags: [viewer, callouts, information-design, outline, template]
---

# Sketch 002: Input vs Output Distinction

## Design Question

The Template page's dimensions are mostly inputs. How should the drawing tell a computed value
apart from something the shaper set?

## How to View

```
open .planning/sketches/002-input-output-distinction/index.html
```

## Variants

- **A: Outputs only** — apply the fins rule literally. Only nose and tail width at 12" survive.
- **B: Reference dimensions** — inputs shown parenthesised and muted, the drafting shorthand for
  a given value.
- **C: Dual system ★** — computed values get dimension lines on rails; inputs get gutter chips
  under a "Your settings" header.

## What to Look For

How quickly you can tell, without being told, which numbers the app worked out. In B the signal is
a pair of brackets. In C the two kinds of value are drawn in visibly different systems.

## Why C Won

It distinguishes by **system rather than by punctuation or colour**, so no convention has to be
taught. This project's audience is shapers, not draughtsmen — a bracket is a detail you have to
know to read, whereas a chip in a labelled column is self-evident.

It also resolves a conflict that outputs-only could not. On the Template page the dimensions are
the subject of the screen, so deleting them leaves a template drawing with no length on it. On the
Fins page the inputs are already in the sidebar and add nothing. The dual system lets each page
show what it should while keeping one shared vocabulary.

## Per-Page Rule This Establishes

| Page | Outputs (dimension lines) | Inputs (chips) |
|---|---|---|
| Template / outline | Nose width @12", tail width @12" | Length, widepoint width, widepoint offset, tail block |
| Fins | Fin positions from tail, toe, off-rail | None — sidebar covers them |

**Stated rule:** the viewer shows computed placement; inputs appear as chips only where the
dimensions themselves are the subject of the screen.

## Open Question

If the fins diagram is ever printed standalone (the deferred "Print Fins & Data" path, or a template
export), the sidebar is gone and its inputs lose their home. Reintroduce them as chips at that
point, or fall back to variant B's parenthesised reference dimensions for print only. Not decided.
