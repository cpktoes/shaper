# Phase 14: Realistic Surfboard Flow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-02
**Phase:** 14-realistic-surfboard-flow
**Areas discussed:** The tips (the founder's five open questions), The start control on ROCKER, The curve inside the square-root rule, Two steps and the cut line, What shapers will notice

The founder opened the phase with: "Open Phase 14 from the todo 'Give the foil and rocker curves a realistic surfboard flow' (my four answers are at the end of it) and start the discussion with the remaining tip questions." So the tips came first, before the usual choice of areas. Every question was asked by question card; the founder answered each card in one pass. "(Recommended)" marks the option Claude recommended.

---

## The brief

| Option | Description | Selected |
|--------|-------------|----------|
| Lock it (Recommended) | The brief (`14-SPEC.md`: nine requirements, eight carried rules) is fixed as what the phase delivers; the discussion is only about how. | ✓ |
| I'll read it first | Leave it open until the founder has read it and said what to change. | |

**User's choice:** Lock it.

---

## The tips (the founder's five open questions)

Shown first: `pictures/tip-taper-three-shapes.png`, three shapes on three boards, each from its own automatic start, with a table of what each does on the 1,635 stress boards.

### Which taper shape should the tips use?

| Option | Description | Selected |
|--------|-------------|----------|
| Steady taper (Recommended) | One even curve from the start to the tip. No thin spot on any test board; 89% of tips still start at 12". Ordinary tips up to 1/8" fuller in their last 6" than today. | ✓ |
| Soft start | Leaves the planer cut more gradually, so the bend does not change where the thinning starts. 19% of tips start further in than 12", some as far as 50". | |
| Today's S-shape | Ordinary tips stay exactly as today; only tips that hump get a longer run. 16 test boards still hump; the cured tails carry a flat step. | |

**User's choice:** Steady taper.

### One 'thinning starts' setting for both tips, or one each?

| Option | Description | Selected |
|--------|-------------|----------|
| One each (Recommended) | Nose and tail each Automatic or a set distance. On 249 of the 1,635 test boards the two tips want different starts. | ✓ |
| One for both | A single control; Automatic still per tip; a distance set by hand applies to both. | |

**User's choice:** One each.

### When a tip's thinning starts further in than 12", what should the 12" fine-tune do?

| Option | Description | Selected |
|--------|-------------|----------|
| Stay a nudge (Recommended) | Unchanged: added on top of whatever the board reads at 12", taper included. Nothing new to build. | ✓ |
| Taper through it | The taper is redrawn to pass through the tweaked 12" thickness. More to build and prove before the freeze. | |
| Switch it off there | The 12" fine-tune is greyed out for a tip that starts further in than 12". | |

**User's choice:** Stay a nudge.

### A start set by hand that is too close to the tip

| Option | Description | Selected |
|--------|-------------|----------|
| Do it and say so (Recommended) | Drawn as set, thin spot or kink included, with a line on ROCKER saying where it is thinnest and that Automatic would cure it. | ✓ |
| Stop the slider there | The control will not go closer to the tip than the board can run down steadily from. | |

**User's choice:** Do it and say so.

### Should Fit & Tip Defaults carry a start for new boards?

| Option | Description | Selected |
|--------|-------------|----------|
| Not now (Recommended) | Every new board starts on Automatic; the control lives on ROCKER only; no account or database change before the showing. | ✓ |
| Add it now | New account columns and a production database step in freeze week. | |

**User's choice:** Not now.

### The tape-measure check on a real Arctic blank

| Option | Description | Selected |
|--------|-------------|----------|
| Go live, measure after (Recommended) | The curves ship on the catalogue evidence; the founder measures when a blank is in the bay, on a one-page sheet. | ✓ |
| Measure first | The curves step waits for the measurement. | |
| Skip it | No tape check. | |

**User's choice:** Go live, measure after.

**Notes:** Claude told the founder one consequence of these answers before the second card: where a tip's start moves in past 12", that tip's 12" thickness is no longer what the planer cut leaves (358 of 3,270 test tips, typically 1/16", at most 1/2").

---

## The start control on ROCKER

The name, Thinning Starts, was stated rather than asked: it is the name in the plan the founder approved on 2026-10-02.

### Where should the two controls sit?

| Option | Description | Selected |
|--------|-------------|----------|
| With Tip Style (Recommended) | At the end of THICKNESS beside Tip Style; every row above keeps its place. | ✓ |
| Under each tip | Directly under Nose Tip and under Tail Tip. | |
| Its own group | A new TIP THINNING heading holding Tip Style and the two starts. | |

**User's choice:** With Tip Style.

### How should each control work?

| Option | Description | Selected |
|--------|-------------|----------|
| Automatic / Set pair (Recommended) | A quiet two-way choice; a slider appears only on Set. | |
| Slider + Automatic button | As in the chart of Oct 2: the slider is always there showing the automatic distance; dragging sets it by hand; the Automatic button puts it back. | ✓ |

**User's choice:** Slider + Automatic button. The founder chose against the recommendation.

### Where else should each tip's start be shown? (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| A mark on the drawing | A faint tick on ROCKER's side profile at each start. | ✓ |
| The DATASHEET | A line with the two distances beside the tip numbers. | ✓ |
| The printed order form | With the tips and the planing figures. | ✓ |

**User's choice:** All three.

---

## The curve inside the square-root rule

Shown first: `pictures/curve-inside-the-rule.png`, the three inner curves on three real blanks (the rocker, and how hard it bends), with a table of accuracy, change of bend at a station, wiggle between stations and what each needs built.

### Which curve runs inside the rule?

| Option | Description | Selected |
|--------|-------------|----------|
| 1. Today's curve (Recommended) | PCHIP. Already proven in the app; best or tied on every accuracy test; bend change at a station 24-to-1 down to about 1.5-to-1; nothing new to write. | ✓ |
| 2. Steffen's curve | A touch smoother at the stations (1.2-to-1), same accuracy; differs from choice 1 by more than 1/16" on 16 blanks; one new curve to write and prove. | |
| 3. Smoothest cubic | No change of bend at a station, but wiggles more between closely spaced stations; worst hidden-station miss 1/2" against 5/16". | |

**User's choice:** 1. Today's curve.

### The US Blanks 9'9"B

| Option | Description | Selected |
|--------|-------------|----------|
| The blank's own shape (Recommended) | Draw it as printed, accept the twelve boards, add the blank to the corrections list. | ✓ |
| Hold it back | Hide it from the blank list until checked against the catalogue page. | |

**User's choice:** The blank's own shape.

---

## Two steps and the cut line

### How should the two steps go live?

| Option | Description | Selected |
|--------|-------------|----------|
| Two pushes (Recommended) | Curves as soon as proven (target Saturday); tips on their own go; each after before-and-after pictures. | ✓ |
| One push | Nothing live until both are proven, by Monday evening. | |

**User's choice:** Two pushes.

### If the tips step is not proven by Monday evening

| Option | Description | Selected |
|--------|-------------|----------|
| Curves alone (Recommended) | The tips wait until after the 10th. | |
| Give it Tuesday | The tips get one more day; the rehearsal walk moves to Wednesday morning; the freeze stays Wednesday evening. | ✓ |

**User's choice:** Give it Tuesday. The founder chose against the recommendation.
**Notes:** Claude stated its reading back: if the tips are still not proven by Tuesday evening, the showing runs on the new curves alone. The founder did not object and moved on.

### When is the real-device rehearsal walk?

| Option | Description | Selected |
|--------|-------------|----------|
| After the last change (Recommended) | One full walk on the site exactly as the shapers will see it. | ✓ |
| Walk now, re-walk after | The full walk this weekend, then a short second pass over the changed screens after each step. | |

**User's choice:** After the last change.

---

## What shapers will notice

Told first: how far the four preset cards, the first board a visitor sees, a saved Arctic board and the fit verdicts move.

### Should the app say anything on screen?

| Option | Description | Selected |
|--------|-------------|----------|
| Nothing (Recommended) | Saved boards redraw quietly, as chosen on 2026-10-02. | ✓ |
| A line on ROCKER | A one-time line the first time a saved board opens after the change. | |

**User's choice:** Nothing.

### A report on the real saved boards before each push?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, before each push (Recommended) | The founder runs one read-only command in their own terminal; Claude reads the result back with the pictures. | ✓ |
| The copy is enough | Run it on the development copy only. | |
| No report | The stress boards and the presets are proof enough. | |

**User's choice:** Yes, before each push.

---

## Claude's Discretion

- How Automatic finds its start, within the acceptance criteria.
- How the per-tip start is stored on a saved board, and whether the saved-board version moves.
- One plan approval covering both steps (stated to the founder, not asked).
- Wording and placement details for the too-close line, the mark on the drawing, the DATASHEET line and the order form: left to the screen design step.
- Whether the start reads in centimetres or millimetres in Metric.
- The before-and-after picture set and the form of the saved-boards report.

## Deferred Ideas

- A Thinning Starts default in Fit & Tip Defaults, after the Oct 10 showing.
- Steffen's curve inside the rule, if a shaper ever remarks on the bend at a station.
- The tape-measure result on a real Arctic blank (and a Marko one), recorded when measured.
