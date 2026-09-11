# Phase 10 Real-Device Sweep

**This is the one part of Phase 10 a machine cannot do.** Everything up to here — sizes, colors,
whether a route works, whether the summary reads clean — has already been proven by an automated
test on an emulated phone screen. What's left is a shaper holding a real phone, feeling for
things no emulator can fake: a real thumb, a real keyboard sliding up, Safari's toolbar coming and
going, a genuinely signed-in account.

## Green build, before you touch a phone

The full automated suite ran clean against the commit below before this sheet was handed to you —
so if something breaks on your phone, it's a real, new finding, not a bug the tests would have
caught first.

| Check | Result |
|---|---|
| Commit | `40c17ba` (on `main`, everything below merged) |
| `npx tsc --noEmit` (types) | Green — no errors |
| `npx vitest run` (unit/geometry tests) | Green — 2456 passed, 2 skipped, 0 failed |
| `npm run build` | Green |
| `npm run test:e2e` (full browser suite — both phones and desktop) | Green — 207 passed, 183 skipped (per-project scoping), 0 failed |

## What changed under your thumb

Nothing about how the app calculates anything moved. What changed is how the app *fits a hand*:

- The six screen tabs (TEMPLATE, ROCKER, RAILS, VOLUME, FINS, SUMMARY) at the bottom of the
  screen now stay off the home screen until you've actually picked a board — they used to show
  up there too, crowding out the board cards.
- A board card — both the four ready-made presets and anything you've saved — is about 550
  pixels tall now instead of 760, so more fits on the screen at once, but the board drawing
  itself is still about 357 pixels long, same as it always read.
- The X that closes a dialog (rename a board, name a new one, sign in) and the box you type a
  board's name into are both finger-sized now — they used to be built for a mouse pointer.
- "Sign in" in the account menu, the little avatar that shows once you're signed in, and the X
  that dismisses the sign-in banner are all finger-sized now too.
- The row across the top of a wide screen (wordmark, the six screen names, settings, Save, your
  account) now sits closer to the edges and packs a little tighter on a narrower window. Growing
  the account control had pushed that row off the side of a phone held sideways, which made every
  design screen scroll sideways — step 7 below is where you check that it no longer does.

None of that is a guess anymore for a mouse and an emulated phone screen — it's proven by an
automated test. What isn't proven yet is whether it actually *feels* right in your hand, and
whether the parts only a real, signed-in session can reach (the rack, a real Clerk avatar, a real
iOS keyboard) hold up. That's this sheet.

## How to reach the app from your phone

A phone can't open `localhost` — it isn't the same machine. Use whichever of these applies when
you're handed this sheet:

- **The live site**, if this phase has already been pushed and deployed:
  `https://www.shaperassistant.com`
- **A dev server on the same Wi-Fi network**, otherwise: run `npm run dev` on the machine, then
  look for the line it prints starting `Network:` (something like `http://192.168.1.xx:3000`) —
  open that address on your phone, as long as both devices are on the same Wi-Fi.

## Recording rules

- **Every row is PASS, FAIL, or N/A** — never anything softer.
  - **PASS** — it worked, on the actual device, in your hand.
  - **FAIL** — write down what broke, in your own words. A screenshot or a quick screen recording
    helps but isn't required.
  - **N/A** — write one line for why (e.g., "no Android phone handy this session").
- **No row is filled from an emulator, a simulator, or memory of how it looked in a screenshot.**
  If you didn't hold the actual phone for that step, it isn't a PASS yet.
- **A FAIL is never softened to "mostly works."** Write down exactly what broke — that sentence
  is what becomes a fix afterward.
- **Never write down anything you typed into a sign-in form.** No email address, no password, no
  verification code, and no screenshot that shows one filled in. What goes in this sheet is
  whether it worked, never what you typed to make it work.

## The ten steps, per phone

Walk all ten steps once on your iPhone, then once on your Android phone — either order, and you
can do them in separate sittings if you need to (see the note at the bottom on picking back up).

| # | Step | Watch for | iPhone | Android |
|---|------|-----------|--------|---------|
| 1 | Sign out fully, then sign up fresh from the home screen (tap "Sign in" in the phone menu, use Clerk's combined sign-in/sign-up form). | iOS — does the keyboard cover the dialog's title or the form's own fields? Android — does the keyboard push the page correctly? | | |
| 2 | Sign out, then sign back in with that same account. | The "Sign in" row and the avatar once you're signed in — are they actually easy to tap, not just visually there? | | |
| 3 | Open the account menu (the single menu icon in the top bar) — Units, Theme and the account control all live in one popup. | Does tapping a row actually change units/theme without landing on a neighboring row by mistake? On iOS, does holding a finger on any row pop up the text-selection/copy menu instead? | | |
| 4 | Pick a preset from the (now shorter) card grid — tap "Start Shaping." | Is the chosen board still clearly a shortboard/fish/midlength/longboard, or does it look like any of the others at this size? | | |
| 5 | Save a board, then rename it, duplicate it, and delete one from the rack. | Does the iOS keyboard cover the rename/name field? Does the field zoom in when you tap it (it shouldn't)? Does the delete confirm make it genuinely easy to hit Cancel instead of Delete Board by accident? | | |
| 6 | Work through all five design screens (TEMPLATE, ROCKER, RAILS, VOLUME, FINS) using the bottom tab bar. On RAILS specifically, check the INSTRUCTIONS tab, the Flat/Domed toggle, View Full Sized, and the legend checkboxes. | Any sticky highlight left over after a tap; the iOS "select text" popup appearing over a drag point; Safari's toolbar sliding away mid-scroll and the drawing reflowing (or not) when it does. | | |
| 7 | Turn the phone sideways at least once during step 6, on a design screen (not the home screen — that's step 10). | **First: does the screen scroll sideways at all? It shouldn't — that is the bug fixed for this sweep, and an emulator is the only thing that has checked it so far.** Then: where does the six-tab bar land? An iPhone turned sideways (about 750px wide) should stay in the phone layout — the bottom tab bar. An Android turned sideways (about 863px wide) should switch to the desktop layout — the top nav row, no bottom bar. Does that split actually feel right in hand, or would you rather both phones behaved the same regardless of width? | | |
| 8 | Save the board (Save button in the top bar). | Does it prompt for a name if the board is still untitled, the way it should? | | |
| 9 | Read the Summary screen and the on-screen order form. | No sideways scroll, every number legible, the order form's write-in fields usable with a real finger. | | |
| 10 | Return to the home screen via the wordmark (top bar), then turn the phone sideways there too. | The bottom tab bar is gone again on the home screen, and the board you just worked on shows up under "Your Boards." On this app today, a sideways phone at the home screen shows two board cards side by side (not one column) — that's the shipped behavior, not a bug. Does two side by side actually read well at that width, or would one column, full width, be easier to look at? | | |

## Four things worth watching for by name

These are the specific questions this phase couldn't answer without you — a real signed-in
session, a real keyboard, and a real hand holding the phone sideways.

| Question | iPhone | Android |
|---|---|---|
| **D-05 — the Clerk avatar's real tap size.** Once signed in, how big does the account avatar's tap area actually measure (roughly, in your own estimate — "clearly bigger than before," "about the same," etc.)? And separately: did the padding actually take effect, or did it look like Clerk's own styling won and the avatar looks unchanged (in which case the coded fallback — the same class with the "important" flag — is needed)? | | |
| **D-03 — the iOS keyboard over a rename/name dialog.** When you tapped into the rename field or the name-a-new-board field, did the keyboard cover the field or the Save button? | | |
| **D-08 — two boards side by side, sideways.** With the phone turned sideways on the home screen, does the two-up card grid still feel right, or does it feel cramped compared to browsing upright? | | |
| **Phase 9's deferred landscape tab question.** Turned sideways on a design screen: does your iPhone (~750px wide) stay in the phone shell (bottom tab bar), and does your Android (~863px wide) cross into the desktop shell (top nav)? Does that split feel right in the hand, or should both phones get the same treatment regardless of width? | | |

## Your overall verdict

Fill this in once every row above is answered, on both phones.

**Overall, does the whole trip — sign in, pick a board, shape it, save it, read the summary —
work end to end on both phones?** (yes / no, with anything that needs fixing)

<!-- Founder fills this in -->

**Anything you want carried into gap closure**, beyond what's already written as a FAIL above:

<!-- Founder fills this in -->

---

*If you need to stop partway through, note which phone and which numbered step you reached in a
sentence to whoever picks this back up — a `.continue-here.md` will be written from that so the
next session starts exactly where you left off, not from step 1.*

## Results — sweep run 2026-09-11

The shaper ran the sweep on a real iPhone and a real Android phone and reported against the four
named questions below, plus sign-in, plus one new request. The ten-step table above was **not**
filled in row by row — what is recorded here is exactly what was reported, and nothing is inferred
from it. Treat any row of the ten-step table not mentioned below as still unwalked.

| Reported | Verdict |
|---|---|
| **Q1 — Clerk avatar's real tap size** | **FAIL (inconclusive, treated as fail).** "Unsure, looks the same to me." D-05 anticipated exactly this: Clerk injects its own stylesheet at runtime, and a plain utility class can lose that cascade. The pre-authorised fallback (the same class with Tailwind's `!` important variant) is now required, and the re-measurement goes back on the next sweep — a shaper cannot measure a tap target by eye, so "looks the same" is not evidence the fix landed. |
| **Q2 — iOS keyboard over a rename / name-a-board field** | **PASS.** "Works great." D-03's open caveat is closed: the keyboard does not cover the field or its Save button. |
| **Q3 — two board cards side by side, sideways** | **PARTIAL — two-up PASSES, card height FAILS.** "Two is fine but they are way too tall. Even vertical, the boards are bigger than the screen." D-08's two-up grid is confirmed as the right call; the card height it was measured against is not. See the finding below. |
| **Q4 — where the tabs land sideways** | **FAIL of the assumption, not of the app.** "iPhone switches to top nav bar when horizontal." The plan assumed a sideways iPhone is 750px wide and stays in the phone layout. It is about 844px, so it crosses the 820px switch into the desktop layout. |
| **Sign-in flow** | **PASS.** "Sign in works great." Covers PHON-07's sign-in leg. Sign-UP and the account menu were not separately reported, so PHON-07 is not yet fully proven. |

### The one finding behind three of those rows

All three failures trace to the same mistake: **the app uses screen WIDTH under 820px as its stand-in
for "this is a phone", and a real iPhone held sideways is about 844px wide.** Measured on this
checkout 2026-09-11:

| | Upright | Sideways |
|---|---|---|
| Board card height | 550px | **757px** |
| Visible area on screen | 608px | **237px** |
| Whole cards that fit | 1.11 | **0.31** |

The card's height cap is switched on by that same under-820px rule, so turning the phone sideways
switches the cap **off** at the exact moment the screen is shortest — the card grows to 757px on a
237px-tall screen. The "Hide Toolbar" tip (already built, and already worded correctly) is gated the
same way, so it disappears sideways, which is precisely when a shaper wants the extra height.

The 750px figure came from the test tool's emulated iPhone, not from hardware, and it is recorded as
fact in CLAUDE.md's own Layout section. **That line is wrong and must be corrected.** No emulator
could have caught this; only the phone did.

### New request from this sweep

> "Can we add a 'hide toolbar' popup shortcut when a phone is held sideways? It takes a few clicks
> that many people don't know about to get rid of the toolbar for maximum screen height."

The tip already exists (`components/design/toolbar-tip.tsx`, built in Phase 9 for the same request)
and already says the right thing. It is hidden sideways only because of the width gate above, so
this is the same fix, not a new feature. Note the web has no API to hide a browser toolbar, and the
one trick that would — a `display: standalone` manifest — silently breaks every Print button on iOS
(`.planning/debug/phone-print-button-does-nothing.md`), so telling the shaper how remains the only
safe answer.

### Decisions taken from this sweep

- **A phone held sideways stays a phone.** The layout switch stops being width-only. Intent honoured
  without the side effect nobody asked for: the new rule is `width < 820px` **OR**
  `(touch pointer AND height < 500px)`. A narrow desktop window keeps today's stacked layout, an iPad
  sideways (1024x768) and a touch laptop (1280x800) keep the desktop layout, and only a genuinely
  short touch screen — a phone on its side — is newly treated as a phone. 500px is already this
  codebase's number for "short screen" (`components/fins/fin-viewer.tsx`).
- **A board card should be about three-quarters of the visible height** — one whole board plus the
  top of the next, so it is obvious the list scrolls. The cap becomes height-relative instead of a
  fixed 387px, which makes it correct in both orientations by construction.
