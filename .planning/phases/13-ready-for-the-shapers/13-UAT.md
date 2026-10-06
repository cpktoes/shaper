---
status: testing
phase: 13-ready-for-the-shapers
source: [13-SPEC.md item 13]
started: 2026-09-30T21:31:08.000Z
updated: 2026-10-06T14:40:00.000Z
---

## Current Test

number: 4
name: The whole trip on the founder's iPhone
expected: |
  Every step of "The walk" below passes on the founder's iPhone on the live site, including page 2 of a real order-form print made from the iPhone (item 8b's last open check)
awaiting: user response

## Tests

### 1. Google sign-in is open to everyone, not only test users
expected: In Google Cloud's Google Auth Platform → Audience, the project that holds Shaper Assistant's Google sign-in shows Publishing status "In production" — if it says "Testing", press Publish app (the app asks Google only for a name and an email address, so Google needs no review)
result: passed 2026-10-03 (founder: pass)
who: the founder, at a computer, about 5 minutes — see "Your dashboard checks" below

### 2. Room for a crowd in Clerk, Neon and Vercel
expected: Clerk shows the free plan's 50,000 monthly users with only a handful used; Neon's Billing page shows this month well under 100 compute hours and 0.5 GB; Vercel's Usage page shows every meter well under its Hobby limit, including 4 hours of Active CPU and 50,000 analytics events
result: passed 2026-10-03 (founder: pass — one figure reported, 0.25 GB, read here as Neon's storage)
note: Neon raised the Free plan's storage from 0.5 GB to 1 GB per project on 2026-10-02 (its changelog; existing projects get it automatically), so 0.25 GB is a quarter of the allowance, not half. At the limit nothing is deleted; anything that adds data fails until space is freed or the plan is upgraded. Measured the same day on the development copy: the whole database is 31 MB, the app's own tables about 1 MB, the blank catalogue about 0.3 MB and a saved board about 2.5 KB, so the figure is not boards and a room of shapers adds a few megabytes. Neon's own breakdown of the 0.25 GB (its Branches page) was not read.
who: the founder, at a computer, about 10 minutes — see "Your dashboard checks" below

### 3. A brand-new shaper signs up with an email address on a phone
expected: An email address that has never used the app signs up with email and a password on a phone, Clerk's six-digit code arrives within a minute (note whether it landed in the inbox or in spam), and the new account lands signed in and saves a board
result: passed 2026-10-03 (founder: pass)
note: Where the six-digit code landed (inbox or spam) was not reported.
who: the founder, on either phone, with a spare email address — afterwards the account can delete itself from Manage account, or be kept

### 4. The whole trip on the founder's iPhone
expected: Every step of "The walk" below passes on the founder's iPhone on the live site, including page 2 of a real order-form print made from the iPhone (item 8b's last open check)
result: [pending]

### 5. The whole trip on a real Android phone
expected: Every step of "The walk" below passes on a real Android phone on the live site — borrowed if need be, because shapers in the room will be carrying them
result: [pending]

### 6. The whole trip on the Oct 10 laptop
expected: Every step of "The walk" below passes on the laptop and browser that will be used on Oct 10, with a real print of the order form, and on the projector or TV too if one will be used
result: [pending]

### 7. Someone else signs up with Google
expected: A friend, on their own phone, taps Continue with Google on the live site, gets past Google's screen with no "access blocked" message, lands signed in and saves a board — and notes the name Google's screen shows (Shaper Assistant, or only the web address)
result: passed 2026-10-03 (founder: pass)
note: The name Google's screen showed (Shaper Assistant, or only the web address) was not reported.
who: a friend (not the founder), about 5 minutes

### 8. The demo account holds a few finished boards
expected: The account shown on Oct 10 holds three or four finished boards, each with a blank picked on ROCKER and fins set on FINS, and each one opens on the laptop and prints its order form
result: [pending]

### 9. The freeze from Wednesday Oct 7 evening
expected: The live site is the build this walk passed (or passed after fixes); its commit is tagged and its Vercel deployment written on the demo-day card with the rollback steps; after that nothing is pushed or changed in Clerk, Google, Neon or Vercel except a fix for something this walk found, on the founder's go
result: [pending]
who: Claude and the founder, Wednesday Oct 7 evening

## Summary

total: 9
passed: 4
issues: 0
pending: 5
skipped: 0
blocked: 0

## How this rehearsal works

Everything a machine can check has been checked (next section). What's left needs real hands: your
iPhone, a real Android phone, the laptop you'll present from, your accounts' dashboards, and one
friend. Every test above is PASS, FAIL or N/A — never "mostly works" — and a FAIL is written down in
your own words, because that sentence is what becomes the fix.

- **When:** walk as soon as it suits, ideally by the weekend (Oct 3–4), so anything it finds can be
  fixed and re-checked before the freeze on **Wednesday Oct 7 evening**. After the freeze only fixes
  for what this walk found go live, each on your go.
- **Reporting:** tell Claude in chat as you go ("iPhone: all pass except step 9 — …"), or tick the
  printed sheet and read it back at the end. Claude records each result here.
- **Never write down anything you typed into a sign-in form** — no email, password or code, and no
  screenshot showing one. What goes on the record is whether it worked.

## Checked by machine before the walk (2026-10-03, the site as it is after Phase 14)

First checked on 2026-09-30. Checked again on 2026-10-03, because the ghost, the Undo and Redo pair, the
thin sideways top bar, the tighter phone screens, three rounds of blank catalogue corrections and Phase 14's
curves and Thinning Starts all went live after the first sheet.

| Check | Result |
|---|---|
| The live site runs the latest code | Vercel's production deployment 6834273836 serves `ddeae0a`: the upright-phone fix (call 6), published on the founder's go on 2026-10-03, on top of Phase 14's second go-live; every newer commit is a planning note, no code |
| Unit tests (the geometry and everything else) | 3,882 passed, 2 skipped (2026-10-03) |
| Lint and types | 0 errors, 0 warnings (2026-10-03) |
| Browser tests — iPhone, Android and desktop profiles, on this exact code | 623 passed, 0 failed (400 skipped by design — each test runs only on the devices it is for), 2026-10-03, with the fix |
| Production-build tests | 13 passed (2026-10-03), including the new check that on a phone no control ends up under the Undo and Redo pair |
| The live site walked by machine, signed out, on an emulated iPhone, Android phone and laptop (2026-10-03, and again after the fix went live) | 16 of 16 steps on each phone and 15 of 15 on the laptop. The four cards read Shortboard 29.6 L · Fish 35.3 L · Mid-length 50.4 L · Longboard 75.3 L. Sign in opens Clerk with Continue with Google, an email field and the Privacy link (on a phone it is in the menu). A preset opens on TEMPLATE; one change brings the Undo and Redo pair and the ghost, and Undo puts the number back. ROCKER shows the preset's own blank; Change Blank opens the list; both Thinning Starts read 12" and "Picked automatically", with two dashed marks on the drawing; a start moved to 13" reads "Automatic would be 12"" and Automatic puts it back; the DATASHEET shows THINNING STARTS. RAILS' View Full Sized opens and closes, and Flat and Domed both press. VOLUME reads its litres; FINS has Import Template Values. The order form shows both pages, and its Planing box ends "Thinning starts from the tip: nose 12", tail 12".". Export Template offers the Overview Sheet, the Full Sized Template and the Paper Saver. Held sideways, a phone's top bar is one 48-dot line with the menu. /contact shows the form and the address; /privacy opens; a wrong address gets "We couldn't find that page". No sideways scroll on any screen. No page errors on Android or the laptop; the iPhone engine logged only aborted-request noise caused by the script's own hard page jumps |
| Metric, read off the live site (2026-10-03) | The cards read Shortboard 188.0 × 47.6 × 5.7 cm · Fish 172.7 × 51.4 × 6.4 cm · Mid-length 218.4 × 54.0 × 7.0 cm · Longboard 274.3 × 57.2 × 7.6 cm, with the same litres. On the Shortboard both Thinning Starts read 30.5 cm; the slider's ends are 16.0 cm and 93.0 cm; from Automatic the arrow keys step to 31.0 and 32.0 and back to 31.0, 30.0 and 29.0; the DATASHEET reads "From tip (cm) 30.5 30.5"; the Planing box ends "Thinning starts from the tip: nose 30.5, tail 30.5 cm." |
| The first board a visitor sees (no preset picked) | VOLUME reads 30.51 L |
| One fault found by this walk, fixed and live the same day | On a phone held upright, the tail's Automatic button on ROCKER sat under the Redo button and could not be tapped — call 6 below. On the live site it now sits 8 dots above the pair on the iPhone size and 9 on the Android size and takes a tap, and with every screen scrolled to its end no control is under the pair |
| Clerk's live settings (read from Clerk's public settings for the site, 2026-10-03) | Public sign-up; Google and email both on; email sign-up confirms with a six-digit code; a password of at least 8 characters, refused if it appears in a known data breach; Cloudflare's bot check in "smart" mode (it only shows a tick box when a sign-up looks automated); a shaper can delete their own account; 10 wrong passwords lock an account for an hour; the app's name shows as "Shaper Assistant" |

## Found while preparing — your calls before the walk

1. **One Wi-Fi, one internet address.** Clerk lets any one internet address start 5 sign-ups or
   sign-ins every 10 seconds, and check 3 emailed codes every 10 seconds. A room on the venue's Wi-Fi
   shares one address, so if everyone signs up at the same moment some will see a "too many
   requests" message — waiting ten seconds and trying again works. Browsing the app signed out is
   not limited; only signing up and signing in. Ways round it on the day: ask people to sign up on
   their phone's own data with Wi-Fi off, or sign people up a few at a time. Continue with Google is
   the quickest — no password, no code.
2. **The 15-character password rule.** A shaper signing up with email must pick a password of at
   least 15 characters, and Clerk refuses any password known from a data breach. On a phone in a
   noisy room that will trip some people. Keep it (the safer setting) and steer people to Continue
   with Google, or lower the minimum in Clerk's dashboard (the password settings under User &
   authentication) before the freeze. Your call. **Decided 2026-09-30: the founder lowered the minimum
   to 8 characters in Clerk** (read back from Clerk's live settings: 8, breached passwords still refused).
3. **The name on Google's screen.** Google shows an app's name and logo on its sign-in screen only
   once the brand is verified; until then it shows only the web address. Test 7 shows which you
   have. If it's only the address and you'd like "Shaper Assistant" there, the Branding page in the
   same Google Auth Platform offers the check, which Google says usually finishes in minutes.
   Optional polish, before the freeze.
4. **The Google client-secret file is still in the project folder** (item 2's last step for you).
   It has never been committed — git ignores it — but it belongs in your password manager, then
   delete it from the folder.
5. **Headroom is not the worry.** For a room of 20–100 people every service sits far inside its free
   allowance: Clerk counts a user against its 50,000 only after they come back a day or more after
   signing up; the app asks Neon for one short request at a time, so there are no open database
   connections to run out of; Vercel's Hobby allowances are in the millions of requests; the Contact
   form can send 100 messages a day. Test 2 confirms nothing is already near a limit this month.
6. **On a phone held upright, the tail's Automatic button can't be tapped** (found by machine on the
   live site, 2026-10-03). On ROCKER, once anything has been changed, the Undo and Redo pair floats at
   the bottom right. Tail Thinning Starts is the last control on the screen, so its Automatic button
   ends up under the Redo button with nothing below it to scroll it clear. Measured on the iPhone and
   Android profiles with every screen's controls scrolled to the end: it is the only control on any of
   the six screens that the pair covers. The browser tests missed it because the test build has one
   extra button under the controls ("Copy preset values") that the live site does not. Until it is
   fixed, Undo takes a tail start back, and turning the phone sideways reaches the button. The fix is
   a small quick task: room at the end of the phone's controls so the last row clears the pair, proved
   on a production build. Your call, ideally before the walk. **Fixed and live 2026-10-03** (fast
   task 144, `b32dcaf`, on the founder's word; published on the founder's go as `ddeae0a`, Vercel
   deployment 6834273836): the phone's controls end with 48 dots of extra room. Checked on the live
   site: the button sits 8 dots above the pair on the iPhone size and 9 on the Android size, and takes a
   tap.

## Your dashboard checks (tests 1 and 2)

| Where | What to look at | What "good" is |
|---|---|---|
| Google Cloud console → the project with Shaper Assistant's Google sign-in → Google Auth Platform → **Audience** | Publishing status | "In production". If "Testing": Publish app — only people on the test-user list could sign in with Google, so test 7 would fail |
| Google Auth Platform → **Branding** | Whether the brand is verified | Optional — see call 3 above |
| Clerk dashboard → Shaper Assistant → **Production** | The plan, and the number of users | Free plan, 50,000 monthly users; today's count is a handful |
| Neon console → the project → **Billing** (usage this month) | Compute hours and storage | Far under 100 compute hours and 1 GB of storage (Neon raised the Free plan's storage from 0.5 GB on 2026-10-02). If compute ran out the database would pause until next month, so anything past half is worth telling Claude |
| Vercel dashboard → **Usage** (your Hobby team) | Every meter, and Web Analytics events | Far under the Hobby limits: 1,000,000 function calls, 4 hours of Active CPU, 100 GB of data, 1,000,000 edge requests, 50,000 analytics events. Past a limit Vercel can pause that feature, so anything past half is worth telling Claude |

## The walk (tests 4, 5 and 6)

The same trip on each device, on **www.shaperassistant.com** — about 25 minutes each. Sign in with
your own account; use Google on one device and email on another.

Brought up to date on 2026-10-06 for the Board Rack (Phase 15), which now holds your saved boards on the
home page: step 12 opens the board from the Board Rack, and step 13 is new — look along the rack and move a
board, written for hold-and-slide on phones, which you kept after trying it on your iPad and an Android
phone. The old steps 13 to 17 are now 14 to 18. Four of the rack's own looks are below, after Phase 14's.

Before that, on 2026-10-03, step 6 was new, and steps 1 to 5, 7, 10, 12, 14 and 17 (then numbered 13 and
16) changed: the card litres, where Sign in is, the ghost and the Undo and Redo pair, Change Blank,
Thinning Starts, the Planing box's new line and the thin sideways top bar. The one fault that update found
(call 6) was fixed and published the same day, so step 6 has no caveat.

| # | Do this | Look for | iPhone | Android | Laptop |
|---|---|---|---|---|---|
| 1 | Text yourself www.shaperassistant.com and tap the link (laptop: type the address) | The preview card with the board picture and "Shaper Assistant — Surfboard Shaping and Design"; the home screen opens | | | |
| 2 | Read the four preset cards | Shortboard 6'2" · 18 3/4" · 2 1/4" · 29.6 L — Fish 5'8" · 20 1/4" · 2 1/2" · 35.3 L — Mid-length 7'2" · 21 1/4" · 2 3/4" · 50.4 L — Longboard 9'0" · 22 1/2" · 3" · 75.3 L | | | |
| 3 | Sign in with your own account (phones: in the menu, top right; laptop: Sign in, in the top bar) | The keyboard never hides the field you're typing in; any code arrives within a minute; you land back signed in | | | |
| 4 | Start Shaping on a preset → TEMPLATE: drag an outline point, then Undo and Redo | The point follows your finger or mouse and the numbers update; the Undo and Redo pair appears at the bottom right and puts it back exactly; a faint line shows the shape before the change, and the ghost button in the drawing's corner hides it | | | |
| 5 | ROCKER: press Change Blank and pick another blank, slide Placement, drag Deck Skin | The list opens, shortest first, with greyed blanks saying where they don't fit; the picked blank, the drawing, the foam-off numbers and the planer passes follow you | | | |
| 6 | ROCKER, at the end of the controls: drag Nose Thinning Starts and Tail Thinning Starts, then press Automatic on each | The label follows the drag (12" to 13"), the hint reads "Automatic would be 12"" and the dashed mark on the drawing moves; Automatic puts it back and the hint reads "Picked automatically"; the DATASHEET tab shows THINNING STARTS | | | |
| 7 | RAILS: View Full Sized, then each tab including INSTRUCTIONS, where you flip Flat / Domed | Nothing cut off; View Full Sized opens and Close shuts it | | | |
| 8 | VOLUME: note the litres; change width or thickness on TEMPLATE; come back | The litres change and read sensibly | | | |
| 9 | FINS: change the fin setup; tick and untick Import Template Values | The fin numbers and the drawing follow | | | |
| 10 | SUMMARY: read the order form, then Print Order Form — print for real or save as a PDF | Both pages complete and legible. Page 2's Planing box ends "Thinning starts from the tip: nose …, tail …." inside its box. On the iPhone, page 2's rail markings and fin numbers each sit inside their own box (item 8b's last check) | | | |
| 11 | SUMMARY: Export Template → Overview Sheet → Download PDF | A PDF of the board opens or downloads | | | |
| 12 | Save (top bar) with a name → tap the wordmark for home → open the board from the Board Rack → rename it, duplicate it, delete the copy | The same board comes back, with its blank and any Thinning Start you set by hand; Cancel is easy to hit on the delete question | | | |
| 13 | Board Rack, at home: look along the rack (laptop: move the mouse along it and rest on a board; phones: swipe along it), then move a board (laptop: drag it, or ⋯ → Move right; phones: hold it until it lifts, then slide it), reload, then open the home page on another device | Each board turns to show its outline as you pass, with its name and numbers under the one that's turned; the board moves where you put it and a small note says "Moved … The rack keeps your order."; after the reload, and on your other device, the order is the same; the unsaved board always stands first | | | |
| 14 | Menu (gear on the laptop) → Metric; look at ROCKER and SUMMARY; switch back to Imperial | Centimetres for sizes, millimetres for marks; Thinning Starts read in centimetres (30.5 cm for 12"); back in Imperial every number is exactly what it was | | | |
| 15 | Menu → Contact, then Privacy. Send one Contact message from one device only | Both pages open; the message reaches support@ in Zoho | | | |
| 16 | Type a wrong address, e.g. www.shaperassistant.com/xyz | "We couldn't find that page", with a way home | | | |
| 17 | Phones: turn sideways on a design screen, then upright again (laptop: N/A) | Sideways the top bar stays one thin line (wordmark, Save, menu) with the six screens in the menu, and the controls sit beside the board; no sideways scrolling; upright stacks them again | | | N/A |
| 18 | Sign out, then sign back in | Your boards are all still there | | | |

**Laptop extras:** use the browser you'll present from; if a projector or TV will be used, walk at
least steps 2–10 on it and pick the theme that reads best from the back of the room; print one order
form on a real printer.

## Phase 14's five looks (same sitting)

These belong to Phase 14's own sign-off (`14-VERIFICATION.md`), not to the nine tests above. They need
the same devices, so do them in the same sitting and report them with the walk; they are recorded in
Phase 14's check.

| Look | On | Do this | What good is |
|---|---|---|---|
| A | A phone, then the laptop | In Metric on ROCKER, drag each Thinning Starts slider to both ends. On the laptop, click a slider that is on Automatic and press the arrow keys | On the Shortboard the ends read 16.0 cm and 93.0 cm and nothing jumps. A start set at 6" in Imperial reads 15.2 cm in Metric with the thumb at the left end. From 30.5 cm the right arrow steps to 31.0 and 32.0 and the left arrow back, with no jump on the first press. Nothing is rewritten by looking |
| B | Paper | Print page 2 of the order form with a blank picked: on Letter, on A4 if you have it, and from a phone | The Planing box ends "Thinning starts from the tip: nose 12", tail 12"." (in Metric, "nose 30.5, tail 30.5 cm."), on two lines at most, inside its box |
| C | Both phones | With Change Blank's list open, drag a Thinning Starts slider, slide Placement end to end and change a tip setting | The list and the fit flag keep up; no stutter or freeze |
| D | The laptop | In each of the four themes, look at ROCKER's drawing with a blank picked and both starts at 12" | The faint dashed mark can be picked out where it meets the 12" line. At go-live 2 you found it hard to pick out on a computer and asked for no change; confirm that still stands for the showing |
| E | The laptop | In a private window open www.shaperassistant.com/design/volume, then ROCKER: the first board a visitor sees. Then the thin-board corner you saw at go-live 2 | VOLUME reads 30.51 L and the curves read the way a board flows. The thin-board corner (a 1" to 1 1/4" center on the Arctic Foam 7'9" SBF, its tail reading below the center) is still what you want to leave for the showing |

## Phase 15's looks (same sitting)

These belong to Phase 15's own sign-off (the Board Rack), not to the nine tests above. They need the same
devices, so do them in the same sitting as the walk and report them with it; they are recorded in Phase 15's
check.

| Look | On | Do this | What good is |
|---|---|---|---|
| A | A phone held sideways (the iPhone, then the Android) | Give a board a long name — 20 letters or more, e.g. "Ocean Beach Winter Step-Up" — and look along the rack | The long name is cut with "…" and what's left still reads; its numbers stay whole and nothing runs into the next board |
| B | The iPhone | Move a board, then look at the bottom of the screen while the small note shows | The note "Moved … The rack keeps your order." reads in full and doesn't cover Open This Board under the turned board |
| C | The iPhone, with VoiceOver on (Settings → Accessibility → VoiceOver) | Swipe through two boards on the rack | Each board's full name is read out, even a long one that is cut on screen, and the way its numbers are spoken (the inch marks) is tolerable to listen to |
| D | The laptop, in Chrome | Click a board on the rack, then hold Alt and press ← | The board moves one place left and the browser never goes Back to the previous page |

## The demo account (test 8)

Suggestion, your call: a separate demo account rather than your own, so nothing typed during the demo
touches your real boards — for example signed up on support@shaperassistant.com, whose codes land in
Zoho. Save three or four finished boards on it, one per family, each with a blank picked on ROCKER
(so the order form's Planing table has numbers) and fins set, named the way a shaper would name them.
Open each one on the laptop and print its order form. Printing a few in advance also makes handouts
for the room.

## The freeze and the demo-day card (test 9)

On **Wednesday Oct 7 evening**, with the walk passed:

- Claude tags the live commit and writes down the Vercel deployment it runs on; the tag goes to
  GitHub on your go. From then on nothing is pushed, and nothing is changed in Clerk, Google, Neon or
  Vercel, except a fix for something this walk found — each on your go.
- **If the site misbehaves on the day:** Vercel → the shaper project → the Production Deployment →
  Instant Rollback → Continue → Confirm Rollback. On the free Hobby plan that goes back one deployment only — which is
  why at most one fix should follow the freeze. A rollback also stops new pushes going live until
  "Undo Rollback" is pressed, so tell Claude when you've used it.
- The card to carry: the address, the demo account's name (never its password), the support@ address
  for shapers, your phone's hotspot as the backup connection, and the rollback steps above.

## Gaps
