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
affects:
  - components/bottom/bottom-editor.tsx (the phone's section row, the pinned card height, the short-screen rules)
  - components/bottom/bottom-controls.tsx (only the picked section's controls are drawn on an upright phone)
  - components/bottom/bottom-section.tsx (the Height buttons' touch area, the word Height on a short screen, the height label clear of the drawing on a phone)
  - components/bottom/bottom-data.tsx (the two tables keep their rows on a phone)
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
    - e2e/bottom-saving.spec.ts
    - e2e/bottom-wings.spec.ts
    - e2e/bottom-metric.spec.ts
    - e2e/fins-contour.spec.ts
decisions:
  - "On an upright phone BOTTOM shows one section's controls at a time, picked on a NOSE · CENTER · TAIL row under the tabs — RAILS' row, copied. The page opens on CENTER. The section tapped is also the live one, so the rail marks on the drawing follow it; the channels belong to TAIL."
  - "The row is on VIEWER only. On DATA and GUIDE all three sections' controls show beneath, because there is no row there to pick with."
  - "A tap on NOSE, CENTER or TAIL leaves the controls box scrolled where it was, exactly as RAILS does. Making it jump to the top was tried and taken back out: it is a design choice, and it is raised for the founder below."
  - "On a phone held sideways the two drawings keep 360 dots between them and the drawing's column scrolls; DATA and GUIDE grow to their full height there and scroll with the column, so nothing scrolls inside something that scrolls."
  - "DATA's two tables keep their full height on a phone, upright or sideways, and the card scrolls instead. On a computer DATA is drawn exactly as it was — the same squeeze can happen there with a full bottom, and that is raised for the founder rather than changed, because a mouse must see nothing change in this plan."
  - "The Height buttons (×1 ×2 ×4 ×8) each take a touch area 44 dots square on a touch screen, written for them: the app's shared touch box adds 5 dots all round, which makes 44 of a 34-dot icon and only 27 of a button this small. They stand 12 dots apart on a touch screen (4 on a computer) so the four areas sit side by side."
  - "The word Height is not drawn on a short screen, as it already is not on an upright phone: the four buttons need the room. A screen reader still hears the group's name."
  - "FINS' two icon buttons were left exactly as they are. Their touch areas measure 42 dots, not 44; the test pins what is true and proves a tap on each button's own centre presses that button and only that one."
  - "No file under lib/, no database file and no package changed."
metrics:
  duration: about 2 h 15 min on the clock (2026-11-10 03:49 to about 06:05 UTC) for Tasks 1 and 2 and the picture
  completed: 2026-11-10 UTC (Tasks 1 and 2; Task 3 is the founder's look)
actuals:
  tokens: 21800
  tasks: 2
  commits: 4
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
- **A computer sees nothing change.** Every rule added is behind the width line, the touch rule or the short-screen
  rule. The six reference pictures of the computer's screens did not move, and six pictures of BOTTOM on a computer
  taken before and after the plan are the same files byte for byte.
- **Nothing in the database changed.** No migration, nothing to run on production.

## Tasks

| Task | What | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | BOTTOM on an upright phone: the drawing pinned on top, NOSE · CENTER · TAIL, one section's controls beneath | `94160477` | `components/bottom/bottom-editor.tsx`, `bottom-controls.tsx`, `bottom-section.tsx`, `bottom-data.tsx`, `components/design/board-lock-scope.test.ts`, `e2e/phone-bottom.spec.ts`, `e2e/helpers/bottom.ts`, five older browser tests |
| 2 | BOTTOM held sideways keeps its drawings readable and scrolls the column; every control finger-sized on a touch screen | `60cf75d3` | `components/bottom/bottom-editor.tsx`, `bottom-section.tsx`, `e2e/phone-bottom.spec.ts`, `e2e/phone-chrome.spec.ts`, `e2e/touch-sizing.spec.ts` |
| 3 | The founder's look (checkpoint) — the picture and this summary | `81366d50`, and this summary's own commit | `pictures/17-14-phones.png`, `pictures/17-14-pictures-source.tar.gz`, this summary, `deferred-items.md` |

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
line, and yours to call.

**17. After scrolling down TAIL's controls, a tap on CENTER leaves the box scrolled where it was.** That is how RAILS
behaves too. Jumping to the top was tried: the box then shows the panel's heading and INPUTS rather than the section's
own menu, so it is not plainly better, and it was taken back out. Raised below.

**18. A computer test from 17-10 fails, and did before this plan.** See Deferred Issues.

## Deferred Issues

**`e2e/bottom-viewer.spec.ts` line 369, on the computer, expects three notes under DATA and finds four.** With a Deep
Single and six channels at their starting numbers on the Shortboard, the app's own warning now shows: "The channels
leave the rail under 1/4" near the tail: the rail is thinner there than the floor. Lower the Depth, or move the cut
away from the tip." It fails alone every time, and fails the same way with every change this plan made to the app
taken back out, so it is not this plan's. Either the test is stale or six channels' starting numbers should not trip
the warning; that is a question about the bottom's starting numbers, not about phones. Written up in
`.planning/phases/17-bottom-contours/deferred-items.md`.

## Known Stubs

None.

## Threat Flags

None. The plan changes how BOTTOM is laid out and how big its touch areas are; nothing new is saved, read or sent. The
plan's one threat is covered as far as a test can: a control or drawing out of reach on a sideways phone (T-17-12) —
the 360-dot floor and the column's own scroll are proven at four sideways sizes. The real phones are the founder's.

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
