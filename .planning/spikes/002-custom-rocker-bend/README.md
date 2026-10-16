---
spike: 002
idea: custom-rocker
name: custom-rocker-bend
type: comparison
validates: "Given a real catalogue blank drawn with the app's own square-root curve, when a maker's listed custom rocker (e.g. 9'4\"B -1/4\"N18\" +1/8\"T36\" +1/8\"T18\") is applied as a bend from its stated point, then each tip moves by exactly the listed amount, the curve stays smooth and keeps rising steadily away from its low point, and the board drawn in that blank takes the new rocker"
verdict: VALIDATED
related: [001]
tags: [rocker, blank, custom-rocker, geometry, square-root-curve, fit, us-blanks, arctic-foam]
---

# Spike 002: Bending a blank's natural rocker the way the makers write it

## What This Validates
Given a real blank from `db/seed/blanks/*.csv`, prepared exactly as the app prepares it (`prepareBlank`, the square-root
rule), when a custom rocker written in US Blanks' notation is applied as a bend from its stated point (the centre when
no point is given), then:
- each tip moves by exactly the listed amount;
- the curve stays smooth, with no kink where the bend starts;
- it keeps rising steadily away from its low point, with no new dip;
- the board drawn in that blank takes the new rocker.

Two bend shapes were compared head to head, built back to back in the same script:
- **(a) even bend:** the change grows with the square of the distance past the bend point, a constant extra curve from
  that point.
- **(b) beam bend:** the shape a plank takes when held flat at the bend point and pushed at the tip.

## How to Run
```bash
tar -xzf .planning/spikes/002-custom-rocker-bend/spike-source.tar.gz -C <scratch dir>
npx --no-install tsx --tsconfig ./tsconfig.json <scratch dir>/spike-source/custom-rocker-spike.mts \
  .planning/spikes/001-maker-rocker-conventions/usb-public-rocker-listings.txt <scratch dir>/results.json
```
Run it from the repo root. It reads the catalogue through the app's own `readSeedCatalog`, and changes no app file.

## What to Expect
A summary of how every listing line was read, the bend checks, the board's own five-station rocker under each tested
custom rocker, and Arctic's named rockers compared with a plain nose/tail change. `natural-vs-custom.png` draws four
real examples (height ×4, figures natural → custom).

## Investigation Trail
1. **Reading the names.** A small reader turns each listing line into changes of the form (nose or tail, ± amount,
   distance from the tip or "from centre"). All 282 lines read, with none failing:
   - 238 pure changes, 10 natural lines;
   - 14 named, plus 3 named with a change;
   - 13 "another blank's curve", plus 4 with a change.

   Across them there are 352 single changes. 201 are from the centre and 151 are from a point; the points are mostly
   18" (44), 24" (47), 36" (22) and 12" (12), plus odd ones from 3" to 48". Amounts run in 1/16" steps from −1 5/8" to
   +1 1/2", and most are ±1/4" to ±1/2".
2. **Bending real blanks.** Every change whose blank is in our catalogue (245 lines over 10 US Blanks blanks) was
   applied to that blank's natural rocker as the app draws it:
   - each tip moved by exactly the listed amount (to 1e-6");
   - the blank's low point never moved, so no re-levelling was needed;
   - no new dip or bump appeared anywhere: the worst step backwards walking away from the low point was 0.000 mm on
     both shapes.
3. **Even bend vs beam bend.** They agree at both tips and at the bend point. Between those they differ by about
   1.9 mm per inch of change: under 1 mm for a typical 1/2" change, and 3.1 mm at most for the largest listed change,
   the 9'3"Y −1 5/8"T. Neither shape is wrong. It's what a maker's rocker table does, and no maker says.
4. **Fit.** Every listed rocker for the Shortboard preset's 6'3"RP and the Longboard preset's 9'4"B was run through
   the app's own fit check (`judgeBlank`). **None changed the verdict, the placement or the tightest spot.** That's
   correct, not a bug: bending a blank leaves its thickness and width alone. In this app a board's bottom is its
   blank's own bottom, cropped and levelled (`boardOnBlank`), so a custom rocker changes **the board's rocker** and
   leaves the fit alone.
5. **The board's own rocker** (the five stations the DATASHEET reads):

   | Preset in blank | Rocker | Tail | T12 | Centre | N12 | Nose |
   |---|---|---|---|---|---|---|
   | Shortboard in 6'3"RP | Natural | 1.584" | 0.802" | 0 | 1.225" | 4.219" |
   | | +1/2"T | 2.057" | 1.017" | 0 | 1.225" | 4.219" |
   | | −1/2"N | 1.584" | 0.802" | 0 | 1.009" | 3.747" |
   | | +1/4"T18" | 1.806" | 0.820" | 0 | 1.225" | 4.219" |
   | Longboard in 9'4"B | Natural | 3.635" | 1.955" | 0 | 2.259" | 4.599" |
   | | −1/2"N24" | 3.635" | 1.955" | 0 | 2.168" | 4.170" |
   | | −1/4"N18" +1/8"T36" +1/8"T18" | 3.850" | 2.010" | 0 | 2.245" | 4.396" |
   | | +1/2"N +1/2"T | 4.104" | 2.239" | 0 | 2.543" | 5.068" |
   | | −1 1/2"N | 3.635" | 1.955" | 0 | 1.408" | 3.192" |

   A board shorter than its blank gets slightly less than the full change at its own tips, because its tip sits a
   little in from the blank's tip, where the bend hasn't fully arrived. On the Shortboard, +1/2"T gives +0.47".
6. **Arctic's named rockers are not simple nose/tail changes.** For each row in the two tables checked by eye, a
   from-centre change with the same tip amounts was built on the table's own NAT. Its 12" stations were then read
   against the table:
   - Some named rockers are almost exactly a plain change. The 9'3" LB NOSERIDER is within 0.005", and ROR-08, LSP and
     BORST are within 1/8".
   - Others reshape the 12" stations: the 9'3" LB ROR-02 is 0.42" off at N12, HP 0.26", and the 5'8" SB PCE 0.44".

   So the app needs a second kind of custom rocker, **figures at the stations**, for Arctic's library and for any
   maker figures a shaper types in.
7. **Stress on every pickable blank** (`stress.mts`, added later the same day): large changes on all 219 blanks.
   A −2"T from the centre moves the low point on 69 blanks and takes the tail below the old low on 62 — a reverse-
   rocker tail, which US Blanks stocks (`Reverse Rocker`). A −1"T18" shows "dips" of at most 0.12 mm, the flat between
   the old and new low, not a bump. A +2"N +2"T moves the low point on 5 (the flat-bottomed 8'9"Y family). So the
   build must find the bent curve's TRUE low point by a dense scan and re-level there — the printed knots alone are
   not enough once a change is large.
8. **Marko's off-centre low point.** A +1"N from centre on the 10'2" M raised its nose tip by exactly 1", with no dip.
   The app reads that blank's lowest printed station (the centre, 0.21" as printed) as 0, so "from centre" behaves.

## Results
**VALIDATED, with two answers still to make:**
- The bend shape. They differ by under 1 mm for a 1/2" change; recommend the even bend.
- Arctic's "station figures" kind needs its own small path.

The idea works on the app's own curves, needs no new curve family (it's a step after the curve, like wings and the
round nose), and every board without a custom rocker would redraw exactly as today.

## How the app could hold a custom rocker (proposal; nothing built)

**On the board's own copy of its blank.** `BoardBlank` (lib/geometry/blank.ts) already carries the blank's catalogue
rows by value (`copy`) plus the board's own cut. It would gain one optional field, for example:

```ts
/** The blank's rocker as ordered. Absent = the natural rocker as printed (every board today). */
rocker?: {
  /** The rocker note exactly as it will print after the blank's name, e.g. `-1/4"N18" +1/8"T36"` or `HG9`. */
  note: string;
  /** Changes from natural (US Blanks / Millennium / Marko / typed by the shaper). */
  changes?: { end: "nose" | "tail"; amountMm: Mm; fromTipMm: Mm | null }[]; // null = from centre
  /** Or whole figures at stations (Arctic's stock rockers, or a maker's figures typed in). */
  stations?: { label: string; rockerMm: Mm }[];
};
```

- **Keep the catalogue copy as printed**, so the natural rocker is always there to draw beside the custom one, and the
  DATASHEET's BLANK rows keep their meaning. The custom rocker is applied when the blank is prepared.
- **Pure geometry, Rule 1:** a new `lib/geometry/custom-rocker.ts` would hold:
  - reading and writing the note (the 282-line listing is a ready test set);
  - the bend from a point (the even bend: amount × u², where u is 0 at the bend point and 1 at the tip);
  - "station figures" (replace the printed rocker at those labels and redraw with the same square-root rule);
  - one entry, a `prepareBlank` that takes the board's rocker.

  `prepareBlank(record)` stays exactly as it is for every board with no custom rocker.
- **Expected numbers come from a fixture.** As with sketch 012's round nose, the spike's code becomes the reference
  source and a script writes the golden. No number is ever hand-typed.
- **Watch item for the build:** `levelCurve` finds the lowest point by reading the knots only, which is exact today
  because each piece of the curve runs steadily. A bent curve's low point may fall between knots. In the spike none of
  the 245 moved it, but a large minus change from centre on a flat-centred blank could. Sample densely, or add the
  bend points as knots.
- **This is separate from the 12" fine-tunes.** The fine-tunes (`nose12Offset`, `tail12Offset`) are the shaper shaping
  rocker out of the foam they have. A custom rocker is the foam arriving already bent. Both can live together.

**Database (CLAUDE.md, "Database").**
- **The board's custom rocker needs no migration.** A saved board is one stored snapshot (`models.snapshot`), and the
  blank's copy lives inside it. A new optional field rides inside the snapshot, exactly as Phase 14's Thinning Starts
  did. The saved-board check (`lib/models/design-snapshot.ts`, `boardBlankSchema`) would gain it as an optional field
  that reads as "natural" when malformed.
- **Only optional later steps would touch the database, and both are additive:**
  - remembering a shaper's own shop rockers (a nullable `user_preferences` column);
  - importing the makers' published rocker lists as pick-lists (a new table or a new nullable column on `blanks`).

  The rule is the same for both: **run `npm run db:migrate:prod` before the deploy that uses it.**

**One way to write the name, app-wide.**
- Blank name + rocker note, the note in US Blanks' published notation, which Millennium's catalogue rule and shapers'
  shorthand both read the same way: `9'4"B -1/4"N18" +1/8"T36"`, `61DG +3/4"T`, `5'8" SB HG9`.
- Changes are written nose first, then tail, each signed, in inches, with a point after the N or T only when the change
  doesn't start at the centre.
- The natural rocker shows no note at all, so every board today reads as it does now.

## What the Fable session should sketch next (the founder's steps 4–5)
Use `/gsd-sketch`, with real blanks and the app's own curves, as sketches 012–015 did:
1. **ROCKER VIEWER:** the custom rocker drawn over the natural one (dashed), with a mark where each bend starts and the
   figures natural → custom. `natural-vs-custom.png` is plain evidence of the curves, not the design.
2. **The name and figures on the blank:** the sidebar BLANK button, the DATASHEET (BLANK rows vs a NATURAL row), and
   the order form's blank line, where the note matters most because the shaper orders exactly that.
3. **Sketch 015 B's picker popup** (branch `claude/elastic-joliot-3e9625`, quick 261015-ve9; read with `git show`, never
   merged here): a Rocker row on each card or on the picked blank — Natural / the maker's listed rockers /
   Custom… (± nose, ± tail, optional "from" point).

## The founder's decisions (each with a recommendation)
1. **One way of writing it for every maker?** Recommend **yes**: US Blanks' published notation for changes, and the
   maker's own name for a named stock rocker (Arctic's HG9, US Blanks' Hawaii).
2. **What to offer first?**
   - Recommend **(a) typed changes on any maker's blank first**: ± at the nose and ± at the tail, each from the centre
     or from a point. That covers US Blanks, Millennium and Marko, and anything a shop stocks.
   - Then **(b) pick-lists** from the makers' published rockers: Arctic's tables need proofreading first; US Blanks'
     listings are clean text.
   - Leave **(c) named rockers with no published figures** (Hawaii, TM Flat, Frye, Classic) and **another blank's
     curve** (B/C) until a maker gives figures. Until then a shaper could type the figures their supplier quotes.
3. **Bend shape between the bend point and the tip:** recommend the **even bend**. It's the simplest, and it differs
   from the beam bend by under 1 mm for a 1/2" change. Better still, ask US Blanks how their rocker table bends, or
   measure one real custom blank.
4. **Arctic's catalogue vs its website tables:** recommend keeping the catalogue figures as the blank's drawn rocker,
   and asking Arctic which stock rocker the 2024 drawings show before importing anything. The 5'8" SB matches neither;
   the 6'8" SBM says M06 but is HG9.
5. **US Blanks' X blanks** (6'8"AX, 9'9"AX) list a different natural rocker from their catalogue page: recommend
   leaving our data as printed and adding a DATASHEET note if the founder confirms with US Blanks.
6. **Metric:** recommend the rocker **note** stays in inches in both systems, because it's an order code the maker
   reads, like the blank's name. Every drawn or tabled **figure** follows Imperial/Metric (marks in whole mm).
7. **Fit:** a custom rocker never changes whether a board fits, only the board's rocker. Recommend saying so in the UI,
   and parking "suggest a custom rocker that gives my board's rocker" as a later idea.
