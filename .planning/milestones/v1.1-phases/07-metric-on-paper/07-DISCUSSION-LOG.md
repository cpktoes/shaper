# Phase 7: Metric on Paper - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-06
**Phase:** 7-Metric on Paper
**Areas discussed:** The scale-check square, What the template marks say, The order form on paper, Paper size for a metric shaper

---

## Area selection

| Option | Description | Selected |
|--------|-------------|----------|
| The scale-check square | Stay a 2" square captioned in millimetres, or become a true 50 mm square in Metric — the roadmap's parked question | ✓ |
| What the template marks say | Whether a station's distance from the tail and the width beside it read cm or mm, and whether a longer metric label may shift where a label sits | ✓ |
| The order form on paper | Fixed-size compact panels that clip by design, and metric strings of a different width | ✓ |
| Paper size for a metric shaper | Whether Metric should open the export dialog on A4, and whether one export can print in the other system | ✓ |

**User's choice:** all four areas.

---

## The scale-check square

### Q1 — In Metric, what should the scale-check square be?

| Option | Description | Selected |
|--------|-------------|----------|
| Stay 2", caption in mm | Square stays the same size on every print; the Metric caption reads 50.8 mm. Nothing printed moves; the frozen pins never grow a metric branch | ✓ |
| A true 50 mm square | A round number against a metric ruler, but the square's size feeds its page-1 placement and the how-to box's room, so printed furniture moves in Metric | |
| Stay 2", caption both ways | One caption in both systems — nothing branches at all, but it changes what an Imperial shaper reads today | |

**User's choice:** Stay 2", caption in mm.
**Notes:** This is what makes success criterion 5 true by construction rather than by proof — no printed geometry changes anywhere in the phase.

### Q2 — What number does the caption (and the matching how-to line) print?

| Option | Description | Selected |
|--------|-------------|----------|
| 50.8 mm — a tenth | Honest to what's drawn; the one place in the app a millimetre value carries a decimal, because it's a calibration reference rather than a shaping mark | ✓ |
| 51 mm — whole, like everything else | Follows the whole-millimetre rule, but is 0.2 mm off from the square it describes | |
| 5.1 cm | Treats the square as a dimension; same disagreement, and the wrong family for something that small | |

**User's choice:** 50.8 mm — a tenth.

---

## What the template marks say

### Q1 — On the Paper Saver, how should `36" from tail — rail 10 3/4"` read in Metric?

| Option | Description | Selected |
|--------|-------------|----------|
| Whole millimetres | `914 mm from tail — rail 273 mm` — one unit per line, the same call made at Phase 6 UAT for fin placement; neither number appears on any screen to match | ✓ |
| Centimetres | `91.4 cm from tail — rail 27.3 cm` — follows the screen's split literally, fewer digits, consistent with mark names reading 30.5 cm on the same sheet | |
| Split the line | `91.4 cm from tail — rail 273 mm` — each number in the unit that suits its size, but mixes cm and mm on one line | |

**User's choice:** Whole millimetres.

### Q2 — When a metric label is a different width from the inch label it replaces, what may change?

| Option | Description | Selected |
|--------|-------------|----------|
| The board never moves; text lands where it fits | Curve, marks, tiling, alignment box and scale square identical in both systems; a label may sit at a different offset or break onto two lines | ✓ |
| Metric labels must occupy the same footprint | Identical placement in both systems, paid for by shrinking or abbreviating metric text | |
| Reserve the wider of the two in both | Sheets match line for line, but it changes today's Imperial output | |

**User's choice:** The board never moves; text lands where it fits.
**Notes:** This is the working definition of "nothing on paper moved" for the verifier — the geometry, not the text placement.

### Q3 — In Metric, how does the seven-value dims row carry its units?

| Option | Description | Selected |
|--------|-------------|----------|
| Every value carries its own | `Length 188.0 cm · Nose 40.0 cm · …` — no value can be misread, but seven repetitions may push the wrapped block a line taller | |
| Unit once, as a caption | `Dimensions (cm)` above, values bare — most compact, the app's own table rule | |
| Unit once at the end | `… · Thickness 6.7 cm · Volume 34.0 L` — the cm carried once on the last centimetre value, with Volume's own L after it | ✓ |

**User's choice:** Unit once at the end.

---

## The order form on paper

### Q1 — On the seven-cell dimension strip, where do the units go in Metric?

| Option | Description | Selected |
|--------|-------------|----------|
| Once, on the last cm cell | Matches the template's name block exactly, and is the narrowest option in cells that clip rather than wrap | |
| Every cell carries its own | Seven separate bordered boxes rather than one run-on line, so each stands alone and can't be misread | ✓ |
| A caption over the strip | Narrowest of all, but adds a line of furniture to a tight sheet | |

**User's choice:** Every cell carries its own.
**Notes:** Deliberately the opposite of the template's dims row on nearly the same numbers. The rule that reconciles them, recorded as CONTEXT.md D-07: a unit is carried once per line of running text, and a value standing alone in its own box carries its own.

### Q2 — In the page-2 fin placement panel, where does `mm` sit?

| Option | Description | Selected |
|--------|-------------|----------|
| Once, on the section title | Fewest repetitions on a panel that has silently eaten content before; the whole panel is one family | |
| On each group heading | Unit closer to the eye, repeated two or three times per section | |
| On every value | `Off Tail 286 mm`, `Off Rail 32 mm` — impossible to misread, and metric marks are narrower than the inch fractions they replace | ✓ |

**User's choice:** On every value.

### Q3 — If a compact panel does overflow in Metric on paper, what's the rule?

| Option | Description | Selected |
|--------|-------------|----------|
| Nothing gets cut off — the panel gives ground | Fix each clipping panel with a shorter label, tighter gap or a type step-down | |
| The tight panel drops back to a heading unit | Per-panel escape hatch from the per-value rule; buys width without touching type | |
| Shrink the value, keep every layout | Layout identical in both systems; an overflowing value's type steps down; labels truncate as today | ✓ |

**User's choice:** Shrink the value, keep every layout.
**Notes:** A tighter guarantee than the template got, and deliberately so — the order form is a designed sheet of fixed panels, the template is a working drawing where labels sit beside marks.

---

## Paper size for a metric shaper

### Q1 — Should the units choice decide which paper size the export dialog opens on?

| Option | Description | Selected |
|--------|-------------|----------|
| Metric opens on A4, Imperial on Letter | Display-only starting point; the scale square catches a wrong guess | |
| Always Letter, as today | The paper in the tray isn't the same question as the units on the tape; leave the two settings uncoupled | ✓ |
| Remember the last paper size used | Solves the real annoyance without tying paper to units, but is a new saved preference of its own | |

**User's choice:** Always Letter, as today.

### Q2 — Can a single export be printed in the other system?

| Option | Description | Selected |
|--------|-------------|----------|
| No — everything follows the chooser | One rule, as the requirements read; flipping the chooser costs nothing and reproduces every value exactly | ✓ |
| Yes — a units switch in the export dialog | Useful for handing work to the other system, but a new control and a second place units are decided | |
| Print both systems on every label | One sheet serves both readers, at roughly double the text on the labels where legibility matters most | |

**User's choice:** No — everything follows the chooser.

---

## Claude's Discretion

- The Overview Sheet's spec block — its lines follow Phase 6's table with no new decisions; the
  area line becomes cm² and drops the `sq ft` parenthetical in Metric.
- The widepoint/centre merge precision trap in `overviewStationLines` — the merge is decided from
  the printed magnitude, which differs by system; keep that intent and pin both branches.
- Where printed text is composed — thread `UnitsSystem` into `lib/geometry/template.ts`, or move
  text composition out to the three PDF builders.
- How the system reaches each surface — `useUnits()` in `order-form.tsx`, a `system` field on the
  three `Build*PdfOptions` from `export-preview-dialog.tsx`.
- Extending the `lib/units-isolation.test.ts` ledger to the four print surfaces.
- The mechanism behind shrink-to-fit, number styling, and all plain-English copy.
- Playwright stays uninstalled unless phase acceptance genuinely needs an end-to-end run.

## Deferred Ideas

- A per-export units override in the export dialog — new control, its own phase.
- Remember the last paper size used — a new saved preference, unrelated to units.
- A metric second area figure on the Overview Sheet in place of `sq ft` — a copy decision, not a
  units one.
- Eight pending todos matched on keywords alone; all eight were reviewed and rejected in Phase 6
  for the same reasons and none is a printed output. Listed in CONTEXT.md's deferred section.
