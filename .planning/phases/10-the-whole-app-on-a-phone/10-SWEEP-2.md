# Phase 10 Real-Device Sweep — Round Two

**This is the one part of Phase 10 a machine cannot do, and last time it wasn't finished.** The
first sweep found three real defects no emulator could catch, but by its own admission it stopped
after four named questions plus sign-in — the ten-step table itself was never filled in row by
row. Steps 3, 5, 6, 8 and 10 (the account menu; the rack's rename, duplicate and delete; all five
design screens by tapping the bottom bar; saving; and the sideways return home) have never been
checked on a real phone. This is the sweep where that ends.

Three of the fixes those failures produced have now landed. So three of the answers below are
expected to differ from last time — the sheet says exactly which three, in its own section below,
so nobody is comparing against a memory of the first sweep.

## Green build, before you touch a phone

| Check | Result |
|---|---|
| Commit | `c698a09` on `main` — **not yet pushed to `origin/main`.** The four gap-closure fixes (plans 10-05, 10-06, 10-07) are only reachable via a development server on the same Wi-Fi network right now, not the deployed site. See "How to reach the app" below. |
| `npx tsc --noEmit` (types) | Green — no errors |
| `npx vitest run` (unit/geometry tests) | Green — 2461 passed, 2 skipped, 0 failed |
| `npm run build` | Green (run on `main` at this exact commit — Turbopack cannot resolve `next` from inside a git worktree, so this one was run outside it) |
| `npm run test:e2e` (full browser suite — both phones and desktop) | Green — 216 passed, 198 skipped (per-project scoping), 0 failed (run on `main` at this exact commit) |

If something breaks on your phone below, it's a real, new finding — not a bug the tests would have
caught first.

## What changed under your thumb since the first sweep

Nothing about how the app calculates anything moved. What changed is how the app fits a hand,
specifically the three things the first sweep found wrong:

- **A phone held sideways now stays a phone.** The app used to decide "this is a phone" purely by
  how wide the screen was, and a real iPhone turned sideways (about 844 dots) is wider than that
  cutoff — so turning it sideways used to switch it to the desktop look: the six screen tabs
  jumped from the bottom of the screen to a row across the top. That's fixed. Now a phone held
  sideways keeps the row of six tabs at the bottom, same as it does upright.
- **A board's picture is now sized to the screen it's actually on**, not a fixed number of dots.
  Whether you're looking at the rack of presets or your own saved boards, the picture now caps at
  about three-quarters of what you can see on screen — enough that one whole board plus the top of
  the next is visible, so it's obvious the list scrolls. This holds whichever way you're holding
  the phone.
- **The account picture (the little round avatar once you're signed in) now claims a genuine
  thumb's worth of tappable space around it**, in a way that can't be quietly overridden by the
  sign-in service's own styling underneath it.
- **The "Hide Toolbar" tip can now actually show up sideways.** It was built to tell you how to get
  rid of the browser's own toolbar for extra screen height — exactly what you'd want when the
  screen is already short, i.e. sideways — but it was gated behind the same "this is a phone" rule
  above, so it used to disappear at the exact moment it was most wanted. That's fixed too. The tip
  itself hasn't changed a single word.

## Three answers are expected to be different this time

The first sweep answered these three the same way, and this sweep should not repeat those answers
— if it does, the fix didn't land and that's itself the finding.

| What | Last time | Expected now |
|---|---|---|
| Where the six tabs sit when a design screen is turned sideways | "iPhone switches to top nav bar when horizontal" (fail of the app's own assumption) | The row of six tabs should stay at the bottom of the screen — on **both** the iPhone and the Android phone |
| How tall a board card is | "Two is fine but they are way too tall. Even vertical, the boards are bigger than the screen." | A card should be about three-quarters of what you can actually see on the screen — you should be able to see one whole board plus the top edge of the next one, upright or sideways |
| Whether the "Hide Toolbar" tip appears sideways | It couldn't — it was hidden by the same rule that misjudged sideways phones as desktops | It should now appear when a design screen is viewed sideways, worded exactly as it always has |

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
- **No blank cell.** Every one of the ten rows below, on both phones, needs PASS, FAIL, or N/A with
  a reason. An incomplete sheet is exactly what happened last time, and it's not repeated here.

## How to reach the app from your phone

This build hasn't been pushed to the live site yet, so there's only one route this time:

- **A dev server on the same Wi-Fi network.** On the machine, run `npm run dev` from the main
  checkout (not a worktree — Turbopack can't resolve `next` from inside one), then look for the
  line it prints starting `Network:` (something like `http://192.168.1.xx:3000`) — open that
  address on your phone, as long as both devices are on the same Wi-Fi.

Whoever hands you this sheet should confirm the commit running on that dev server is `c698a09` —
the same one the green-build table above is stamped with. If this phase gets pushed and deployed
before you get to this sweep, `https://www.shaperassistant.com` becomes the route instead; ask
whoever hands you the sheet which one applies.

## Before you start: a genuinely fresh account

Sign out fully and, if you can, start step 1 from an account that has never saved a board before —
a truly empty rack. That's the only way to see the home screen's empty state, the very first save,
and a board appearing in the rack for the first time, rather than assuming they work from a rack
that's already populated.

## The ten steps, per phone

Walk all ten steps once on your iPhone, then once on your Android phone — either order, and you
can do them in separate sittings if you need to (see the note at the bottom on picking back up).

Five of the rows below carry a **⚠ NEVER WALKED ON A REAL PHONE BEFORE** flag. Those are the rows
the first sweep admitted it never got to — give them your full attention.

| # | Step | Watch for | iPhone | Android |
|---|------|-----------|--------|---------|
| 1 | Starting from the genuinely empty, freshly signed-out account above: sign up fresh from the home screen (tap "Sign in" in the phone menu, use Clerk's combined sign-in/sign-up form). Confirm the home screen shows no saved boards yet. | iOS — does the keyboard cover the dialog's title or the form's own fields? Android — does the keyboard push the page correctly? Does the home screen genuinely show an empty rack before you save anything? |  |  |
| 2 | Sign out, then sign back in with that same account. | The "Sign in" row and the avatar once you're signed in — are they actually easy to tap, not just visually there? |  |  |
| 3 | **⚠ NEVER WALKED ON A REAL PHONE BEFORE.** Open the account menu (the single menu icon in the top bar) — Units, Theme and the account control all live in one popup. | Does tapping a row actually change units/theme without landing on a neighboring row by mistake? On iOS, does holding a finger on any row pop up the text-selection/copy menu instead? |  |  |
| 4 | Pick a preset from the card grid — tap "Start Shaping." | Is the chosen board still clearly a shortboard/fish/midlength/longboard, or does it look like any of the others at this size? |  |  |
| 5a | **⚠ NEVER WALKED ON A REAL PHONE BEFORE.** Save the board, then rename it from the rack. | Does the iOS keyboard cover the rename field or its Save button? Does the field zoom in when you tap it (it shouldn't)? |  |  |
| 5b | **⚠ NEVER WALKED ON A REAL PHONE BEFORE.** From the rack, duplicate the board you just saved. | Does a genuinely new, separate copy appear in the rack, easy to tell apart from the original? |  |  |
| 5c | **⚠ NEVER WALKED ON A REAL PHONE BEFORE.** From the rack, delete one of the two boards. | Does the delete confirmation make it genuinely easy to hit Cancel instead of Delete Board by accident? |  |  |
| 6 | **⚠ NEVER WALKED ON A REAL PHONE BEFORE.** Work through all five design screens (TEMPLATE, ROCKER, RAILS, VOLUME, FINS) using the bottom tab bar. On RAILS specifically, check the INSTRUCTIONS tab, the Flat/Domed toggle, View Full Sized, and the legend checkboxes. While doing this, turn the phone sideways and back **at least twice**, noting each time whether you land exactly where you were — same tab, same scroll position, nothing left half-switched. | Any sticky highlight left over after a tap; the iOS "select text" popup appearing over a drag point; Safari's toolbar sliding away mid-scroll and the drawing reflowing (or not) when it does; whether turning sideways and back always lands you exactly where you left off, both times. |  |  |
| 7 | On a design screen (any of the five from step 6), turn the phone sideways and look at where the tabs land and whether the "Hide Toolbar" tip shows. | **First: does the screen scroll sideways at all? It shouldn't.** Then: the row of six tabs should now stay at the **bottom** of the screen, sideways, on **both** phones — this is one of the three things expected to be different this time (see table above). Then: with the phone sideways, does the "Hide Toolbar" tip appear? It couldn't before this work — it should now. |  |  |
| 8 | **⚠ NEVER WALKED ON A REAL PHONE BEFORE.** Save the board (Save button in the top bar). Then save a second, different board, and note the order the two boards appear in on the rack. Leave the rack (go to a design screen or sign out and back in) and come back to the home screen — the order should read the same both times. | Does it prompt for a name if the board is still untitled, the way it should? Is the rack's order the same when you come back to it? |  |  |
| 9 | Read the Summary screen and the on-screen order form. | No sideways scroll, every number legible, the order form's write-in fields usable with a real finger. |  |  |
| 10 | **⚠ NEVER WALKED ON A REAL PHONE BEFORE.** Return to the home screen via the wordmark (top bar), then turn the phone sideways there too. | The bottom tab bar is gone again on the home screen, and the boards you worked on show up under "Your Boards." The two-up card grid sideways should still be there (you already confirmed that's the right call last time) — but now the cards themselves should read as about three-quarters of the visible height, not taller than the screen the way they were last time. |  |  |

## Four things worth watching for by name

Each carries what was said last time, so you can see exactly what's being re-tested.

| Question | Last time | iPhone | Android |
|---|---|---|---|
| **The Clerk avatar's real tap size — now a thing to do, not a thing to look at.** Last time this was answered "unsure, looks the same to me," and that's fair — a thumb-sized target can't be judged by eye. This time: tap the very edge of the round picture, about a finger-width out from its rim, five times. If the account menu opens every time, the space is really there; if some taps do nothing, it is not. Write down how many of the five opened the menu (a number out of 5). | "Unsure, looks the same to me." (treated as a fail — a tap target can't be judged by eye) | | |
| The iOS keyboard over a rename / name-a-board field — does it cover the field or its Save button? | "Works great." | | |
| Two board cards side by side, sideways, on the home screen — does it still feel right, now that the cards are meant to be about three-quarters of the screen instead of taller than it? | "Two is fine but they are way too tall. Even vertical, the boards are bigger than the screen." | | |
| Turned sideways on a design screen: does the row of six tabs now stay at the bottom on **both** phones, where last time the iPhone crossed into the desktop look? | "iPhone switches to top nav bar when horizontal." (fail of the app's own assumption) | | |

## Your overall verdict

Fill this in once every row above is answered, on both phones.

**Overall, does the whole trip — sign up on an empty account, sign in, the account menu, picking a
board, renaming/duplicating/deleting from the rack, all five design screens, saving, the summary,
and the sideways return home — work end to end on both phones?** (yes / no, with anything that
needs fixing)

<!-- Shaper fills this in -->

**Anything you want carried into the next round of fixes**, beyond what's already written as a
FAIL above:

<!-- Shaper fills this in -->

---

*If you need to stop partway through, note which phone and which numbered step you reached in a
sentence to whoever picks this back up — a `.continue-here.md` will be written from that so the
next session starts exactly where you left off, not from step 1.*

---

## First walk — what came back (2026-09-11)

One phone, walked by the shaper. **Model not yet confirmed** — see the open question at the end;
until it is, nothing here is filed in the per-phone columns above, because one of these answers
means opposite things on an iPhone and on an Android.

The walk was **stopped after step 10 by decision**, not by running out of steps: two of the
findings below are faults in this very round of fixes, so walking the second phone would have
re-found the same three things. The fixes come first, then both phones are walked clean.

### Answers, in the shaper's own words

| # | Step | Answer (verbatim) |
|---|------|-------------------|
| 1–5 | Sign up, sign in/out, account menu, pick a preset, rename/duplicate/delete | "1 -5 good." |
| 6 | All five design screens by the tab bar; RAILS tabs; turning sideways and back | "rails keeps the controls under all 3 tabs" |
| 7 | Sideways on a design screen | "horizontal is useless, as there are no controls other than the drag. It was honestly better when it was treated as a normal browser rather than a phone. I did not see the hide toolbar tip." |
| 8 | Save two boards, check the rack's order on return | **Not answered** — carry to the re-sweep |
| 9 | Summary screen and on-screen order form | "sumamry screen looks pretty good both V and H" |
| 10 | Home screen sideways | "horizontal the boards on the landing page cards have a 0 height" |
| — | The avatar five-tap count | **Not answered** — carry to the re-sweep |

### What the code says about each finding

Checked against `main` at `c698a09` before anything was written down:

- **Boards at zero height sideways — CONFIRMED, a fault in plan 10-06.** The card's picture is
  capped at three-quarters of the screen *minus a fixed 205px* for the card's own text (name, the
  four numbers, the descriptor, the button). That text does not shrink on a short screen, so
  sideways it eats the whole budget: 88px of board left at a 390px-tall screen, 35px at 320px,
  5px at 280px, and nothing at all at 270px and under. With Safari's toolbar showing, a sideways
  iPhone sits inside that range. There is no floor stopping it at zero.
- **RAILS controls under all three tabs — CONFIRMED, pre-existing.** `rail-band-editor.tsx` hands
  the rail-band controls to the screen shell on every tab, INSTRUCTIONS included. That file's own
  comment already says INSTRUCTIONS "is read-only reference content with no control targeting it"
  — and the controls are rendered under it regardless.
- **The Hide Toolbar tip — CANNOT BE SCORED until the phone is named.** `toolbar-tip.tsx` gates the
  tip on `supports-[-webkit-touch-callout:none]:`, which only iOS and iPadOS satisfy. Not seeing it
  on an Android phone is correct behaviour; not seeing it on an iPhone is a failure of the one thing
  plan 10-05 was actually meant to fix.

### Decisions taken from this walk

**D-10 — A phone on its side goes back to being treated as a normal browser.** Plan 10-05's switch
(*narrower than 820px OR a touch screen shorter than 500px*) is to be reverted to width alone. The
shaper's verdict, in their words: *"horizontal is useless, as there are no controls other than the
drag. It was honestly better when it was treated as a normal browser rather than a phone."*

The reasoning that supports it: the desktop layout needs 820px because that is 340px of controls
beside a 480px drawing. A phone on its side is about 844–863px — it fits, and that is a better use
of a short wide screen than stacking a half-height drawing over controls that then have almost no
room left. Re-reading the three symptoms 10-05 was built on, with a real phone in hand:

- the giant board card sideways was a **card** fault (now confirmed above), not a layout-switch fault;
- the tabs moving to the top bar sideways was the layout **correctly adapting**, not a fault;
- the Hide Toolbar tip was the one symptom genuinely about the switch — and it **still did not
  appear** after the switch changed, so 10-05 did not deliver even that.

**D-11 — Fix before re-sweeping.** The second phone is not walked on this build.

### Carried into the next round of fixes

1. Revert the layout switch to width-only (D-10), and make CLAUDE.md's Layout section say so.
2. Give the board card's height cap a floor so it can never resolve to nothing, whatever the screen.
3. Stop showing the rail-band controls under the RAILS INSTRUCTIONS tab.
4. Settle the Hide Toolbar tip once the phone is named — and, if it was an iPhone, find out why it
   did not appear.

### Open question before this sheet can be filed

**Which phone was this walk done on?** Every row above is recorded against one unnamed device, and
finding 3 flips between "correct" and "failed" depending on the answer.
