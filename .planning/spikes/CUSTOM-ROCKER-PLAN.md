# Custom rocker — research deep dive and build plan

Written 2026-10-16 after spikes 001 and 002, at the founder's word: *"do a full research deep dive to devise the best
plan for this addition. I like the idea of the US Blanks notation as it's descriptive even for other mfgs."*

This is the brief a later `/gsd-sketch` and `/gsd-quick` (or phase) start from. Nothing here is built. Everything
under **Decided** is the founder's; everything under **Recommended** is a proposal waiting on the founder.

## 1. What the shaper gets

On ROCKER, a board on a blank can carry **the blank's rocker as ordered from the maker**: the natural rocker (every
board today), or the natural rocker plus or minus lift at the nose and the tail, each change starting at the centre or
at a point so many inches in from that tip. The blank's name everywhere then reads the way the makers write it:

> US Blanks 9'4"B **-1/4"N18" +1/8"T36"**

The drawing shows the blank bent that way, with the natural rocker dashed behind it, and every figure that reads off
the blank — the DATASHEET, the order form the shop gets — follows. The fit never changes (bending a blank leaves its
thickness and width alone), so the blank list and the picker never need to know.

Later, with the makers' own published lists, a shaper picks a stocked rocker from a list instead of typing it — the
"regional stock rocker" the founder described.

## 2. Decided (the founder)

- **2026-10-16:** the US Blanks notation is the app-wide way of writing a custom rocker, on every maker's blank —
  "descriptive even for other mfgs". Nose first, then tail; `+` adds rocker and `-` takes it away; a figure after the
  N or T is where the bend starts, in inches in from that tip; no figure means from the centre; changes can stack.
- Research only until the founder decides the rest; build through GSD; nothing migrated or pushed without the
  founder's go (the brief of 2026-10-16).

## 3. What the research found (the short version)

Spike 001 (`001-maker-rocker-conventions/README.md`):
- US Blanks publishes the notation and, per blank, a "Public Rocker Listing" of every custom rocker it stocks, each
  named blank + change. 282 lines over 10 blanks were read; 238 are plain changes, 14 named (Hawaii, TM Flat, Frye…),
  13 "another blank's curve" (`94B B/C`), 10 natural. Custom rockers are free there.
- Millennium asks for the same change, measured from the centre unless a point is given; its blanks are marked `6.1`
  over `+3/4"T`; its store writes orders as blank · density · stringer · rocker.
- Marko says its rockers "can be adjusted to your specifications"; no format.
- Arctic keeps named stock rockers (NAT, HG9, M06, NOSERIDER…) with figures at N0 · N12 · T12 · T0, per blank, on its
  website; its catalogue sometimes draws a different one from the one it names.
- All four measure rocker from a flat line under the blank, lowest point 0, as the app does.

Spike 002 (`002-custom-rocker-bend/README.md`):
- Every one of the 245 listed changes applied to our catalogue blanks moved each tip by exactly the listed amount, kept
  the curve smooth, and changed the board's rocker but not its fit.
- Two bend shapes differ by under 1 mm for a 1/2" change. The even bend (the change grows with the square of the
  distance past the bend point) is recommended.
- Arctic's named rockers are whole shapes, not plain changes: some match a nose/tail change within 1/8", others move
  the 12" stations by up to 0.44". They need a second kind, "figures at stations".
- **Stress (added 2026-10-16, `spike-source.tar.gz` → `stress.mts`):** on all 219 pickable blanks, a large minus
  change from the centre (−2"T) moves the low point on 69 blanks and takes the tail below the old low on 62 (a
  reverse-rocker tail, which US Blanks lists as a real option, `Reverse Rocker`). A −1"T18" shows "dips" of at most
  0.12 mm (the flat between the old and new low, not a bump). So the build **re-levels the bent curve on its true low
  point**, found by a dense scan, never by the printed knots alone; nothing is clamped.

## 4. Where it touches the app (the codebase read, 2026-10-16)

Everything a custom rocker needs already has one seam to go through.

| What | Where today | What changes |
|---|---|---|
| The blank's curves | `prepareBlank(record)` in `lib/geometry/blank-fit.ts:190` → `PreparedBlank { rocker: LevelledCurve, thickness, width }` | **Unchanged.** A new pure step after it: `withCustomRocker(prepared, spec)` returns a `PreparedBlank` whose `rocker` is the bent, re-levelled curve and which also carries `naturalRocker` for the drawing. Like wings and the round nose: a step after the curve, never a new curve family. |
| Who prepares | `design-store.tsx:905` (one memo per copy), `design.ts:254` (`summarizeDesign`, the rack and summary), `design-snapshot.ts:509` (open), `before-after.ts`, `check-saved-boards.ts`, the golden scripts | Each applies the step when the board's blank carries a `rocker`. One helper, `prepareBoardBlank(blank)`, so no caller does it by hand. |
| The board on the blank | `boardOnBlank` reads `prepared.rocker.curve` (crop re-level at 415, fine-tune low-point scan at 545 walks `curve.xs`) | **Unchanged**, provided the bent curve is a real `PreparedPchip`: knots every 1/16" plus the printed stations, `sample`, `slopeAt`. Then `levelCurve`/`pchipMinimum` find the true low point (the stress finding above). |
| The board's own copy of its blank | `BoardBlank` in `lib/geometry/blank.ts:90` (`copy`, placement, two fine-tunes, cut, two Thinning Starts) | Gains `rocker?: BlankRockerSpec`. Absent = natural = every board today. |
| Saved boards | `lib/models/design-snapshot.ts`, `boardBlankSchema` (rules 1–7; rule 6 is the Thinning Starts precedent) | Rule 8: optional, bounded, `.catch(undefined)` so a malformed one reads natural and never rejects a board. **Version stays 5** (the reader before this rule drops unknown blank keys, measured in rule 6). **No migration.** |
| Picking / removing a blank | `design-store.tsx:1052 pickBlank`, `:1191 removeBlank` | Picking a different blank **clears** the custom rocker (it was ordered for that blank). Remove This Blank seeds the hand-set rocker from the profile as it is on screen (`handSetFromProfile`), so a bent blank's figures carry over — but a tip below the centre clamps to 0 (ROCKER_LIFT_RANGE_IN), as today for Pin deck. New store actions: `setBlankRocker(spec)` / `clearBlankRocker()`, one undo step each. |
| The sidebar (ROCKER screen) | `rocker-controls.tsx`: CENTER THICKNESS → BLANK → BOARD ON BLANK → ROCKER (hand-set, **hidden with a blank**) → THICKNESS. The BLANK section is one button since 261015-ve9. | **The ROCKER section comes back with a blank picked**, holding the blank's rocker as ordered: Natural, or the changes. Exact form is the sketch's question (§6). |
| The drawing | `rocker-viewer.tsx` samples `blank.bottomAt` / `deckAt` (120 points) from `BlankSideView` | The bent blank draws itself. For the overlay `BlankSideView` gains `naturalBottomAt(s)`; the viewer adds the natural line (dashed, blank-line colour) and a mark where each bend starts, in the callout grammar. |
| The DATASHEET | `rocker-datasheet.tsx`: `BLANK — US BLANKS 9'4"B` group, Rocker / Thickness / Width rows = the printed figures (`printedBlankStations`), YOUR BOARD, FOAM OFF | The group label carries the note. The BLANK Rocker row needs a decision (§6): the custom figures at the five catalogue stations with the printed ones beneath, or a footnote. |
| The name | `order-form.tsx:290` (`vendor name — centered`), `screen-tiles.ts:266` (`On a 9'4"B`), the BLANK button's `data-blank-name`, `blank-reasons.ts offerLine` | One pure `blankDisplayName(copy, rocker)`; every reader goes through it, so ROCKER and the order form always agree (`summary-blank.spec.ts` checks exactly that). |
| Units (Rule 2) | `formatSignedInchesFraction` exists; `formatSignedMark` for Metric | The note's formatter and reader live beside the geometry; the figures on screen follow Imperial/Metric as marks. The note itself: §6. |
| Volume | `volume.ts:518` "takes no rocker argument" | Untouched. The rack card's litres never move. |
| Browser tests | `e2e/rocker-blanks.spec.ts`, `summary-blank.spec.ts`, `e2e/helpers/blank-picker.ts` (the one way tests pick a blank since 261015-ve9), `desktop-baseline.spec.ts` (the ROCKER reference picture re-records on any sidebar change) | New specs reuse the helper; the baseline re-records once. |

**Depends on quick 261015-ve9 landing first.** The picker task is complete on branch `claude/elastic-joliot-3e9625`
(both plans, SUMMARY dated 2026-10-16) but not on `main` (27 commits ahead, 13 behind). Custom rocker builds on its
BLANK button and its e2e helper, so it waits for that merge.

## 5. The proposed shape (pure geometry, Rule 1)

New file `lib/geometry/custom-rocker.ts`, tested in `custom-rocker.test.ts`:

```ts
/** One change to the blank's natural rocker, in the makers' own terms (US Blanks' notation). */
export interface RockerChange {
  end: "nose" | "tail";
  /** Signed lift at that tip: + more rocker, − less. */
  amount: Mm;
  /** Where the bend starts, in from that tip. Absent = from the centre (the makers' default). */
  fromTip?: Mm;
}

/** The blank's rocker as ordered. An empty list is the natural rocker. */
export interface BlankRockerSpec {
  changes: RockerChange[];
  /** Later: a maker's named rocker (Arctic's `HG9`) and its figures at stations. */
}

export function bendAt(spec, blank, x): Mm;                 // Σ amount · u², u = 0 at the bend point, 1 at the tip
export function withCustomRocker(prepared, spec): PreparedBlank; // dense-knot curve, re-levelled on its true low
export function formatRockerNote(spec): string;             // `-1/4"N18" +1/8"T36"` — nose first, then tail
export function parseRockerNote(text): BlankRockerSpec | null; // reads every one of the 282 listed lines
export function blankDisplayName(copy, spec?): string;       // `9'4"B -1/4"N18" +1/8"T36"`; natural = the name alone
```

- The even bend: `amount × ((x − p) / (L − p))²` past a nose bend point `p`, `amount × ((p − x) / p)²` before a tail
  one; stacked changes add. Zero slope at the bend point, so no kink; the full amount exactly at the tip.
- Expected numbers come from a golden written by a script from the spike's own code (`spike-source.tar.gz` →
  `custom-rocker-spike.mts`), as sketch 012's `curves.js` became the round nose's reference. The 282-line listing is
  the reader's test set, verbatim.
- Ranges: each amount −2" to +2" in 1/16" steps (the floor of §6.6 applies); a bend point from 3" in to the centre
  in whole inches, on a **slider in 1" steps beside the rocker slider** (the founder, 2026-10-16, round seven); at
  most two changes per end (US Blanks' listings stack at most three, and two covers 350 of 352). **A second change on
  an end must start nearer the tip than the first, and its slider is limited to that.** **Two changes stack:** the
  first is applied in full and the second on top of it, so `+1/2"N +1/2"N18"` lifts the nose tip 1" above natural
  (the founder's own example; the even bend's sum does exactly this — checked on the sketch's build: 1.000").

**Database:** none for the board's rocker (it lives in the saved snapshot). Only later, optional steps touch the
database, and both are additive: a nullable column (or table) for the makers' published rocker lists, and a nullable
`user_preferences` column for a shop's own rockers. CLAUDE.md's rule for both: `npm run db:migrate:prod` **before** the
deploy that reads it.

## 6. Recommended (waiting on the founder)

1. **Scope of the first build: typed changes only, on any maker's blank.** Pick-lists (US Blanks' listings, Arctic's
   tables) and named rockers come in a second task once the makers' lists are fetched and proofread. Named rockers
   with no published figures (Hawaii, TM Flat, Frye, Classic) and "another blank's curve" wait for figures — though
   `94B B/C` on a 9'3"Y is computable later from our own catalogue, matched at the centre.
2. **How the shaper sets it — decided (the founder, 2026-10-16, sketch 016 rounds five and six):** one button
   **right under the blank card** in the BLANK section — **Customize Rocker ›**, reading **Edit Custom Rocker ›**
   once the board's blank carries one — opens a large popup (the PICK A BLANK dialog's own size; the founder: "a
   similar effect as the Add Wings button"). **The popup is laid out like the ROCKER page itself:** the controls on
   the left and scrolling, the drawing beside them; on an upright phone the drawing pinned on top and the controls
   scrolling in the space beneath it, exactly as the page does. In it: the drawing (natural dashed, the blank as
   ordered solid, a mark at each bend), NOSE and TAIL rows — an amount slider in 1/16" (1 mm in Metric) with a value
   box, "Bend starts" (the centre, or 6" · 12" · 18" · 24" · 30" · 36" · 48" in from that tip), "+ Add a second
   change" per end — ↺ Natural rocker, the note, and the footer: **Cancel · Use and save as a new blank**, plus
   **Use and edit current blank** only when the board already uses one of the shaper's custom blanks. So **every
   custom rocker in use is a saved blank** — there is no "this board only" custom rocker; a draft put back to
   natural simply uses the natural blank. A board keeps its own copy of the blank as always, so editing a saved
   custom blank later never moves a board already saved on it (the catalogue-correction rule). The sidebar shows
   only the result (the BLANK button's rocker line). A shaper never types the notation — the app writes it. Sketch
   016's A (a ROCKER section), B (rows on the BLANK card) and C (a typed field) stay as the alternatives seen.
3. **The drawing — decided (the founder, 2026-10-16, rounds three and eight):** the natural rocker dashed behind the
   bent blank, a short mark across the bottom where each bend starts (the Thinning Starts mark's grammar), and **the
   deviation from natural drawn as US Blanks' catalogue draws it (September 2026, page 11): the blank's outline, deck
   and bottom, in red over the first adjustment's span and in blue over the second's, stacked on the first**, with the
   note's figures in the same colours where the note is shown large (the popup's header). Two colour tokens per
   theme, chosen to read on Slate and Daylight (the sketch's `--adj-1` / `--adj-2`; the app's `globals.css` gets its
   own, like sketch 012's compare blue). The five board stations read the custom figures as they do today; "Show
   measuring points" unchanged. No tip close-ups. **The popup's drawing has a Show my board switch, off by default**
   (the founder, round nine): the blank alone on its bottom plane with its tip figures, natural → as ordered; on, the
   board in the blank with the five stations.
4. **The name and the DATASHEET — decided (the founder, 2026-10-16, sketch 016 round three):** every blank is named
   the same way, the name then its rocker on its own line, `Natural` included (`9'4"B` / `Natural`; `9'4"B` /
   `-1/4"N18" +1/8"T36" +1/8"T18"`), on the BLANK button, the picker's cards, the viewer's caption, the DATASHEET's
   group label and the order form (`US Blanks 9'4"B Natural — centered`). A blank's station table — a picker card and
   the DATASHEET's BLANK block — has a **Natural Rocker** row with the catalogue's printed figures and, on a custom
   blank, a **Custom Rocker** row holding the ordered figures (nose and tail tips exact). The adjustment itself is
   written once, on the name line (the founder, round four: "There's no need to repeat all of the dimensions since
   that is the appended name line of the blank"; "NAT" for Natural is an accepted short form). The screen tile
   (`On a 9'4"B`) is the one place the rocker text is left off for room — to confirm.
5. **The note in Metric stays in inches** — it is the maker's order code, like the blank's name — while every figure
   drawn, tabled or stepped follows Imperial/Metric (marks in whole mm; the stepper steps 1 mm in Metric and the
   note rounds to the nearest 1/16"). This is the one place the app would show an inch figure to a Metric shaper;
   the alternative is a metric note (`+13 mm N 46 cm`) no maker reads.
6. **No rocker value goes negative — decided (the founder, 2026-10-16):** "a negative rocker where the nose or tail
   would be below the centerpoint is not a realistic board." Each slider stops at the floor that keeps every part of
   the bent blank at or above the centre's height (the geometry gives `floorOf(end, change, others)`: the largest
   lowering such that natural + the other changes stays ≥ 0 wherever the bend has any share). So the blank's low
   point never moves and **nothing re-levels** — spike 002's "low moved" cases are all outside the floor. The upper
   bound stays +2" (the founder recalls the makers limiting changes to about ±2"; US Blanks' listings top out at
   +1 1/2" and −1 5/8").
7. **Switching to a different blank clears the custom rocker and starts from natural — decided** (the founder,
   2026-10-16). Remove This Blank keeps the board's figures (today's rule).
8. **The phone's screen tile — decided:** the rocker text joins `On a 9'4"B` on every horizontal screen (a computer,
   a phone held sideways); on an upright phone only if it does not shrink the tile's board drawing — a check at
   build time, with "off" as the fallback.
8. **Process:** sketch 016 first (`/gsd-sketch`), published for the founder's phone with pictures; then one quick task
   with a BRIEF (the 261015-ve9 pattern), three plans, after the picker lands on `main`:
   - **01 geometry and storage** — `custom-rocker.ts`, the golden, the reader over the 282 lines, `BoardBlank.rocker`,
     snapshot rule 8, `prepareBoardBlank` wired through the store, `design.ts` and the scripts. No screen changes;
     every suite proves nothing moved.
   - **02 the ROCKER screen** — the sidebar section, the drawing's overlay and marks, the DATASHEET rows; browser
     tests; the baseline re-recorded; pictures for the founder before the merge.
   - **03 the name everywhere and go-live** — the BLANK button, the order form, the screen tile, the rack card's
     tile line; `summary-blank.spec.ts`; the founder's go.
   - **Later task — pick-lists:** fetch US Blanks' per-blank listings (about 100 small sheets from usblanks.com;
     needs the founder's yes to download), proofread Arctic's 33 tables, a second kind "figures at stations", the
     additive table, and a Rocker row in the picker's cards and on the picked blank.

## 6a. Saving a custom blank for later (the founder, 2026-10-16)

*"I also want to make sure that the user can save that blank for later. It should not replace the natural rocker
blank, but essentially add a new blank to our catalogue."*

So a custom rocker is not only a setting on one board: a shaper can keep it as **a blank of their own**, listed beside
the maker's natural blank, and pick it for any later board.

- **What is saved:** the base blank's catalogue rows by value (as a board keeps its blank, D-01, so a later catalogue
  correction never moves it), the rocker spec, and the name the app wrote (`US Blanks 9'4"B -1/4"N18" +1/8"T36"
  +1/8"T18"`). Nothing about the board.
- **Starred on save** (the founder, 2026-10-16: "which should always be starred when saved"): saving a blank also
  stars it, so it sits at the top of the picker under ★ STARRED from the first look. The star key is the blank's full
  name, note included, so the stars list (sketch 015, quick 261015-ve9) holds it without a second mechanism; unstarring
  later is the shaper's choice and doesn't delete the blank.
- **Where it shows:** in the PICK A BLANK popup as a card with "Saved by you", starred, and under the maker's name among
  the rest, its station table reading the rocker as ordered; the fit verdict is the base blank's (bending
  changes no width or thickness); the nose-rocker filter and sort read the custom tip. The natural blank stays listed.
  Picking it puts the base copy plus the spec on the board, so the board carries it exactly as a hand-set custom rocker
  would.
- **Where it is set from:** "Save this blank for later" under the rocker rows (sketch 016 round two); "Remove" from the
  same line, or from the card.
- **Storage — the one database change in the first build, additive:** a new table, one row per saved blank —
  `user_blanks` (`id`, `clerk_user_id`, `base_vendor`, `base_name`, `name` (the note), `copy` jsonb, `rocker` jsonb,
  `created_at`). Signed out, the browser keeps the list, joined on sign-in — the stars rule from sketch 015. Per
  CLAUDE.md: **`npm run db:migrate:prod` before the deploy that reads it.** A nullable jsonb column on
  `user_preferences` would also do; a table is cleaner for a list that grows and is deleted from one at a time.
- **Not a catalogue change:** the `blanks` table and the CSVs stay the makers' printed figures. A saved blank is the
  shaper's, private to their account, and its DATASHEET footnote says its rocker is as ordered, to be checked on the
  foam.
- **Plan impact:** plan 03 (the name everywhere) gains the save/remove actions, the table and its migration, the
  picker's card and group, and the signed-out store — or becomes its own plan 04. Build it after the picker (quick
  261015-ve9) and its stars have landed, so MY BLANKS and ★ STARRED share one way of keeping a shaper's lists.

## 7. Open questions a maker could answer

- How a rocker table bends between the bend point and the tip (even vs beam: under 1 mm per 1/2", but a real
  custom blank measured at its 12" station would settle it).
- US Blanks: what `B/T` and `D/N` mean; the figures behind Hawaii and TM Flat; why the 6'8"AX and 9'9"AX list a
  natural rocker different from their catalogue page.
- Arctic: which stock rocker the 2024 drawings show (the 5'8" SB matches none; the 6'8" SBM says M06 but is HG9).
- Millennium and Arctic: any charge for a custom rocker.
