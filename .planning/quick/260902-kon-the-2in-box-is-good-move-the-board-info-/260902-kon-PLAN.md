---
phase: quick-260902-kon
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/geometry/template.ts
  - lib/geometry/template.test.ts
  - components/template/build-strip-pdf.ts
  - components/template/build-strip-pdf.test.ts
autonomous: false
requirements: [QT-260902-kon]

estimate:
  tokens: 88000
  raw_tokens: 70000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "On the Paper Saver strip, the board name + dimensions block is printed INSIDE the outline — between the stringer and the rail curve — so a shaper who cuts the template out along the curve keeps the board's own dims attached to the template instead of throwing them away with the offcut."
    - "The 2in scale-check square and its caption are untouched: same page, same corner, same station, same half-width, to the millimetre, proven by literal expected values captured against the unmodified module BEFORE the change and never edited afterwards (the founder's ruling: the 2in box is good)."
    - "The block never crosses the outline curve. Every one of its four corners, and its full height sampled across, sits at a half-width the curve exceeds — checked over the box's real drawn height, not the 20mm placeholder lower bound."
    - "The block never sits on a registration line, on a registration label, or on a working-mark label. It also never sits in the shared overlap band a page has with a neighbouring sheet, on either the nose or the tail edge."
    - "The block never collides with the big page numeral. The numeral's own placement rule is unchanged on every page — it still sits 4mm right of the stringer where the stringer prints and at the printable left edge where it does not; the BLOCK is what moves. Midlength on Letter is the proof case: the numeral sits at station 2035.6 and the first otherwise-fitting band is 2033.0-2058.6, so the block is pushed down to 2000.0-2025.6."
    - "On all four presets at both paper sizes the block lands on page 1, 4mm off the stringer. On a board with a nose too narrow to hold it on page 1 — a legal, in-range 10ft x 16in board with the sharpest nose angle and zero nose fullness — it lands on page 2, still inside the outline. It is never placed outboard of the curve, and its clearance off the stringer is never reduced below 4mm to force a fit."
    - "The strip's own existing maths is byte-identical: station bands, sideways slides, stringer-on-page flags, numeral columns, numeral stations, registration lines and their labels, mark segments, and label-row baselines all produce exactly the output they produced before this task, pinned by a digest test."
    - "Every placement decision lives in lib/geometry/template.ts and is unit-tested with derived expected values. The drawing module reads fields and draws them; it computes no placement of its own (CLAUDE.md Rule 1)."
    - "Every comment describing where the name block goes tells the truth after the change. The comments from 260902-cj5 and its fix round that describe the block as anchored to the same corner as the scale square, outboard of the nose taper, are rewritten."
  artifacts:
    - lib/geometry/template.ts
    - lib/geometry/template.test.ts
    - components/template/build-strip-pdf.ts
    - components/template/build-strip-pdf.test.ts
  key_links:
    - "The placement scan is the single expression that satisfies all three constraints at once: it walks pages nose-to-tail, and within a page walks station bands nose-to-tail in 1mm steps, accepting the first band that (a) clears the page's shared overlap band on any edge that borders a neighbour, (b) misses every label row on that page and the numeral's own station by a named gap, and (c) has a minimum outline half-width over the box's whole height of at least clearance + box width. One scan, three constraints — none of them can be satisfied while another is quietly violated."
    - "StripFurniturePlacement gains a pageIndex, which is the only reason the narrow-nose fallback can honour the founder's goal: a block that will not fit inside page 1's wedge moves to a LATER page of the same template rather than moving outboard onto the offcut. The scale square's placement keeps pageIndex 0 and its existing arithmetic verbatim."
    - "The box's height comes from the drawing module's own nameBlockContent (name line plus however many rows the dims wrap to) and is passed into the geometry function through the existing sizes object. The scan therefore tests the height that actually gets drawn, not a constant that approximates it."
    - "The characterisation pin captured in task 1, against the unmodified module, is what turns 'placement-only' from a claim into a fact — including the scale square's exact station and half-width, held as literal numbers so it survives the function's signature change."
---

<objective>
Move the Paper Saver strip's board name + dimensions block from its current spot — tucked
under the 2in scale square on the blank paper outside the nose taper — to INSIDE the board
outline, between the stringer and the rail curve.

Purpose: the Paper Saver's whole deliverable is a template the shaper cuts out along the
rail curve. Anything printed outside that curve is offcut and goes in the bin. Today the
board's own name and dimensions go in the bin with it, so a cut-out template can't tell you
which board it is. Moving the block inside the curve means the dims travel with the
template, permanently.

The founder reviewed the rendered strip and locked the other half of this: the 2in scale
square and its caption are good exactly where they are and do not move. This task supersedes
`design_decision` §4 of quick task 260902-cj5, which chose the outboard corner for both
pieces, on the founder's instruction.

Output: a page-and-band scan in `lib/geometry/template.ts` that places the block inside the
outline while clearing the registration lines, the label rows and the page numeral; a
drawing module that draws the block on whichever page the scan names; and a characterisation
pin proving nothing else about the strip moved.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@.claude/CLAUDE.md

@lib/geometry/template.ts
@lib/geometry/template.test.ts
@components/template/build-strip-pdf.ts
@components/template/build-strip-pdf.test.ts
</context>

<design_decision>

## 1. The bottom registration line and its label row

**Ruling.** Two mechanisms, not one.

First, the scan reserves the shared overlap band on any page edge that borders a neighbouring
sheet: the search floor is the page's tail-edge station plus `layout.overlap` on every page
except the last, and the search ceiling is the page's nose-edge station minus `layout.overlap`
on every page except the first. Second, the scan rejects any candidate band whose station span
comes within a named gap of any label row already placed on that page.

**Why.** The registration line sits at the page's tail-edge station plus half the overlap —
inside the overlap band — and its own label baseline sits a further 3mm inside it
(`STRIP_LABEL_INTERIOR_GAP_MM`). Reserving the whole overlap band puts the line and its label
out of reach with one rule, and it is the same rule the full template's own
`nameBlockPlacement` already uses (`overlapReserve`) — a rule this file already trusts rather
than a new invention. The overlap band is also duplicate content shared with the next sheet, so
furniture never belongs there regardless.

The second mechanism is needed because that first one only covers registration rows. A working
mark's label row (`stripLabelRows`, kind `"mark"`) can be at any station on a page, and on the
fallback pages a mark row is common. The label column starts 22mm right of the numeral, which
is inside the block's own horizontal span, so a label row inside the block's station band would
print straight through the box.

**Evidence this is the right size of rule, not an over-reaction.** With the block's real drawn
height of 25.60mm and 4mm of clearance, a naive nose-down scan on page 1 already clears page 1's
registration label on all four presets — the tightest is the shortboard on A4, box bottom at
station 1721.0 against a label baseline at 1698.9, 22.1mm of daylight. The two mechanisms above
turn that comfortable margin into a guarantee rather than a coincidence, and they are what make
the fallback pages (which carry mark rows) safe.

**Named gap.** `STRIP_FURNITURE_ROW_GAP_MM = 6` — the same 6mm `STRIP_LABEL_MIN_SEPARATION_MM`
already names as the distance below which two printed rows stop reading as two things. A 9pt
label has roughly 2.3mm of cap height above its baseline and 0.7mm of descender below, so 6mm
leaves visible daylight between the box's edge and the text.

## 2. The page numeral

**Ruling.** The block stays hard against the stringer — its left edge at
`max(0, page.halfWidthRange[0]) + NAME_BOX_CLEARANCE_MM`, i.e. 4mm — and the scan instead keeps
the block's STATION band clear of the numeral's own station (`page.pageNumberStation`) by a
named gap. The numeral's placement rule is not touched on any page.

**Why not the alternative** (start the block right of the numeral column, at
`pageNumberHalfWidth + STRIP_PAGE_NUMBER_COLUMN_MM` = 26mm): that raises the outline half-width
the block needs from 78mm to 100mm. The shortboard's nose does not reach 100mm of half-width
until roughly 185mm back from the tip, and page 1 is only 195.9mm deep on Letter and 190.0mm on
A4. The block would fall off page 1 for a stock preset board — the founder would lose page 1 as
the dims' home in exchange for 22mm of width. The station-clearance rule costs nothing in width.

**Why this is also the more honest reservation.** The numeral is a single glyph drawn at 36pt
bold on a `baseline: "middle"` at `pageNumberStation`. Its cap height is about 9.1mm, so it
occupies roughly ±4.6mm of station — not a full-page-height column. Reserving a 22mm-wide
full-height corridor for it would be reserving paper the numeral does not use, on the one axis
where the block has no room to spare.

**Named gap.** `STRIP_FURNITURE_NUMERAL_GAP_MM = 10` — 4.6mm of half-glyph plus 5.4mm of
daylight. The exclusion is applied on every page unconditionally, with no branch on
`stringerOnPage`: on a stringer page the numeral is at half-width 4mm and the block spans 4mm to
78mm, and on a non-stringer page the numeral is at the printable left edge and the block starts
4mm right of it. The two always overlap horizontally, so there is no case where the station
exclusion is unnecessary and no branch to get wrong.

**The collision is real, not hypothetical.** The midlength on Letter puts the numeral at station
2035.6, and the first otherwise-fitting band is 2033.0 to 2058.6 — the numeral lands inside the
box. Under this rule the scan continues down and places the block at 2000.0 to 2025.6, clear by
10mm. The same collision recurs on the fallback page of a needle-nosed board.

## 3. Narrow noses

**Ruling.** Walk pages nose-to-tail and take the first page whose inside region holds the block
under all the constraints above. `StripFurniturePlacement` gains a `pageIndex`; the scale square
keeps `pageIndex` 0 and its existing arithmetic unchanged. The clearance off the stringer is
never reduced below `NAME_BOX_CLEARANCE_MM`, and the block never crosses the curve.

**Why not reduced clearance.** Dropping clearance from 4mm to 0 buys 4mm against a 74mm box.
It cannot rescue a genuinely narrow nose, and it spends the only margin that keeps the box's
left edge from printing on the dashed stringer itself.

**Why not accept an outboard fallback.** Explicitly rejected by the founder's goal: the block's
entire reason for moving is that outboard is offcut. A fallback that puts it back outboard is a
fallback to the bug.

**Why a later page still satisfies the founder.** Page 2 is a page of the same template, cut out
along the same curve and taped to page 1. The dims still travel with the board. A later page is
a worse place to look for them, not a failure to keep them.

**Why the walk always terminates.** The widepoint is at least 16in of full width on any board
the outline editor can draw (`WIDEPOINT_WIDTH_RANGE_IN.min`), i.e. 203mm of half-width against a
78mm requirement, so a fitting band always exists somewhere on the strip.

**This is not hypothetical either.** A legal, in-range spec — 10ft length, 16in widepoint width,
nose angle 35 degrees, nose fullness 0 — produces a nose that cannot hold the block on page 1 at
either paper size. It lands on page 2 (top station 2731.1 on Letter, 2731.0 on A4), inside the
outline, 4mm off the stringer.

**Fallback tiers, so the function is total and never throws.** Tier 1 is the full scan above.
Tier 2, if no page satisfies everything, rescans dropping only the numeral and row gaps while
keeping the containment constraint — the founder's requirement is the one that never relaxes.
Tier 3, if even that finds nothing, returns page 0's deepest searchable band, mirroring the
existing `nameBlockPlacement` fallback's own posture. Tiers 2 and 3 are unreachable for any
board the editor can produce; they exist so the function has a defined answer for every input.

## 4. Where the block lands (reported, all four presets, both papers)

Measured against this plan's rules with the block's real drawn height of 25.60mm. `top`/`bottom`
are stations from the tail; `left` is half-width off the stringer.

| Board | Paper | Page | top | bottom | left |
|-------|-------|------|-----|--------|------|
| shortboard | letter | 1 | 1746.6 | 1721.0 | 4 |
| fish | letter | 1 | 1621.4 | 1595.8 | 4 |
| midlength | letter | 1 | 2025.6 | 2000.0 | 4 |
| longboard | letter | 1 | 2722.2 | 2696.6 | 4 |
| shortboard | a4 | 1 | 1746.6 | 1721.0 | 4 |
| fish | a4 | 1 | 1621.4 | 1595.8 | 4 |
| midlength | a4 | 1 | 2028.6 | 2003.0 | 4 |
| longboard | a4 | 1 | 2722.2 | 2696.6 | 4 |
| needle-nose 10ft x 16in | letter | 2 | 2731.1 | 2705.5 | 4 |
| needle-nose 10ft x 16in | a4 | 2 | 2731.0 | 2705.4 | 4 |

(The midlength/a4 row lands on page 1, same as every other preset; only the midlength moves off
the naive first-fitting band, and it moves for the numeral, per §2.)

These are the numbers the checkpoint should see on the rendered samples. They are reported here
so the founder can check the render against a prediction; the tests derive their expected values
from the geometry rather than pasting this table.

</design_decision>

<tasks>

<task type="tracer">
  <name>Task 1: Freeze a characterisation pin for everything on the strip that must NOT move</name>
  <files>lib/geometry/template.test.ts</files>
  <read_first>
    lib/geometry/template.test.ts lines 47-70 — the existing frozen tile-grid digest pin from
    quick task 260902-cj5. Copy its shape exactly: one sha256 digest per (preset x paper),
    truncated to 16 hex characters, over the combined JSON of the functions being pinned.
  </read_first>
  <action>
    Write a new frozen characterisation pin, in the same style and with the same
    "frozen, never edit" warning as the existing tile-grid pin above it, covering the strip
    maths that this task must leave byte-identical. Run it against the UNMODIFIED module and
    paste the digests it reports as the expected values. Do not modify any source file in this
    task — the pin's whole value is that it was captured before the change.

    The digest must cover, per preset and per paper: computeStripLayout's full page list (station
    ranges, half-width ranges, min and max half-widths, stringerOnPage, pageNumberHalfWidth,
    pageNumber, pageNumberStation), stripRegistrationLines, stripMarkSegments, and stripLabelRows.

    Separately from the digest, and in the same frozen describe block, assert the scale square's
    placement as LITERAL expected numbers per preset and paper — its topStation and its
    halfWidthStart — read out of the current stripPageZeroFurniture. Literals rather than a
    digest, because the function's signature changes in task 2 and a digest over its whole return
    value would have to be re-captured; literal scale-square numbers survive the signature change
    and are what proves the founder's "the 2in box is good" ruling held. Note in the block's own
    comment that these two numbers are the founder's locked constraint, not an implementation
    detail.

    Run the full suite and confirm the new pin passes on the unmodified module and the existing
    1552-passing baseline is unchanged.
  </action>
  <verify>
    <automated>npm test 2>&amp;1 | tail -20</automated>
  </verify>
  <done>
    A new frozen describe block exists in lib/geometry/template.test.ts holding one digest per
    preset x paper over the four strip functions, plus literal scale-square topStation and
    halfWidthStart values per preset x paper. It passes against the unmodified source. No source
    file was touched. `git diff --stat` shows exactly one changed file.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Place the block inside the outline and draw it there</name>
  <files>lib/geometry/template.ts, lib/geometry/template.test.ts, components/template/build-strip-pdf.ts, components/template/build-strip-pdf.test.ts</files>
  <read_first>
    lib/geometry/template.ts lines 615-687 — `NAME_BLOCK_SEARCH_STEP_MM`,
    `NAME_BLOCK_HEIGHT_SAMPLES`, `minHalfWidthOverStationSpan` and `nameBlockPlacement`. All three
    helpers are module-private and already do exactly the scanning this task needs; reuse them
    rather than writing a second copy.
  </read_first>
  <behavior>
    - For every preset at both paper sizes, the returned name-block placement has its left edge at
      4mm off the stringer, and the outline's minimum half-width sampled across the block's whole
      height is at least 78mm — the box is inside the curve, proven over its real drawn height.
    - The returned placement's station band does not intersect any label row on its own page
      widened by 6mm, nor the numeral's station widened by 10mm.
    - The returned placement's station band lies inside its page's searchable range, i.e. clear of
      the shared overlap band on any edge that borders a neighbouring page.
    - The midlength on Letter is placed below the numeral's station rather than on the naive
      first-fitting band, and the test derives both stations from the layout rather than pasting
      them.
    - The scale square's topStation and halfWidthStart are unchanged for every preset and paper —
      the frozen literals from task 1 still pass.
    - When the block and the scale square share a page, their drawn rectangles do not overlap.
    - Both pieces are still fully inside their own page's printable rectangle.
  </behavior>
  <action>
    In lib/geometry/template.ts:

    Add `pageIndex: number` to `StripFurniturePlacement`. Rename `StripPageZeroFurniture` to
    `StripFurniture` and `stripPageZeroFurniture` to `stripFurniture`, because the name block is no
    longer guaranteed to be page 0 furniture and this repo does not leave a name lying about what
    the thing is. Give the scale square field a comment saying it is page-0-only by locked founder
    decision and that its arithmetic is deliberately untouched.

    Change the signature to take the geometry and the already-computed label rows alongside the
    existing sizes object: the geometry because the scan needs the curve, and the label rows rather
    than the marks because passing the exact rows the drawing module will draw makes "the block
    misses every label" true by construction rather than by two computations agreeing.

    Add two exported named constants with doc comments giving the reasoning from
    `design_decision` §1 and §2: a 6mm gap between the block and any label row, and a 10mm gap
    between the block and the numeral's station. Name them for what they guard, in the same style
    as the neighbouring STRIP_ constants.

    Leave the scale square's two lines of arithmetic exactly as they are, and set its pageIndex to
    0. Replace the name block's two lines with the scan: walk `layout.pages` in index order; for
    each page compute the left edge as the greater of zero and the page's own left printable edge,
    plus `NAME_BOX_CLEARANCE_MM`, and the required half-width as that plus the box width; skip the
    page if the required half-width runs past the page's right printable edge; compute the search
    floor and ceiling reserving `layout.overlap` on whichever edges border a neighbouring page and
    clamping the ceiling to the board's own length; then step down from the ceiling in
    `NAME_BLOCK_SEARCH_STEP_MM` increments, rejecting any band that intersects a label row's
    station widened by the row gap or the page's numeral station widened by the numeral gap, and
    returning the first band whose `minHalfWidthOverStationSpan` reaches the required half-width.

    Implement the three fallback tiers from `design_decision` §3 so the function is total, with a
    comment saying tiers 2 and 3 are unreachable for any board the outline editor can produce and
    exist so every input has a defined answer.

    In components/template/build-strip-pdf.ts:

    Rename `computePageZeroFurniture` to match, pass the geometry and the label rows through to the
    geometry function, and keep the existing `sizes` object shape so the scan keeps using
    `nameBlockContent`'s real computed height. In `buildStripPdf`, draw the scale square when the
    page index equals the scale square's own pageIndex and draw the name block when the page index
    equals the name block's own pageIndex, instead of both on page 0. Rename
    `stripPageZeroFurnitureRects` and `stripPageZeroPrintableRect` to page-aware equivalents: the
    rects helper returns each rect projected onto its OWN page and carrying that page's index, and
    the printable-rect helper takes the page index it should describe. The type-checker is the gate
    that no old call site survives the rename.

    In both test files: update the existing furniture suites to the new names and to per-page
    containment, and add the behaviours listed above. Every expected value is derived from the
    layout and the geometry — never a pasted number from the plan's report table.
  </action>
  <verify>
    <automated>npm test 2>&amp;1 | tail -20 &amp;&amp; npm run lint</automated>
  </verify>
  <done>
    The whole suite is green, including the frozen pin from task 1 and its literal scale-square
    values. The name block's placement is decided entirely in lib/geometry/template.ts; the drawing
    module reads `pageIndex`, `topStation` and `halfWidthStart` and draws. Lint is clean.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Prove the narrow-nose fallback, then make every comment true again</name>
  <files>lib/geometry/template.test.ts, lib/geometry/template.ts, components/template/build-strip-pdf.ts</files>
  <behavior>
    - A board built from a legal, in-range spec with a needle nose — 10ft length, 16in widepoint
      width, nose angle 35 degrees, nose fullness 0 — places the block on page index 1, not page
      index 0, at both paper sizes. The test asserts the page index moved, and asserts the block is
      still inside the outline on that page under the same containment check the presets use.
    - The same needle-nose board proves page 0 genuinely could not hold it: a direct check shows no
      band on page 0 reaches the required half-width over the box's height.
    - The block's clearance off the stringer is 4mm on the fallback page too — the fallback never
      buys its fit by moving the box toward the stringer.
    - A parameterised check over all four presets at both papers records which page index and which
      station band the block lands on, and asserts every one of them is inside the outline, clear of
      the label rows, clear of the numeral and clear of the overlap bands.
  </behavior>
  <action>
    Add the needle-nose fallback tests described above to lib/geometry/template.test.ts, building
    the geometry with `buildOutline` from a spec derived from an existing preset's outline with the
    four nose/size fields overridden — a board a real user can draw with the editor's own sliders,
    not a hand-fabricated OutlineGeometry. Say so in the test's own comment, and say why it matters:
    the fallback is reachable by a user, not a defensive branch.

    Then rewrite every comment that this change made false. The interface doc and the function doc
    above the furniture placer in lib/geometry/template.ts currently describe both pieces as sharing
    one corner anchor on the blank paper outside the nose taper; the module header of
    components/template/build-strip-pdf.ts names the old type; the doc above the furniture-computing
    helper and the two rect helpers in that file describe page 0 as where the furniture lives. Each
    one should now say what is true: the scale square is anchored to page 1's outer corner by locked
    founder decision, and the name block is scanned into the first band inside the outline that
    clears the page's registration overlap, its label rows and its numeral, on the first page that
    has one. Where a comment explains a constraint, give the reasoning from `design_decision`, not
    just the mechanism.

    Also add a short note in the placer's doc comment recording that this supersedes quick task
    260902-cj5's own decision on the block's corner, on the founder's instruction, and why: the
    template is cut out along the curve, so anything outboard is offcut.

    Finally, regenerate the review samples so the orchestrator can render page 1 and page 2 at the
    checkpoint. Write five files into
    /private/tmp/claude-501/-Users-kontoes-Code-shaper/1351620e-b04a-434a-9a98-cad58f6894ec/scratchpad/strip-out/fix2/
    using the existing opt-in sample writer and its STRIP_PDF_PRESET and STRIP_PDF_PAPER
    environment variables: longboard on letter and a4, shortboard on letter and a4, and midlength on
    letter (midlength is the numeral-collision case from `design_decision` §2 and is the one worth
    eyeballing). Name them by board and paper. Report the five paths in the summary.
  </action>
  <verify>
    <automated>npm test 2>&amp;1 | tail -20 &amp;&amp; npm run lint &amp;&amp; ! grep -rq 'both anchored' lib/geometry/template.ts components/template/build-strip-pdf.ts &amp;&amp; ! grep -rq 'block beneath it' lib/geometry/template.ts components/template/build-strip-pdf.ts &amp;&amp; echo 'stale-phrase greps clean'</automated>
  </verify>
  <done>
    The suite is green with the needle-nose fallback covered at both paper sizes. Both greps report
    0 for every file listed — the two stale phrases describing the old shared-corner anchoring are
    gone. Five sample PDFs exist at the reported paths. Lint is clean.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    The Paper Saver strip's board name + dimensions block now prints inside the board outline,
    between the stringer and the rail curve, so it stays attached to the template after the shaper
    cuts along the curve. The 2in scale square and its caption did not move.
  </what-built>
  <how-to-verify>
    Render page 1 of the longboard sample and confirm three things: the 2in square and its caption
    are exactly where they were in the last review, in the top corner outside the nose taper; the
    name and dims box is now on the other side of the curve, close to the stringer; and no part of
    the box crosses the curve, sits on the big page numeral, or sits on a label line.

    Then render page 1 of the midlength/letter sample — that is the board where the box had to move
    down the page to get out of the numeral's way. Confirm the numeral and the box read as two
    separate things.

    Then render page 1 of the shortboard samples, the narrowest nose of the four presets, and
    confirm the box still fits inside the curve there.

    Sample paths are reported in the plan summary.
  </how-to-verify>
  <resume-signal>Type "approved" or describe what looks wrong on the page</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| board design -> generated PDF | Board name and dimensions, both already sanitised upstream, cross into drawn PDF text |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-kon-01 | Tampering | `stripFurniture` placement scan | low | mitigate | The scan is a pure function over layout and geometry with a bounded, terminating walk and three total fallback tiers; no unbounded loop and no input can make it throw or return an unplaced block |
| T-kon-02 | Information disclosure | name block text | low | accept | The block prints only the board's own name and dims, already drawn on the full template today via the same `templateNameBlockText`/`nameBlockContent` helpers — no new data crosses into the PDF |
| T-kon-03 | Tampering | package installs | low | accept | No package-manager install in this task; no dependency added or changed |
</threat_model>

<verification>
- `npm test` green, with the frozen pin from task 1 unedited and passing.
- `npm run lint` clean.
- The block is inside the outline on every preset at both papers, and on the needle-nose board.
- The scale square's station and half-width match the literals captured before the change.
- `npm run build` is NOT runnable in the executor's worktree, and a bare `tsc` reports two known
  phantom `LayoutProps` errors — leave both to the orchestrator's checkpoint.
</verification>

<success_criteria>
- The name and dims block prints between the stringer and the rail curve, so it survives the cut.
- The 2in scale square is byte-identical to before, per the founder's ruling.
- All strip layout, registration, mark and label output is byte-identical, per the digest pin.
- The block clears the registration overlap band, every label row by 6mm, and the numeral by 10mm.
- All four presets land on page 1; a legal needle-nosed board lands on page 2, still inside the
  outline, never outboard and never at reduced clearance.
- Every placement decision lives in `lib/geometry/template.ts` with derived expected values; the
  drawing module derives nothing (CLAUDE.md Rule 1).
- No comment in either file still describes the block as sharing the scale square's corner.
</success_criteria>

<output>
Create `.planning/quick/260902-kon-the-2in-box-is-good-move-the-board-info-/260902-kon-SUMMARY.md` when done.
Report the five sample PDF paths in the summary so the orchestrator can render them.
</output>
