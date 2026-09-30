---
status: testing
phase: 13-ready-for-the-shapers
source: [13-SPEC.md item 13]
started: 2026-09-30T21:31:08.000Z
updated: 2026-09-30T21:44:32.000Z
---

## Current Test

number: 1
name: Google sign-in is open to everyone, not only test users
expected: |
  In Google Cloud's Google Auth Platform → Audience, Publishing status reads "In production"
awaiting: user response

## Tests

### 1. Google sign-in is open to everyone, not only test users
expected: In Google Cloud's Google Auth Platform → Audience, the project that holds Shaper Assistant's Google sign-in shows Publishing status "In production" — if it says "Testing", press Publish app (the app asks Google only for a name and an email address, so Google needs no review)
result: [pending]
who: the founder, at a computer, about 5 minutes — see "Your dashboard checks" below

### 2. Room for a crowd in Clerk, Neon and Vercel
expected: Clerk shows the free plan's 50,000 monthly users with only a handful used; Neon's Billing page shows this month well under 100 compute hours and 0.5 GB; Vercel's Usage page shows every meter well under its Hobby limit, including 4 hours of Active CPU and 50,000 analytics events
result: [pending]
who: the founder, at a computer, about 10 minutes — see "Your dashboard checks" below

### 3. A brand-new shaper signs up with an email address on a phone
expected: An email address that has never used the app signs up with email and a password on a phone, Clerk's six-digit code arrives within a minute (note whether it landed in the inbox or in spam), and the new account lands signed in and saves a board
result: [pending]
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
result: [pending]
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
passed: 0
issues: 0
pending: 9
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

## Checked by machine before the walk (2026-09-30)

| Check | Result |
|---|---|
| The live site runs the latest code | Vercel production deployment 6770367982 serves `b67a5cf`; the only newer commit (`c415c90`) is a planning note, no code |
| Unit tests (the geometry and everything else) | 3,588 passed, 2 skipped |
| Lint | 0 errors, 0 warnings |
| Browser tests — iPhone, Android and desktop profiles, on this exact code | 496 passed, 0 failed (260 skipped by design — each test runs only on the devices it is for); 14 minutes |
| Production-build tests | 9 passed |
| The live site walked by machine, signed out, on an emulated iPhone, Android and laptop | 11 of 11 steps on each: the four cards read Shortboard 29.4 L · Fish 35.0 L · Mid-length 50.3 L · Longboard 75.3 L; Sign in opens Clerk offering Continue with Google; all six screens open in about 1.5 s each with the blank list loaded and no sideways scroll; the order form and Print Order Form show; /contact shows the form and the address; /privacy opens; a wrong address gets "We couldn't find that page". No page errors on Android or the laptop; the iPhone engine logged only aborted-request noise caused by the script's own hard page jumps, nothing a step depended on |
| Clerk's live settings (read from Clerk's public settings for the site) | Public sign-up; Google and email both on; email sign-up confirms with a six-digit code; a password of at least 15 characters, refused if it appears in a known data breach; Cloudflare's bot check in "smart" mode (it only shows a tick box when a sign-up looks automated); a shaper can delete their own account; 10 wrong passwords lock an account for an hour; the app's name shows as "Shaper Assistant" |

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
   authentication) before the freeze. Your call.
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

## Your dashboard checks (tests 1 and 2)

| Where | What to look at | What "good" is |
|---|---|---|
| Google Cloud console → the project with Shaper Assistant's Google sign-in → Google Auth Platform → **Audience** | Publishing status | "In production". If "Testing": Publish app — only people on the test-user list could sign in with Google, so test 7 would fail |
| Google Auth Platform → **Branding** | Whether the brand is verified | Optional — see call 3 above |
| Clerk dashboard → Shaper Assistant → **Production** | The plan, and the number of users | Free plan, 50,000 monthly users; today's count is a handful |
| Neon console → the project → **Billing** (usage this month) | Compute hours and storage | Far under 100 compute hours and 0.5 GB. If compute ran out the database would pause until next month, so anything past half is worth telling Claude |
| Vercel dashboard → **Usage** (your Hobby team) | Every meter, and Web Analytics events | Far under the Hobby limits: 1,000,000 function calls, 4 hours of Active CPU, 100 GB of data, 1,000,000 edge requests, 50,000 analytics events. Past a limit Vercel can pause that feature, so anything past half is worth telling Claude |

## The walk (tests 4, 5 and 6)

The same trip on each device, on **www.shaperassistant.com** — about 20–25 minutes each. Sign in with
your own account; use Google on one device and email on another.

| # | Do this | Look for | iPhone | Android | Laptop |
|---|---|---|---|---|---|
| 1 | Text yourself www.shaperassistant.com and tap the link (laptop: type the address) | The preview card with the board picture; the home screen opens | | | |
| 2 | Read the four preset cards | Shortboard 6'2" · 18 3/4" · 2 1/4" · 29.4 L — Fish 5'8" · 20 1/4" · 2 1/2" · 35.0 L — Mid-length 7'2" · 21 1/4" · 2 3/4" · 50.3 L — Longboard 9'0" · 22 1/2" · 3" · 75.3 L | | | |
| 3 | Sign in with your own account | The keyboard never hides the field you're typing in; any code arrives within a minute; you land back signed in | | | |
| 4 | Start Shaping on a preset → TEMPLATE: drag an outline point, then Undo and Redo | The point follows your finger or mouse; the numbers update; Undo and Redo put it back exactly | | | |
| 5 | ROCKER: pick a blank, slide the board along it, drag Deck Skin | The list loads (US Blanks, Arctic Foam, Marko); the fit and the planer passes follow you | | | |
| 6 | RAILS: open each tab including INSTRUCTIONS, flip Flat / Domed, open View Full Sized | Nothing cut off; View Full Sized opens and closes | | | |
| 7 | VOLUME: note the litres; change width or thickness on TEMPLATE; come back | The litres change and read sensibly | | | |
| 8 | FINS: change the fin setup; tick and untick Import Template Values | The fin numbers and the drawing follow | | | |
| 9 | SUMMARY: read the order form, then Print Order Form — print for real or save as a PDF | Both pages complete and legible. On the iPhone, page 2's rail markings and fin numbers each sit inside their own box (item 8b's last check) | | | |
| 10 | SUMMARY: Export Template → Overview Sheet → Download PDF | A PDF of the board opens or downloads | | | |
| 11 | Save (top bar) with a name → tap the wordmark for home → open the board from Your Boards → rename it, duplicate it, delete the copy | The same board comes back; Cancel is easy to hit on the delete question | | | |
| 12 | Menu (gear on the laptop) → Metric; look at SUMMARY; switch back to Imperial | Centimetres for sizes, millimetres for marks; back in Imperial every number is exactly what it was | | | |
| 13 | Menu → Contact, then Privacy. Send one Contact message from one device only | Both pages open; the message reaches support@ in Zoho | | | |
| 14 | Type a wrong address, e.g. www.shaperassistant.com/xyz | "We couldn't find that page", with a way home | | | |
| 15 | Phones: turn sideways on a design screen, then upright again (laptop: N/A) | No sideways scrolling; sideways puts the controls beside the board, upright stacks them again | | | N/A |
| 16 | Sign out, then sign back in | Your boards are all still there | | | |

**Laptop extras:** use the browser you'll present from; if a projector or TV will be used, walk at
least steps 2–9 on it and pick the theme that reads best from the back of the room; print one order
form on a real printer.

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
