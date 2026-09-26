# Phase 11: Rocker from Real Blanks - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-25
**Phase:** 11-rocker-from-real-blanks
**Areas discussed:** What a saved board remembers, The fit rule & the blank list, Thickness settings & the foil, Curve math & the drawing
**Setup:** the founder supplied a complete written brief, approved locking it as `11-SPEC.md` before the discussion, and selected all four proposed areas. No todos were folded. The session ran on branch `rocker-blanks` with the GSD model profile switched to quality.

---

## Spec lock

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — lock the brief as the SPEC | Requirements, tests, boundaries and 'done when' land in 11-SPEC.md word for word; CONTEXT.md carries only today's decisions | ✓ |
| No — CONTEXT.md only | The brief's content is folded into CONTEXT.md; no separate spec file | |

**User's choice:** Lock the brief as the SPEC.

---

## What a saved board remembers

| Option | Description | Selected |
|--------|-------------|----------|
| Blank copied into the board | The board carries the chosen blank's own station rows plus the placement and thickness choices; everything re-derives from that copy | ✓ |
| Blank by reference | Vendor + name + placement only; re-derived from the database row wherever drawn | |
| Curve only | The resulting values only, blank name as a note; placement can't be revisited | |

**User's choice:** Blank copied into the board.

| Option | Description | Selected |
|--------|-------------|----------|
| Hand-drawn rocker stays until a blank is picked | Today's curve and controls remain as the fallback; old boards and presets open as saved | ✓ (with a note) |
| Every board gets a blank | The app auto-picks the nearest fit; the hand-drawn editor is removed; old boards move onto a blank | |
| No blank = picker only | Picker and a flat placeholder until one is chosen; old boards lose their saved rocker | |

**User's choice:** Option 1, with the instruction: *"lets make sure we use the new recommended PCHIP spline for hand-drawn and blank rocker/deck curves."*
**Notes:** The instruction was parked for the curve-math area because today's hand-drawn rocker is the three-knot Bezier that replaced a five-station spline (260829-rda) after sparse stations kinked; resolved there as D-14.

| Option | Description | Selected |
|--------|-------------|----------|
| Keep the captured rocker; pick a blank after | Presets unchanged; a blank is chosen on the ROCKER screen next | |
| Each preset names a blank + placement | The founder picks the four blanks later via a capture loop; a preset opens sitting in its foam | ✓ |
| Both | A captured rocker for the fallback plus a suggested blank | |

**User's choice:** Each preset names a blank + placement.

---

## The fit rule & the blank list

| Option | Description | Selected |
|--------|-------------|----------|
| 2 in | Keeps the most blanks visible; almost no placement room on the shortest fit | ✓ |
| 3 in (Recommended) | 1 in of slide either way on the tightest fit | |
| 4 in | 1 1/2 in of slide on the tightest fit; fewer blanks qualify | |

**User's choice:** 2 in minimum extra length.

| Option | Description | Selected |
|--------|-------------|----------|
| 1/4 in | 1/8 in a face to true the deck and bottom | |
| 3/8 in (Recommended) | Room to true both faces and still take the crust off | ✓ |
| 1/2 in | Generous; rules out blanks a shaper might still squeeze | |

**User's choice:** 3/8 in minimum extra centre thickness.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — width is a hard fit check too (Recommended) | A board wider than the blank at any station can't be cut; reason names the station | ✓ (amended) |
| Width is a warning, not a rejection | A caution that never disqualifies | |
| Not checked this phase | Length, centre thickness and the thickness envelope only | |

**User's choice:** Hard check, amended: *"the boards width must be 1" narrower than the blank width at each station, allowing 1/2" of waste material on each side at minimum."*
**Notes:** Treated as a third default setting (1 in) beside the two floors.

| Option | Description | Selected |
|--------|-------------|----------|
| Floor rule hides; envelope failures shown greyed with the reason (Recommended) | Too short / too thin at centre never appear; blanks failing along the length stay listed, greyed, with station and amount | ✓ |
| Show everything, grey what fails either test | Whole catalogue visible with reasons | |
| Hide anything that fails either test | Only fitting blanks ever listed | |

**User's choice:** Floor rule hides; envelope failures greyed with the reason.

| Option | Description | Selected |
|--------|-------------|----------|
| Same vendor, next size that fits (Recommended) | Stay with the supplier; fall back to any vendor only if theirs has none | |
| Any vendor, least foam removed | Least excess at centre and tips regardless of supplier | |
| Any vendor, closest length | The fitting blank whose length is closest to the one you had | ✓ |

**User's choice:** Any vendor, closest length.

| Option | Description | Selected |
|--------|-------------|----------|
| Both ways, 0 centred (Recommended) | Toward the nose for more nose rocker, toward the tail for more tail rocker; each end at half the extra length minus 1/2 in | ✓ |
| Toward the nose only, from 0 | The brief's range read literally, forward only | |
| Toward the tail only, from 0 | The brief's range read literally, back only | |

**User's choice:** Both ways, 0 centred.

| Option | Description | Selected |
|--------|-------------|----------|
| Best placement (Recommended) | A blank fits if any slider position fits; picking it lands the slider there; a failure's reason is at its best position | ✓ |
| Current placement | Verdicts for the slider where it stands; the list re-greys as you slide | |
| Centred only | Verdicts at placement 0 | |

**User's choice:** Best placement.

---

## Thickness settings & the foil

| Option | Description | Selected |
|--------|-------------|----------|
| On the account, in the gear menu (Recommended) | Same home as Imperial/Metric and the print option; a new board starts from them and stores its own tips; one preferences migration | ✓ |
| A settings panel on the ROCKER screen, browser-only | Remembered by that browser; nothing on the account | |
| Code defaults, edited per board only | Fixed starting numbers; adjustments live on the board | |

**User's choice:** On the account, in the gear menu.

| Option | Description | Selected |
|--------|-------------|----------|
| Read off the blank's foil, scaled to your centre (Recommended) | Thickness = the blank's × (your centre ÷ the blank's centre), never below the tip setting; the 12 in values are what that curve reads | ✓ |
| Blend from tip to centre, ignoring the blank's foil | A curve through tip → centre → tip from three numbers | |
| Scaled blank foil, eased into the tips over the last 12 in | Blank's scaled foil through the middle, blended into the tips over the final foot | |

**User's choice:** Read off the blank's foil, scaled to the centre.

| Option | Description | Selected |
|--------|-------------|----------|
| It rides along as an offset (Recommended) | Stored as ± from the derived value, re-applied after every change; Reset clears it | ✓ |
| It sticks as an absolute value | Holds until cleared even if the derived value moves | |
| It clears on any change | Any change discards the tweak | |

**User's choice:** An offset that rides along.

---

## Curve math & the drawing

| Option | Description | Selected |
|--------|-------------|----------|
| Textbook pchip, used for blanks AND the deck curve (Recommended) | pchip's exact tangent and end-slope rules as the app's one spline; today's foil moves onto it; fixtures regenerated | ✓ |
| Textbook pchip for blanks; today's spline stays for the foil | Nothing drawn today changes; two near-identical splines | |
| Today's spline counts as PCHIP | Existing tested sampler as-is; no digit-parity | |

**User's choice:** Textbook pchip for blanks and the deck curve.

| Option | Description | Selected |
|--------|-------------|----------|
| Keep the Bezier for the fallback (Recommended) | PCHIP governs blank curves and the deck; the no-blank fallback keeps its controls | |
| Fallback = your own stations on the 12 in grid, on PCHIP | Seven typed stations like a Marko sheet; dense enough that the August kink can't return | |
| Fallback = five typed stations on PCHIP | Tip, 12 in, centre each side; the sparse-station kink rejected in August can return | ✓ |

**User's choice:** Five typed stations on PCHIP — the founder accepted the stated kink risk for the fallback path.

| Option | Description | Selected |
|--------|-------------|----------|
| Board inside the blank, foam shaded (Recommended) | Blank silhouette faint, board profile inside at the placement, foam shaded between; side view only | ✓ |
| Board only, blank as a dotted outline | Today's drawing with dotted reference lines | |
| Board only | The blank is a list item and numbers | |

**User's choice:** Board inside the blank, foam shaded.

| Option | Description | Selected |
|--------|-------------|----------|
| Stays, with the blank's numbers beside the board's (Recommended) | At each of the five stations: blank rocker/thickness/width, the board's, and the foam removed | ✓ |
| Stays as today (board only) | The board's own five stations; blank numbers only under the slider | |
| Retired | The readouts under the slider replace it | |

**User's choice:** The DATASHEET stays with the blank's numbers beside the board's.

---

## Close

| Option | Description | Selected |
|--------|-------------|----------|
| I'm ready for context (Recommended) | Write 11-SPEC.md and 11-CONTEXT.md and commit on rocker-blanks; no code | ✓ |
| More questions about curve math & the drawing | | |
| Explore more gray areas | List grouping and search, phone layout of the picker, the seed script's home | |

## Claude's Discretion

Storage shape of a blank (jsonb vs table), the seed script's home and CSV reader, the mechanical SUP-exclusion rule, how the blank table reaches the client, deriving the effective foil for RAILS/VOLUME/SUMMARY in one place, the best-placement search budget, the tip-floor blend, how pchip parity is pinned, which fixtures and e2e specs move, list presentation and phone layout, Metric rendering, undo coalescing, the literal-zero US Blanks rows, and all plain-English copy — listed in full in CONTEXT.md.

## Deferred Ideas

Naming the blank on the Summary order form; tilting the board within the blank; a "blank data updated" notice for boards carrying an older copy; managing blank data or adding vendors in-app; live pointer coordinates (tooltips); the Android walk.
