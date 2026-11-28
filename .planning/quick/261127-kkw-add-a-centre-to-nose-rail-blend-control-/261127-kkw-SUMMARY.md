---
phase: quick-261127-kkw
plan: 01
subsystem: rails
status: complete
tags: [rails, nose-rail, rail-blend, 3d, guide, volume, saved-boards]
requires: [quick-261113-psx, phase-16, phase-18]
provides:
  - Nose Rail Blends From and Nose Rail Ends At on RAILS' Nose Rail card (Advanced) and in the 3D page's Rail Blend Controls, one value on both
  - noseBlendsFrom / noseEndsAt (what the sliders show) and noseBlendStations (what the litres and the 3D board read)
  - two optional saved-board keys, noseRailBlendsFrom and noseRailEndsAt, in millimetres from the nose tip (reader rule 15, version still 5, no database change)
  - a one-time record of 142 boards' litres, 44 3D shapes and 12 board files from before the change, and the test that holds every later change to it
  - RAILS' GUIDE card "Nose Rail Blends From · Nose Rail Ends At" (eighteen cards on RAILS, 85 in all) with first-draft words on the words page
affects: [RAILS side panel, 3D side panel, VOLUME's litres on a board whose nose rail differs from its centre's, the 3D board's rings, RAILS' GUIDE, saved boards]
actuals:
  tokens: 54263   # chars/4 over the realized diff (217,051 characters; the record's JSON is about 9,000 of the tokens)
  tasks: 3
  commits: 6      # five before this SUMMARY, plus the one that carries it and the archive
tech-stack:
  added: []
  patterns:
    - "a default that is structural, not arithmetic: a board that stores nothing gets back the very stations the caller handed in, so the old rule is reproduced bit for bit"
    - "what a slider shows and what the board is cut by are two readers (the slider's top on the 1/2\" grid; the true centre)"
    - "a one-time record taken before a change, with a generator that refuses to run once the new code exists"
key-files:
  created:
    - lib/geometry/__fixtures__/nose-blend-boards.ts
    - lib/geometry/__fixtures__/nose-blend-pin.json
    - scripts/extract-nose-blend-pin.ts
    - lib/geometry/nose-blend-pin.test.ts
    - e2e/nose-rail-blend.spec.ts
  modified:
    - lib/geometry/rail-bands.ts
    - lib/geometry/volume.ts
    - lib/geometry/board-surface.ts
    - lib/geometry/blank-reasons.ts
    - lib/models/design-snapshot.ts
    - components/design/design-store.tsx
    - components/rails/rail-controls.tsx
    - components/rails/rail-band-editor.tsx
    - components/3d/three-d-controls.tsx
    - components/3d/three-d-copy.ts
    - lib/geometry/guide-rails.ts
    - components/guide/words/rails.ts
    - .planning/milestones/v1.5-phases/18-a-guide-on-every-page/18-GUIDE-WORDS.md
decisions:
  - "Each card's Reset Advanced Settings puts back its own pair: the Nose Rail card's deletes the nose's two keys, the Tail Rail card's the tail's two; neither touches the other's (the planner's reading, upheld by the orchestrator)"
  - "The nose comes before the tail: its two rows above the tail's on 3D, its GUIDE card before the tail's, the order RAILS' cards run"
  - "The GUIDE card always draws the nose's rail line: a nose always has a rail, where a tail does not always have a hard edge"
  - "An untouched Ends At shows the top of its slider (36 1/2\" on a 73 7/8\" board) while the blend still ends at the true centre (36 15/16\"), as D-02 rules"
  - "A stored pair that crosses reads its Blends From and the default end, exactly as the tail's pair does"
requirements-completed: [D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08]
metrics:
  duration: "about 85 minutes"
  completed: 2026-11-27
---

# Quick 261127-kkw: a centre-to-nose rail blend control, like the tail's — Summary

The nose's rail now has its own two sliders, **Nose Rail Blends From** and **Nose Rail Ends At**, measured from the nose, on
RAILS and on the 3D page; a board that never moves them is cut exactly as it was, proven to the last digit and the last byte.

## What a shaper now sees

**RAILS.** Open the Nose Rail card's Advanced menu. Under Sharp Bottom Tuck there is the same note the tail's rows carry
("These controls are invisible here and corresponding controls with visual verification are found on the 3D page."), then
**Nose Rail Blends From — 12"** and **Nose Rail Ends At — 36"** (on the stock 6'0"), then Reset Advanced Settings. The Center
Rail's menu has no blend rows. The Tail Rail's two rows are exactly as they were: same words, same order, same spoken names.

**3D.** Open Rail Blend Controls. The nose's two rows sit above the tail's two. They are the very same two settings RAILS
shows: move one on 3D and RAILS reads it; move it on RAILS and 3D follows.

**GUIDE.** RAILS' GUIDE has eighteen cards. The new one, *Nose Rail Blends From · Nose Rail Ends At*, sits just before the
tail's and is its mirror: the board from above with the nose station cut, then the nose from above.

## What the two sliders do to the board

The nose's rail as set (its Family, Symmetrical, Single Tuck, Sharp Bottom Tuck) runs full from the nose tip back to Blends
From, fades by the same level-ended curve the tail uses, and is the centre's rail by Ends At.

- **Ranges, the tail's own, read from the nose.** Blends From 12" to 30" in 1/2" steps; Ends At from 2" past Blends From to
  the board's centre; each slider's range follows the other, so the two can never be set closer than 2". In Metric they read
  centimetres to one decimal (30.5 cm and 91.4 cm on the stock board) and step by a whole centimetre.
- **Where the nose's rail differs from the centre's, the litres move.** Worked out on the stock 6'0" with the nose's
  Symmetrical ticked: 29.96 L untouched, 30.22 L with Ends At at 14", 29.77 L with Blends From at 30". On the Shortboard:
  29.6116 L untouched, 29.5816 L with Ends At at 14", 29.6397 L with Blends From at 30". The 3D board takes a ring at each end
  of the blend, so the hand-over is drawn where the sliders say.
- **Where the nose's rail is the centre's, nothing moves** (the stock 6'0": 30.2850 L at every setting). The rows still
  show and their labels still move, as the tail's do on a tail that matches the centre. No new words.
- **A locked board** greys both rows on RAILS and on 3D. **One drag is one Undo step.** The Nose Rail card's **Reset
  Advanced Settings** puts both back in one Undo step.

## A board that never moves them is unchanged (D-02) — the proof, in numbers

Before any product code changed, today's figures were written down in their own commit (`0540a199`):

| What was recorded | How many | After the change |
|---|---|---|
| Litres, to all 17 digits a number carries | 142 boards (Phase 16's 102, plus 40 hand-set boards whose nose rail differs from the centre's: 8 lengths from 4'0" to 12'0" by 5 nose settings) | all 142 the same digits |
| The whole 3D board (every point, triangle and face) | 44 boards (the 4 presets, all 40 hand-set boards) | all 44 the same |
| The .brd file, every byte | 12 boards (the 4 presets, 8 hand-set boards) | all 12 the same |

`lib/geometry/nose-blend-pin.test.ts` reproduces all of it: **202 cases pass**. The record was written once
(`git log` shows one commit on the JSON) and its generator now refuses to run. First figures matched the plan's cross-check:
`shortboard|asis|hard` 29.611625570636800 L, shape `ca65dbe7a7cd`, file `4d52745b2aae`; `sweep|73.875|symmetrical` shape
`9defa156963b`, file `e66f8cdc3e43`.

Also unchanged, with nothing re-recorded:

- **The older pins pass untouched**: the 102-board pin, the 74-board pin, the 40-board pin, the channelled-board pin and
  Phase 17's litres pin (991 cases with the record, at the last commit). Under `lib/geometry/__fixtures__` only the record's
  two new files changed.
- **The four presets as their cards open them today**, before and after, litres to 17 digits plus the 3D shape and the board
  file: identical line for line. Shortboard 29.611625570636800 L, Fish 34.644876036332299 L, Mid-length 49.397771107769508 L,
  Longboard 72.343084166935441 L.
- **The founder's twelve sample .brd files**, read where they are in ~/Downloads (this sandbox could read them), opened
  through the real import before and after: "12 files" both times, no warning line, and file by file
  **12 files compared, 0 differ**. Opening a .brd is not changed: nothing under `lib/export` changed, nor `brd-rails.ts` nor
  `brd-fit.ts`, and a board opened from a file carries no nose setting (D-07).
- **Saved boards**: two optional settings ride beside the tail's (millimetres from the nose tip), the saved-board version
  stays 5 and no database file changed. A board saved without them opens with no such setting. A value that could sit on no
  board is dropped on reading and costs the board nothing else.

## Short boards, and boards whose length is not a whole inch

- **Short boards.** Blends From tops out 2" short of the centre when the centre is nearer than 32": 22" on a 4'0" (Ends At
  14" to 24"), 26" on a 4'8", 28" on a 5'0". Both tips' ranges end at the centre and never pass it, so the two blends can
  meet there and never overlap. 12" is inside the range on every board the app draws.
- **A length whose centre is off the 1/2" grid** (a 73 7/8" board, centre 36 15/16"): the Ends At label reads the top of
  its slider, 36 1/2", while the untouched blend still ends at the true centre, as it always has. The moment that slider is
  dragged it stores a grid value. This is D-02's own ruling.
- On every whole-inch length from 4'0" to 12'0", dragging both sliders away and back to their own ends leaves the board
  exactly as it was (tested bit for bit).

## The three calls the plan made (the orchestrator upheld all three)

1. **Each card's own Reset.** The Nose Rail card's Reset puts the nose's pair back; the Tail Rail card's puts the tail's back.
   Neither touches the other card's pair. Proven in the browser both ways.
2. **The nose before the tail** on 3D and in the GUIDE, the order RAILS' cards run.
3. **The GUIDE card always draws the nose's rail line**: a nose always has a rail.

## Left for the founder

- **The card's three sentences are first drafts**, exactly as CONTEXT D-05 gives them, on the words page
  (`18-GUIDE-WORDS.md`, RAILS, just before the tail's card) and in the page's words module, held to each other line for line:
  - is: Where the nose's rail fades into the centre's: it runs as set from the nose to Blends From, fades, and is the
    centre's rail by Ends At.
  - does: A longer nose rail carries the nose's shape further back down the board; a shorter one hands over to the centre's
    rail sooner.
  - how: Pencil Blends From and Ends At on the rail from the nose; shape the nose's rail ahead of the first mark and blend it
    progressively into the centre's rail by the second.
- **The GUIDE's intro sentence is left as it was.** It still ends "…the cards draw the center's, and the tail's where only
  the tail has the control", which no longer mentions that one card draws the nose. Likewise the group's note ("drawn at the
  center, the tail for Hard Edge"). Both are his to mark up.
- **CLAUDE.md** was not touched (the orchestrator's, if a rule there changes).

## The pictures looked at

Taken with a scripted browser against the worktree's own dev server, read one by one:

- **RAILS, a computer, Nose Rail's Advanced open**: the note, "Nose Rail Blends From — 12"" with its thumb at the left end,
  "Nose Rail Ends At — 26"" (moved down a page for the picture), then Reset; the Center Rail card below has no blend rows.
- **RAILS, a phone (Pixel 7), NOSE tab**: under the drawing, Sharp Bottom Tuck, the note on two lines, both rows at 12" and
  36" with their thumbs at the two ends, Reset. Nothing clipped.
- **3D, a computer, Rail Blend Controls open**: the fold's note, then Nose Rail Blends From — 12", Nose Rail Ends At — 36",
  then Tail Rail Blends From — 12", Tail Rail Ends At — 36".
- **The GUIDE card** on the Shortboard, the Longboard, a 4'0" board and a Shortboard with 18"/30" stored, on a computer and
  at a 360-wide phone, with the tail's card beside each for comparison. On every one: the strip's dash-dot window sits over
  the nose end with the nose station cut; "NOSE, FROM ABOVE"; the nose's rail in ink just inside the outline from the tip to
  Blends From and in faint dashes from there to Ends At; both marks across the rail; the pushed pair in muted dashes; both
  figures whole, under the stringer, inside the box and clear of each other (12" and 37" on the Shortboard, 12" and 54" on
  the Longboard, 12" and 24" on the 4'0", 18" and 30" with the stored pair, pushed to 24" and 36"). It is the tail's card
  mirrored.

## Existing test lines changed or removed (quoted)

`e2e/rails-advanced.spec.ts`, the two tests the plan names:

```
-  test("1. the Nose rail's Advanced lists the scale, six nudges in the founder's order with the Domed Deck Band under Deck Mark 3, Single Tuck, Sharp Bottom Tuck after Bottom Tuck 3 and Reset; the Center rail's has no scale", async ({
-    expect(centerRows.length).toBe(expected.length - 1);
-    expected.slice(1).forEach((re, i) => expect(centerRows[i]).toMatch(re));
-  test("11. the nose's and the centre's Advanced menus have neither row: the nose's blend is automatic", async ({ page }, testInfo) => {
-    for (const key of ["nose", "center"] as const) {
-      const group = await showRail(page, testInfo, key);
-      const body = await openAdvanced(group);
-      await expect(body.getByRole("button", { name: /Reset Advanced Settings/ })).toBeVisible();
-      await expect(group.getByText(/^Tail Rail (Blends From|Ends At) — /)).toHaveCount(0);
-      const rows = await advancedRows(body);
-      expect(rows.filter((row) => /Blends From|Ends At/.test(row))).toEqual([]);
-    }
```

Test 1 now expects the nose's three new rows between Sharp Bottom Tuck and Reset, and the centre's list is the nose's
without the scale and without those three. Test 11 now says the centre has neither blend row, and the nose has its own two
and never the tail's.

The card counts, 17 to 18 on RAILS and 84 to 85 in all:

```
components/guide/guide-words.test.ts
- * in the app's order and card by card in the page's, and every one of the 84 cards reads clean in Metric.
-describe("GUIDE_WORDS — the 84 cards in the founder's order", () => {
-  it("is the five pages in the app's order: 22, 14, 17, 8 and 23 cards, 84 in all", () => {
-    expect(GUIDE_PAGE_WORDS.map((p) => p.cards.length)).toEqual([22, 14, 17, 8, 23]);
-    expect(GUIDE_WORDS.length).toBe(84);
-    expect(new Set(GUIDE_WORDS.map((card) => card.id)).size).toBe(84);
-  it("finds no inch or foot figure in any Metric line of the 84 cards", () => {
components/guide/words/metric-sayings.test.ts
- * page's `## Metric sayings` section, every Metric line on all 84 cards and the five intros reads without
-  it("all 84 cards, every line, with their sayings applied", () => {
-    expect(page.cards).toHaveLength(84);
components/guide/words/rails.test.ts
-  it("is the page's third section: RAILS, with its seventeen cards", () => {
-    expect(rails.cards).toHaveLength(17);
-  it("its ids are the builder's seventeen, in order", () => {
-    expect(tags).toBe(14);
-    expect(captions).toBe(16);
components/guide/words/volume.test.ts
-    expect(page.pages.map((p) => p.cards.length)).toEqual([22, 14, 17, 8, 23]);
-    expect(page.cards).toHaveLength(84);
e2e/guide-rails.spec.ts
- * RAILS' GUIDE tab (Phase 18, plan 18-05): VIEWER · DATA · INSTRUCTIONS · GUIDE, and seventeen cards about the
-  test("the strip ends in GUIDE, and GUIDE opens seventeen cards in three groups with the Shortboard's own tags and captions", async ({
e2e/guide.spec.ts
-    expect(GUIDE_WORDS).toHaveLength(84);
-    expect(GUIDE_PAGE_WORDS.map((p) => p.cards.length)).toEqual([22, 14, 17, 8, 23]);
lib/geometry/guide-pages.test.ts
-          if (field !== "tailHardEdgeBlends") out.push(id);
-  it("are the five pages in the app's order, 84 cards, the same count on every board", SLOW, () => {
-        expect(PAGES.map((p) => run(p, board, system).size), `${board.label} ${system}`).toEqual([22, 14, 17, 8, 23]);
```

`lib/geometry/guide-rails.test.ts`: each place that special-cased the tail's blend card now names the nose's twin beside it.

```
-  it("gives the seventeen cards in the words page's order", () => {
-    expect(RAILS_GUIDE_CARD_ORDER).toHaveLength(17);
-  it("draws every card at the center, and at the tail only for the controls the tail alone has (D-04)", () => {
-            expect(id).toBe(ids.blends);
-      else if (card.id === ids.blends) expect(pushes, card.id).toHaveLength(2);
-    expect(cards.get(ids.blends)!.tag.text).toMatch(/^\d+\.\d cm · \d+\.\d cm$/);
-    expect(guideCaptionText(cards.get(ids.blends)!.caption)).toMatch(/^dashed · \d+\.\d cm · \d+\.\d cm$/);
-  it("draws a section card 186 tall and the tail from above 176 (UI-SPEC §4)", () => {
-      expect(card.figure.height, card.id).toBe(card.id === ids.blends ? 176 : 186);
-        const card = buildRailsGuide(input, system).get(ids.blends)!;
-        for (const fit of [0.7, 0.79, 1.26]) {
-          expect(guideLabelOverlaps(card.figure, fit), `${preset} ${system} at ${fit}`).toEqual([]);
-          const card = buildRailsGuide(input, system).get(ids.blends)!;
```

Each of those checks is still made for the tail's card, now inside a loop over both cards. One import line changed in
`lib/geometry/board-surface.test.ts` (`-import { hardEdgeBlendsFrom, hardEdgeEndsAt } from "./rail-bands";`, the same two
names plus the nose's three). No other existing test line was removed, and no expected figure anywhere was re-recorded.

## The gates

| Gate | Result line |
|---|---|
| `npm test` (whole unit suite), run while the machine's load average stood between 400 and 600 from other work and this task's own browser run | `Test Files 10 failed \| 233 passed (243)` · `Tests 17 failed \| 14381 passed \| 2 skipped (14400)`. **All 17 were time-limit failures** ("Test timed out in 5000ms" fourteen times, 60000ms once, 120000ms once for two shaping-bay cases); no assertion failed |
| The 10 files that hit the limit, re-run on their own | `Test Files 10 passed (10)` · `Tests 2193 passed (2193)` |
| `npx tsc --noEmit` | exit 0, no output |
| `npm run lint` | `✖ 1 problem (0 errors, 1 warning)`: an unused name in `lib/db/import-designs-action.test.ts`, a file this task does not touch |
| `e2e/nose-rail-blend.spec.ts`, every profile | `28 passed`, `2 skipped` (the two 3D cases on iPhone, as the tail's 3D spec skips it) |
| `e2e/rails-advanced.spec.ts`, every profile | `74 passed`, `7 skipped` |
| `e2e/three-d-hard-edge.spec.ts`, every profile | `4 passed`, `2 skipped` |
| `e2e/guide-rails.spec.ts` + `e2e/guide.spec.ts` | `21 passed`, `24 skipped` |
| `e2e/phone-rails.spec.ts` | `40 passed`, `35 skipped` |
| `e2e/three-d-screen.spec.ts` + `template-rails-panels` + `board-lock-screens`, desktop | `39 passed`, `4 skipped` |
| `e2e/desktop-baseline.spec.ts`, desktop | `6 passed`: the six pictures as they are, no snapshot updated |
| Protected paths (`db`, `drizzle`, `lib/db`, `lib/export`, the baseline pictures, `presets.ts`, `brd-rails.ts`, `brd-fit.ts`, `preset-source.ts`, the four reports, `check-saved-boards.ts`, `CLAUDE.md`) | `git diff --quiet` exit 0 |
| Files changed since the base | the plan's own list, nothing else |

The ten unit files that hit the time limit in the loaded run, each passing alone: `build-brd-overview-pdf.test.ts` (1 case),
`brd-look.test.ts` (1), `brd.test.ts` (2), `design-snapshot.test.ts` (1, the bottom's rule 14 case), `surface-report.test.ts`
(1), `blank-fit.test.ts` (4), `board-surface.test.ts` (1), `finished-rail.test.ts` (3), `shaping-bay.test.ts` (2) and
`rail-bands.test.ts` (1). The last was **this task's own new sweep**: 0.1 seconds normally, 9.6 seconds in that run. It was
made lighter in its own commit (`196c184f`) and its file re-run: `98 passed`.

**Not run here, the orchestrator's after the merge:** `npm run build` and `npm run test:e2e:prod` (Turbopack does not build
in a worktree).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] A new sweep test could run past the time limit on a loaded machine**
- **Found during:** the gates (the whole unit suite at load average 400 to 600)
- **Issue:** `noseBlendStations`' sweep over stored pairs took 9.6 s against a 5 s limit
- **Fix:** it steps every 2 1/2" where it stepped every 1 1/4", a quarter as many pairs, still below, inside and past
  every window
- **Files modified:** `lib/geometry/rail-bands.test.ts`
- **Commit:** `196c184f`

**2. [Rule 1 - Bug] The new browser test tried to move a slider that is not drawn**
- **Found during:** Task 1, the first browser run
- **Issue:** with Ends At 2" past Blends From, Blends From has nowhere to go and its slider is not drawn (the tail's own
  behaviour); the test pressed it and waited
- **Fix:** the test moves Ends At up a page first. Fixed before Task 1's commit.
- **Files modified:** `e2e/nose-rail-blend.spec.ts`

### Other differences from the plan as written

- **A pair that crosses, in the litres' test.** The plan's wording was "garbage and a crossing pair read as the untouched
  board". A crossing pair whose Blends From is valid (26" / 20") keeps that start and reads the default end, exactly as the
  tail's pair does and as the plan's own browser case says ("opens reading 26" and the top of Ends At's slider"). The unit
  test says so: garbage and a pair outside every window read as the untouched board, to the bit; a crossing pair reads as its
  Blends From alone.
- **The archive's name.** The plan names it `261127-kkw-scripts.tar.gz`; the orchestrator's working rules name it
  `scripts.tar.gz`, and it is committed with this SUMMARY as those rules ask. It holds the before and after runs, the
  scripts that made them and a README; **no .brd file** (its listing was checked). Two of its logs list the twelve sample
  files' names and measurements, as the earlier task's archive does.
- **The dev server for the browser tests** was started by hand on port 3161 with the suite's own stand-in settings, after a
  stopped run left the suite's own server hung. It was stopped at the end.
- **Two test cases beyond the plan's list**: an untouched board's 3D rings are where they were, and the GUIDE card's window
  sits over the nose end of the strip.
- No package was installed and no lockfile changed.

## Known Stubs

None.

## Self-Check: PASSED

- Every created file exists: the record's four files, `e2e/nose-rail-blend.spec.ts`, this SUMMARY and `scripts.tar.gz`.
- Every commit is in the log: `0540a199`, `f1169096`, `982b7c10`, `12ec7961`, `196c184f`.
