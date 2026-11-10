---
phase: 17-bottom-contours
plan: 14
subsystem: bottom-screen
status: checkpoint
tags: [bottom, phones, touch, sideways, layout, contours]
requires:
  - 17-08..17-11 (the BOTTOM screen, its rows, VIEWER, DATA and GUIDE)
  - 17-13 (FINS' Bottom Contours button and BOTTOM in Metric, merged as a6623a6a)
provides:
  - BOTTOM on an upright phone — the drawing pinned on top at two thirds of the screen, a NOSE · CENTER · TAIL row under the tabs, and one section's controls beneath
  - BOTTOM on a phone held sideways — the two drawings keeping 360 dots of height between them, and the drawing's column scrolling to the rest
  - DATA's rows back in sight on a phone (they had been squeezed down to their headings)
  - finger-sized Height buttons on a touch screen, drawn as small as ever
  - browser proof on both phone profiles — the pin, the row, the scrolling, the touch sizes, the bands and gutters — and proof that a computer's BOTTOM did not move
  - after the founder's look — DATA on a computer shows every row of both tables and scrolls as one page, once a cut gives it its second table
  - after the founder's look — BOTTOM's browser tests wait for the rail and stringer check before they count DATA's notes or say no warning shows
affects:
  - components/bottom/bottom-editor.tsx (the phone's section row, the pinned card height, the short-screen rules)
  - components/bottom/bottom-controls.tsx (only the picked section's controls are drawn on an upright phone; after the look, a mark nothing is drawn from saying whether the rail and stringer check has caught up)
  - components/bottom/bottom-section.tsx (the Height buttons' touch area, the word Height on a short screen, the height label clear of the drawing on a phone)
  - components/bottom/bottom-data.tsx (the two tables keep their rows on a phone; after the look, on a computer too whenever there are two tables)
  - components/design/board-lock-scope.test.ts (the lock check learns the new row)
tech-stack:
  added: []
  patterns:
    - a phone's section row copied from RAILS, drawn and hidden by the layout's width rule alone — nothing reads the window
    - one section's controls at a time by hiding the other two below the width line, never by removing them from the page
    - a short screen's cards grow with what they hold and the drawing's column scrolls, RAILS' own rule
    - a small button's touch area written for that button when the shared touch box would come up short
    - a test helper that taps the phone's section first and does nothing where the row is not drawn, so one test serves a phone and a computer
key-files:
  created:
    - e2e/phone-bottom.spec.ts
    - e2e/helpers/bottom.ts
    - .planning/phases/17-bottom-contours/pictures/17-14-phones.png
    - .planning/phases/17-bottom-contours/pictures/17-14-pictures-source.tar.gz
    - .planning/phases/17-bottom-contours/pictures/17-14-data-computer.png
    - .planning/phases/17-bottom-contours/pictures/17-14-data-computer-source.tar.gz
    - .planning/phases/17-bottom-contours/deferred-items.md
  modified:
    - components/bottom/bottom-editor.tsx
    - components/bottom/bottom-controls.tsx
    - components/bottom/bottom-section.tsx
    - components/bottom/bottom-data.tsx
    - components/design/board-lock-scope.test.ts
    - e2e/phone-chrome.spec.ts
    - e2e/touch-sizing.spec.ts
    - e2e/bottom-panel.spec.ts
    - e2e/bottom-viewer.spec.ts
    - e2e/bottom-saving.spec.ts
    - e2e/bottom-wings.spec.ts
    - e2e/bottom-metric.spec.ts
    - e2e/fins-contour.spec.ts
decisions:
  - "On an upright phone BOTTOM shows one section's controls at a time, picked on a NOSE · CENTER · TAIL row under the tabs — RAILS' row, copied. The page opens on CENTER. The section tapped is also the live one, so the rail marks on the drawing follow it; the channels belong to TAIL."
  - "The row is on VIEWER only. On DATA and GUIDE all three sections' controls show beneath, because there is no row there to pick with."
  - "A tap on NOSE, CENTER or TAIL leaves the controls box scrolled where it was, exactly as RAILS does. Making it jump to the top was tried and taken back out: it is a design choice, and it is raised for the founder below."
  - "On a phone held sideways the two drawings keep 360 dots between them and the drawing's column scrolls; DATA and GUIDE grow to their full height there and scroll with the column, so nothing scrolls inside something that scrolls."
  - "DATA's two tables keep their full height on a phone, upright or sideways, and the card scrolls instead. As first built a computer's DATA was left exactly as it was and the same squeeze there was raised for the founder; at his look he asked for it fixed the same way (next line)."
  - "After the look: on a computer DATA's tables keep their full height whenever there are two of them (any board with a cut), and the card scrolls as one page. A flat board's one table is left as it was, so that page is drawn dot for dot as before — giving it full height too would cut 8 dots off its last note in a window exactly 800 tall."
  - "After the look: a board with one cut also changes on a computer. The brief hoped it would look exactly as today, but it has two tables and was squeezed the same way (each showed 186 of 459 dots), so it gets its rows back too."
  - "After the look: six starting channels opening with the rail warning on a Shortboard is right and is kept (the founder). The computer test that expected three notes was reading the page before the warning landed; it now waits for it and expects four."
  - "After the look: BOTTOM's side panel carries a mark, drawn nowhere, that says whether the rail and stringer check has caught up with the board. It is there so a test can wait for the check's answer — including the answer nothing is wrong, which shows nothing on the screen."
  - "The Height buttons (×1 ×2 ×4 ×8) each take a touch area 44 dots square on a touch screen, written for them: the app's shared touch box adds 5 dots all round, which makes 44 of a 34-dot icon and only 27 of a button this small. They stand 12 dots apart on a touch screen (4 on a computer) so the four areas sit side by side."
  - "The word Height is not drawn on a short screen, as it already is not on an upright phone: the four buttons need the room. A screen reader still hears the group's name."
  - "FINS' two icon buttons were left exactly as they are. Their touch areas measure 42 dots, not 44; the test pins what is true and proves a tap on each button's own centre presses that button and only that one."
  - "No file under lib/, no database file and no package changed."
metrics:
  duration: about 2 h 15 min on the clock (2026-11-10 03:49 to about 06:05 UTC) for Tasks 1 and 2 and the picture; about 50 min more after the founder's look
  completed: 2026-11-10 UTC (Tasks 1 and 2; Task 3 is the founder's look)
actuals:
  tokens: 25600
  tasks: 2
  commits: 8
---

# Phase 17 Plan 14: BOTTOM on phones, upright and held sideways — Summary

BOTTOM now works under a thumb: on an upright phone the drawing stays pinned on top with a NOSE · CENTER · TAIL row
under the tabs and one section's controls beneath; on a phone held sideways the two drawings keep a readable height and
their column scrolls; every control is finger-sized on a touch screen; and a computer's BOTTOM is byte for byte the
picture it was.

## What changes for the founder

- **Upright, the drawing is pinned on top.** It takes two thirds of the screen on VIEWER, DATA and GUIDE alike, so
  switching tabs never moves the controls beneath. The page itself never scrolls.
- **NOSE · CENTER · TAIL, under the tabs.** The same row RAILS has, in the same place. BOTTOM opens on CENTER. Tap TAIL
  and only TAIL's controls show beneath — its menu, its sliders, and the channels when there are any — and TAIL becomes
  the live cut, so the marks along the rail on the drawing follow. INPUTS, the finished-rail tick and the WINGS row stay
  above whichever section is picked.
- **TAIL with channels scrolls by itself.** The controls under the drawing are one box that scrolls on its own; the
  drawing stays where it is and the page stays put.
- **DATA shows its rows again.** At the last look, an upright phone's DATA showed both tables' headings and no rows.
  The rows are back: the card scrolls down through both tables and the notes, and with eight channels the layout marks
  scroll sideways with the station column staying put on the left.
- **GUIDE is one card across** and scrolls inside the pinned card.
- **Sideways, the drawings stay readable.** A phone on its side gets the computer's layout (controls on the left, the
  drawing on the right) under the phone's thin top bar. There the view from above and the cross-section keep 360 dots
  of height between them instead of being squeezed into what is left of the screen, and the drawing's column scrolls
  down to the section and the Section At slider. DATA and GUIDE grow to their full height and scroll with the column.
- **The Height buttons take a finger.** ×1 ×2 ×4 ×8 are drawn as small as ever, each inside an unseen touch area 44 dots
  square, and they stand a little further apart on a touch screen so the four areas do not cover one another.
- **Every other control was already finger-sized, and is now proven so.** The seven menus are 44 dots tall on a touch
  screen, the tick rows and the tabs take 44-dot touch areas, the slider thumbs the app's touch size.
- **A computer sees one thing change, and that one after your look.** As first built every rule added was behind the
  width line, the touch rule or the short-screen rule, and six pictures of BOTTOM on a computer taken before and after
  were the same files byte for byte. After your look DATA on a computer shows every row of both tables and scrolls as
  one page (see What changed after the founder's look). The six reference pictures of the computer's screens did not
  move, before or after.
- **Nothing in the database changed.** No migration, nothing to run on production.

## Tasks

| Task | What | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | BOTTOM on an upright phone: the drawing pinned on top, NOSE · CENTER · TAIL, one section's controls beneath | `94160477` | `components/bottom/bottom-editor.tsx`, `bottom-controls.tsx`, `bottom-section.tsx`, `bottom-data.tsx`, `components/design/board-lock-scope.test.ts`, `e2e/phone-bottom.spec.ts`, `e2e/helpers/bottom.ts`, five older browser tests |
| 2 | BOTTOM held sideways keeps its drawings readable and scrolls the column; every control finger-sized on a touch screen | `60cf75d3` | `components/bottom/bottom-editor.tsx`, `bottom-section.tsx`, `e2e/phone-bottom.spec.ts`, `e2e/phone-chrome.spec.ts`, `e2e/touch-sizing.spec.ts` |
| 3 | The founder's look (checkpoint) — the picture and this summary | `81366d50`, `8067bb9e` | `pictures/17-14-phones.png`, `pictures/17-14-pictures-source.tar.gz`, this summary, `deferred-items.md` |
| After the look, 1 | BOTTOM's tests wait for the rail and stringer check before counting DATA's notes, and expect the channels' warning on a Shortboard | `b47bf3dc` | `components/bottom/bottom-editor.tsx`, `bottom-controls.tsx`, `e2e/helpers/bottom.ts`, `e2e/bottom-viewer.spec.ts`, `bottom-panel.spec.ts`, `phone-bottom.spec.ts` |
| After the look, 2 | DATA on a computer shows every row of both tables and scrolls as one page | `fb000a88` | `components/bottom/bottom-data.tsx`, `e2e/bottom-viewer.spec.ts` |
| After the look, picture | DATA on a computer, before and after | `bd7ff7d5`, and this summary's own commit | `pictures/17-14-data-computer.png`, `pictures/17-14-data-computer-source.tar.gz`, this summary, `deferred-items.md` |

## Verification

Every run below finished before this was written. All browser runs used port 3314; the server was mine and is stopped.

| Check | Result |
| ----- | ------ |
| `npx tsc --noEmit` (after each task) | exit 0 |
| `npm run lint` (after each task) | exit 0 — one warning that was there before (`lib/db/import-designs-action.test.ts`, an unused name) |
| Before any change: the computer's reference pictures (`e2e/desktop-baseline.spec.ts`) at the base commit | 6 passed, 0 failed — exit 0 (1.7 min) |
| Task 1, first whole unit run | 7 failed, 11,423 passed — exit 1 (414 s). Two were mine: the lock check had to learn the new row, and was fixed in Task 1. Five were heavy geometry tests timing out at 5 s while a browser run shared the machine; all five pass in the final run below |
| Task 1, every BOTTOM browser test and FINS' contour test on both phones | 25 passed, 64 skipped, 3 failed — exit 1 (19.8 min). The three were older tests on the Android phone reaching for TAIL's or NOSE's controls without tapping the section first, which a phone now needs. The tests were taught to tap it; the page did not change |
| Task 1, the new phone test and the three patched files again, both phones | 30 passed, 18 skipped (tests written for a computer only), 0 failed — exit 0 (6.4 min) |
| Task 2, the plan's whole browser line on both phones and the computer (381 tests) | 161 passed, 216 skipped, 4 failed — exit 1 (18.9 min). Each of the four is settled in the next four rows |
| — the new sideways test on the iPhone | my own test's mistake (it expected the last table row in sight where DATA's notes are the column's end); fixed in the test, then `e2e/phone-bottom.spec.ts` on both phones: 12 passed, 0 failed — exit 0 (2.2 min) |
| — two older iPhone tests (the thin top bar on every screen; ROCKER's touch sizes) | load: a page that did not arrive in time. Run alone, twice over: 4 passed, 0 failed — exit 0 (1.6 min) |
| — `e2e/bottom-viewer.spec.ts` line 369 on the computer | 1 failed, alone, every time — and fails the same way with every change this plan made to the app taken back out. Not this plan's; see Deferred Issues |
| The computer's reference pictures after the change (`e2e/desktop-baseline.spec.ts`) | 6 passed, 0 failed — exit 0 (21 s); no picture changed, none updated |
| Six pictures of BOTTOM on a computer, before the plan and after | the same files, byte for byte |
| `npm test -- --testTimeout=120000` (whole unit suite, once, on the final code) | 189 files, 11,430 passed, 2 skipped — exit 0 (271 s) |
| The picture run (scratch, port 3314) | finished on both phones upright, both sideways and the touch close-ups — exit 0 |
| Nothing under `drizzle/`, in `lib/db/schema.ts` or under `lib/` changed; no `db:*` command was run; no package added | confirmed by `git diff --stat` against the base: the fourteen files in the table above and the two pictures |
| No fourth switch | the row and the one-section rule are the width rule; the sideways rules the short-screen rule; the touch areas the touch rule. No file under `components/bottom` reads the window |

### After the founder's look

Every run below finished before this was written, on the code as committed. Port 3314 again; the server was mine and
is stopped, and the port is free.

| Check | Result |
| ----- | ------ |
| `npx tsc --noEmit` and `npm run lint` | both exit 0 — lint's one warning was there before (`lib/db/import-designs-action.test.ts`, an unused name) |
| DATA's five tests in `e2e/bottom-viewer.spec.ts` on the computer, alone | 5 passed, 0 failed — exit 0 (57.7 s) |
| The new three-cut test with the fix taken back out | fails, as it should: "table 1: its box is as tall as the table (122 against 492)". Fix put back |
| Every BOTTOM browser test, the phone test and FINS' contour test, on the computer and both phones (162 tests) | 86 passed, 76 skipped (phone tests on the computer and computer tests on the phones), 0 failed — exit 0 (13.9 min) |
| The computer's reference pictures (`e2e/desktop-baseline.spec.ts`) | 6 passed, 0 failed — exit 0 (34.3 s); no picture changed, none updated. None of the six is of BOTTOM |
| The phone bands and touch sizes (`e2e/phone-chrome.spec.ts`, `e2e/touch-sizing.spec.ts`) on both phones | 70 passed, 76 skipped, 0 failed — exit 0 (5.4 min) |
| `npm test -- --testTimeout=120000` (whole unit suite, once, on the final code) | 189 files, 11,430 passed, 2 skipped — exit 0 (359 s) |
| A flat board's DATA on a computer, pictured before and after | the same file, byte for byte |
| Nothing under `drizzle/`, in `lib/db/schema.ts` or under `lib/` changed; no `db:*` command was run; no package added | confirmed by `git diff --stat` against the base |

What the tests hold, on both phone profiles (an iPhone at 390 × 664 and a Pixel 7 at 412 × 839):

- **The pin.** The drawing's column is no taller than two thirds of the screen and the card inside it no shorter than
  that less 41 dots, on VIEWER, DATA and GUIDE. GUIDE is one card across and scrolls inside the card. After scrolling
  GUIDE, DATA and the controls, the page itself has not moved.
- **The row.** BOTTOM opens on CENTER with only CENTER's controls drawn. A tap on TAIL draws only TAIL's, makes TAIL
  the live cut, and the marks along the rail follow.
- **TAIL with six channels.** The controls scroll by themselves under the pinned drawing, to the last control; the page
  stays put.
- **DATA.** Both tables show their rows. With eight channels the layout marks scroll sideways, the station column stays
  on the left and stays readable, and the fade is at the right edge.
- **Sideways,** at four sizes — an iPhone at 844 × 390 and 844 × 340 (Safari's bar showing), a Pixel 7 at 863 × 393 and
  863 × 360: the controls are beside the drawing under the thin top bar, the two drawings' box is at least 360 dots
  tall, the column scrolls to the section, DATA and GUIDE grow with the column and scroll to their ends, and the page
  never moves.
- **Touch sizes.** Every menu, tick row and slider thumb on BOTTOM is at least 44 dots; the tabs, the NOSE · CENTER ·
  TAIL row and the Height buttons each take a touch area of at least 44 dots.
- **Bands and gutters.** BOTTOM's match every other screen's, upright and sideways; its tab strip reads VIEWER, DATA,
  GUIDE, drawn 22 dots tall.
- **FINS' two icon buttons.** A tap on either button's own centre presses that button and only that one.

### Measured, for the founder

- **Sideways:** the two drawings' box is 360 dots tall — the view from above about 158, the cross-section about 121 —
  and the card 369. The column shows 342 dots on the iPhone, 292 with Safari's bar and 312 on the shorter Pixel size,
  and holds 417, so a short scroll reaches the Section At slider.
- **Sideways DATA,** on the iPhone with Safari's bar: the column shows 292 dots and holds 1,345.
- **The Height buttons:** drawn about 32 × 17 dots, each inside a 44 × 44 touch area.
- **The tabs and the section row:** drawn 22 dots tall, 44 to the touch.
- **The controls box on the shortest upright iPhone** (390 × 664): 177 dots tall under the pinned drawing.
- **The picture:** 5,400 × 4,811 dots, eighteen numbered pictures in three columns.

## Deviations from Plan

### Followed a ruling instead of the plan

**1. The commit trailer.** Every commit ends with `Co-Authored-By: Claude <noreply@anthropic.com>`, as the brief sets.

**2. DATA's rows on an upright phone (ruling 3a).** Not in the plan: found at 17-13's look and handed to this one. On
a phone both tables now keep their full height and the card scrolls. Fixed in Task 1, proven in
`e2e/phone-bottom.spec.ts`, shown on the picture.

**3. FINS' two icon buttons (ruling 3b).** Not in the plan: the brief asked for proof, not a change. Nothing in FINS
was changed; the proof is in `e2e/phone-bottom.spec.ts`.

**4. The reference pictures were run at the base commit first,** and BOTTOM on a computer was pictured before and
after (ruling 3). The plan asked only for the run after.

### Files outside the plan's list

**5. `components/design/board-lock-scope.test.ts`.** The app's lock check lists every control on every screen and
failed the moment the new row existed. It now knows the row: one more button, view-only (it picks which section is
shown, never what the board is), so a locked board keeps it.

**6. `e2e/helpers/bottom.ts`, new.** One small helper that taps the phone's section before a test reaches for its
controls, and does nothing where the row is not drawn.

**7. Five older browser tests** — `e2e/bottom-panel.spec.ts`, `bottom-saving.spec.ts`, `bottom-wings.spec.ts`,
`bottom-metric.spec.ts` and `fins-contour.spec.ts` — reached for NOSE's or TAIL's controls on a phone without picking
the section, which worked only while a phone drew all three. Each now calls the helper first. What they check did not
change.

**8. Two files on the plan's list needed no change:** `bottom-top-view.tsx` and `bottom-guide.tsx`. The view from
above already dropped its caption row on a phone, and GUIDE was already one card across.

### Small things added or adjusted while building

**9. The Height buttons have a touch area of their own, and stand further apart on a touch screen.** The plan named
the zoom row's shared touch box. Measured, that box gives a button this small a touch area 27 dots tall, not 44. So
the four buttons carry their own 44-dot-square area and sit 12 dots apart on a touch screen instead of 4. On a
computer they are exactly as they were.

**10. The word Height is dropped on a short screen too.** The plan dropped it on an upright phone only. Sideways, the
wider-spaced buttons need its room in the cross-section's top row.

**11. On a phone the cross-section's height label sits 5 dots higher.** The pinned drawing is short enough there that
the break line drawn across the board rose into the label's own line. Behind the width rule; a computer's label is where it was.

**12. The row is on VIEWER only.** The plan has the row in VIEWER's card and says it picks the controls beneath; it
does not say what DATA and GUIDE show. They show all three sections, since there is no row there to pick with.

**13. DATA and GUIDE each needed one more short-screen rule** than the plan lists, so that sideways they take their
own height and scroll with the column instead of scrolling inside it.

### Raised for the founder — a plan figure that measured differently (ruling 8)

**14. FINS' two buttons' touch areas are 42 dots, not 44.** 17-13 reported 44. The shared touch box adds 5 dots all
round measured from inside the button's 1-dot border, so a 34-dot button gets 42. The two areas share a thin strip of
the 6-dot gap between the buttons; a tap on either button's own centre presses that one and only that one. Left alone,
as ruled; the test pins 42 and "bigger than drawn". Making them a true 44 is a one-line change to the shared box that
would also touch the 3D screen's icons.

**15. The plan's own check for "no window test" prints two lines, not none.** Both are older unit tests under
`components/bottom` whose job is to forbid those very words in the page's files. No page file reads the window.

### Seen while building, and left alone

**16. The same DATA squeeze can happen on a computer.** At 1,280 × 800 with a Deep Single, a Spiral Vee and six
channels, each of DATA's two tables shows 122 of its 459 dots and scrolls inside itself. It was so before this plan.
The fix here is kept to phones because a mouse must see nothing change in this plan; extending it to a computer is one
line, and yours to call. **Settled after the look:** fixed on a computer too, in `fb000a88`.

**17. After scrolling down TAIL's controls, a tap on CENTER leaves the box scrolled where it was.** That is how RAILS
behaves too. Jumping to the top was tried: the box then shows the panel's heading and INPUTS rather than the section's
own menu, so it is not plainly better, and it was taken back out. Raised below.

**18. A computer test from 17-10 fails, and did before this plan.** See Deferred Issues. **Settled after the look:** the
warning is right and the test was reading the page too soon; repaired in `b47bf3dc`.

## Deferred Issues

**`e2e/bottom-viewer.spec.ts` line 369, on the computer, expects three notes under DATA and finds four.** With a Deep
Single and six channels at their starting numbers on the Shortboard, the app's own warning now shows: "The channels
leave the rail under 1/4" near the tail: the rail is thinner there than the floor. Lower the Depth, or move the cut
away from the tip." It fails alone every time, and fails the same way with every change this plan made to the app
taken back out, so it is not this plan's. Either the test is stale or six channels' starting numbers should not trip
the warning; that is a question about the bottom's starting numbers, not about phones. Written up in
`.planning/phases/17-bottom-contours/deferred-items.md`.

**Closed after the look (`b47bf3dc`).** The founder ruled the warning right and kept it. The test is repaired, the
note in `deferred-items.md` is marked closed, and nothing is left deferred from this plan.

## Known Stubs

None.

## Threat Flags

None. The plan changes how BOTTOM is laid out and how big its touch areas are; nothing new is saved, read or sent. The
plan's one threat is covered as far as a test can: a control or drawing out of reach on a sideways phone (T-17-12) —
the 360-dot floor and the column's own scroll are proven at four sideways sizes. The real phones are the founder's.

## What changed after the founder's look

You approved the phone work as shown (2026-11-09) and asked for two changes before it merges. Both are made, in this
same worktree.

**Your rulings on what was raised, as recorded**

- Six starting channels opening with the rail warning on a Shortboard: **kept.** The warning is right; the old test
  only passed by reading the page before the warning arrived.
- A tap on NOSE, CENTER or TAIL leaves the controls scrolled where they were: **left as built**; you judge it on your
  phone at go-live.
- FINS' two icon buttons at a 42-dot touch: **left.**
- 360 dots sideways, and the 177-dot controls box on the shortest upright iPhone: **your real phones at go-live.**
  Nothing done.

**1. The computer test that found four notes where it expected three (`b47bf3dc`).** The check that finds where a cut
leaves the stringer or the rail under 1/4" runs a moment after a pick, so a slider never waits on it, and its sentence
and DATA's note land when it is done — about a tenth of a second later. The old test counted the notes inside that
tenth of a second. It now waits for the channels' warning, reads its words from the app's own sentence rather than a
retyped one, and then counts four notes. With the Deep Single alone it first waits for the check to finish, so "three
notes and no warning" is the check's answer and not a count taken ahead of it.

To make that last wait possible the side panel now carries a mark saying whether the check has caught up with the
board. Nothing is drawn from it and nothing on the screen changes; it exists because "the check ran and found nothing"
otherwise looks exactly like "the check has not run yet".

The same wait went in everywhere else a test counted notes, or said no warning was showing, straight after a pick: the
flat board and the Rolled Belly Entry on DATA, the eighteen names on the panel, and the two DATA measures on a phone
(a late note would lengthen the page being measured). The Metric test already waited and was left alone.

**2. DATA on a computer (`fb000a88`).** On a computer a board with any cut has two tables on DATA, and each was
squeezed to a strip a few rows tall that scrolled inside the card. Now both tables keep their full height and the card
scrolls as one page down to the notes and the warnings; nothing scrolls inside something that scrolls, and the page
itself does not move. Measured at 1,280 × 800 on the stock 6'0" Shortboard:

| Board | Before — each table shows | After — each table shows | The card |
| ----- | ------------------------- | ------------------------ | -------- |
| Flat (one table) | 451 of 459 dots | 451 of 459 dots — not changed | 614 dots, nothing to scroll; the picture is the same file byte for byte |
| One cut (a Deep Single) | 186 of 459 | 459 of 459 | shows 614 of 1,160 and scrolls |
| Three cuts (Deep Single, Spiral Vee, six channels) | 122 of 459 | 459 of 459 | shows 614 of 1,288 and scrolls |

A new computer test holds it for the three-cut board: both tables' boxes as tall as the tables, the card the only
thing that scrolls down, the page still, the last layout row out of sight until scrolled to, and the last note in
sight with the card at its end. Taken back out, the fix fails that test.

**What I had to decide**

- **A board with one cut does change.** The brief asked that a board with a short DATA page — flat, or one cut — look
  exactly as today. A one-cut board is not short: it has both tables and was squeezed like the three-cut board (186 of
  459 dots each), so it gets its rows back and its card scrolls. Only the flat board can look exactly as today, and it
  does.
- **The flat board is left alone on purpose.** Giving its one table full height as well would make its page 8 dots
  taller than the card in a window exactly 800 tall, and cut the last note's bottom line. So full height is given only
  when there is a second table. A flat board in a shorter computer window still squeezes its one table a little, as
  it does today.
- **No reference picture could move.** The six are TEMPLATE, ROCKER, RAILS, VOLUME, FINS and 3D; none is of BOTTOM.
  All six passed unchanged and none was re-made.
- **The mark on the side panel** (above) is the one thing added to the app for a test's sake.

**The picture:** `.planning/phases/17-bottom-contours/pictures/17-14-data-computer.png` (2,800 × 1,110 dots; its
sources are archived beside it as `17-14-data-computer-source.tar.gz`). Three pictures of the running page at
1,280 × 800 with those three cuts: DATA before, DATA after, and DATA after scrolled to its end.

## Founder's look: Pending

**The picture:** `.planning/phases/17-bottom-contours/pictures/17-14-phones.png` (its sources are archived beside it as
`17-14-pictures-source.tar.gz`). Every picture on it is the running page on a 6'2" Shortboard with a Deep Single
Concave, a Spiral Vee and channels. Pictures 1 to 7 are an upright iPhone, two of them with the touch areas outlined;
8 to 12 an upright Pixel; 13 and 14 BOTTOM on a computer before and after; 15 to 18 both phones held sideways.

What to look for:

1. Upright: the drawing pinned on top, NOSE · CENTER · TAIL under it, one section's controls beneath; TAIL with
   channels scrolls by itself.
2. GUIDE and DATA scroll inside the pinned card; the page itself never moves.
3. Sideways: the drawings keep about 360 dots of height and the column scrolls (UI-SPEC open item 2 — your real phones
   decide; the gate checks them again).

For your call while you look:

- **Is 360 dots right, sideways?** It is the design page's open question, and only your own iPhone and Pixel can
  answer it.
- **Should a tap on NOSE, CENTER or TAIL start that section at its top?** Today it leaves the controls scrolled where
  they were, as RAILS does (item 17).
- **The controls box on the shortest upright iPhone is 177 dots tall** under the pinned drawing — about one menu and
  two sliders at a time. That is the two-thirds pin every screen uses.
- **The Height buttons stand further apart on a touch screen, and the word Height is gone sideways** (items 9 and 10).
- **FINS' two buttons take a 42-dot touch, not 44** (item 14) — leave, or make them a true 44.
- **DATA on a computer can squeeze its tables the same way a phone's did** (item 16) — leave, or fix it there too.
- **Six channels at their starting numbers trip the rail warning on the Shortboard** (Deferred Issues) — is the
  warning right, or are the starting numbers too deep near the tail?

Type "approved", or describe what should change.

## Self-Check: PASSED
