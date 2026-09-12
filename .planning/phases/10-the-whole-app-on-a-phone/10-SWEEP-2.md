# Phase 10 Real-Device Sweep — Round Two, re-issued a second time (2026-09-12)

**This is the one part of Phase 10 a machine cannot do, and it has now been re-issued twice.** The
very first sweep found three real defects no emulator could catch, but stopped after four named
questions — the ten-step table itself was never filled in row by row. This sheet (round two) was
handed over once already, walked on one phone, and found three more real things: the board
pictures collapsing to nothing sideways, the rail-band controls sitting under all three RAILS tabs,
and the Hide Toolbar tip still not appearing. That walk was deliberately stopped there. Three fixes
for those findings have now landed (plans 10-09, 10-10, 10-11), and a second pair of eyes then
checked that work and found one more real problem in it, which has also now been fixed. So this
sheet is handed over again — same sheet, same ten steps, against a build that has now been
corrected twice since you last picked up a phone.

**This walk restarts from step 1, on both phones.** The fixes involved change what a phone does
sideways on every screen, so nothing you answered on your last walk still stands — not the rows
that passed, and not the rows that failed. Your first walk's answers stay on this sheet as a dated
record of what you found (see "First walk — what came back" near the bottom), never as filled-in
rows above.

## Green build, before you touch a phone

| Check | Result |
|---|---|
| Where to open it | **The live site: https://www.shaperassistant.com** — no dev server, no Wi-Fi requirement, no Network address this time. Open that address directly on each phone. |
| Commit | `7b5ece3` on `main` — deployed to production and confirmed Ready |
| `npx tsc --noEmit` (types) | Green — no errors |
| `npx vitest run` (unit/geometry tests) | Green — 2463 passed, 2 skipped, 0 failed |
| `npm run build` | Green — clean, exit 0 |
| `npm run test:e2e` (full browser suite, all three projects) | Green — 225 passed, 213 skipped (per-project scoping), 0 failed |
| Desktop screenshot baselines | Unchanged — the proof that nothing moved for a mouse |

If something breaks on your phone below, it's a real, new finding — not a bug the tests would have
caught first.

## What changed under your thumb since your last walk

Four things changed since you last had a phone in hand for this sheet. The first three are the
fixes your own walk produced; the fourth is something a second pass over that work found and fixed
before handing it back to you.

- **A phone on its side is a normal browser again — your own call, now built.** You said, holding a
  real phone sideways last time: *"horizontal is useless, as there are no controls other than the
  drag. It was honestly better when it was treated as a normal browser rather than a phone."* That's
  exactly what's built now. Turning a design screen sideways no longer keeps the phone's stacked
  look — it switches to the same layout a laptop or desktop gets: the controls sit beside the board,
  and the six screen tabs move to a row across the top instead of staying at the bottom. This is a
  genuine reversal of what the earlier version of this sheet told you to expect (more on that
  below).
- **A board's picture can no longer disappear.** The picture inside a board card still takes about
  three-quarters of what you can see on screen, same as before — but it now has a floor of 220 dots
  it can never shrink below, no matter how short the screen gets. This directly answers what you
  found last time: *"horizontal the boards on the landing page cards have a 0 height."* On a very
  short screen, hitting that floor can mean a card is taller than the space available, so seeing the
  whole thing takes a small scroll — a real trade this sheet asks about below.
- **The RAILS instructions page drops its sliders when you're upright, but keeps them when you're
  sideways — on purpose.** Standing upright, reading the INSTRUCTIONS tab on RAILS now ends where
  the words end; the rail-band sliders (which don't do anything on that page) are gone from under
  it, one tap away on the VIEWER and DATA tabs instead. This directly answers what you found last
  time: *"rails keeps the controls under all 3 tabs."* But turn the phone sideways on that same
  INSTRUCTIONS tab, and the sliders come back — sitting beside the reading rather than under it,
  because sideways is now the same "normal browser" layout a desktop gets (see the first bullet
  above), and a desktop has always shown the sliders beside the reading. Nobody has judged in the
  hand whether that's the right call for a phone turned sideways specifically. This is genuinely new
  since your last walk — nobody knew about the RAILS page at all until you found it, so it was never
  predicted before now.
- **The "Hide Toolbar" tip no longer cares which way you're holding the phone — only which phone it
  is.** It used to be tied to the same rule that decided whether the app treated your phone as a
  phone at all, which is why it never showed up. Now it's tied directly to two things: is this a
  touch screen, and is it specifically an iPhone's browser. So it should appear on an iPhone
  **both upright and sideways**, and it should never appear on an Android phone, in either
  orientation — that's correct behaviour for Android, not a bug. The tip's own wording hasn't
  changed a single word.

## What should be different this time, and what you said last time

The earlier version of this sheet — the one you walked once already — made three predictions about
what would be different. Two of those three turned out to describe the wrong future, because the
work that followed your walk changed course partway through. Here is each one, honestly, next to
what you actually said:

| What | What you said, last walk | What this sheet predicted next | What's actually true now |
|---|---|---|---|
| Sideways design screen — where the six tabs sit | *"horizontal is useless, as there are no controls other than the drag. It was honestly better when it was treated as a normal browser rather than a phone."* | The row of six tabs should stay at the **bottom** of the screen sideways, same as upright | **The opposite.** Sideways now gets the desktop look: tabs in a row across the **top**, controls beside the board, no bottom bar at all. Your own verdict is why this changed — a phone on its side is being treated as a small desktop, deliberately, per your own words above. |
| Hide Toolbar tip sideways | *"I did not see the hide toolbar tip."* | It should appear sideways because sideways would now correctly count as "this is still a phone" | **The reasoning was replaced, even though the iPhone answer stays the same.** The tip was never really about orientation — it's now tied purely to which phone it is (touch screen + Safari's own iOS-only feature) and has nothing to do with which layout a width picks. So it should appear on an iPhone whichever way you hold it, and never on an Android phone either way — score these as two separate rows below, one per phone, so which way you're holding it never matters to the answer. |
| Board card height | *"Two is fine but they are way too tall. Even vertical, the boards are bigger than the screen."* | About three-quarters of the screen, whole board plus the top of the next one visible | **Unchanged in principle, refined in practice.** Still about three-quarters — but now with a 220-dot floor under it so it can never collapse to nothing. On a very short sideways screen that floor can push a card taller than three-quarters, meaning you may need a small scroll to see one whole card rather than seeing the top of the next one too. This is a real trade, asked about directly below. |
| RAILS instructions sideways | *(not asked — nobody knew about this page until you found it)* | *(no prediction existed)* | New: sideways, the rail-band sliders sit beside the RAILS instructions reading, same as a desktop always has. Nobody has judged whether that's right for a phone. Asked directly below. |

## Recording rules

- **Every row is PASS, FAIL, or N/A** — never anything softer.
  - **PASS** — it worked, on the actual device, in your hand.
  - **FAIL** — write down what broke, in your own words. A screenshot or a quick screen recording
    helps but isn't required.
  - **N/A** — write one line for why (e.g., "no Android phone handy this session").
- **No row is filled from an emulator, a simulator, or memory of how it looked in a screenshot.**
  If you didn't hold the actual phone for that step, it isn't a PASS yet.
- **A FAIL is never softened to "mostly works."** Write down exactly what broke, in your own
  words — that sentence is what becomes a fix afterward.
- **Never write down anything you typed into a sign-in form.** No email address, no password, no
  verification code, and no screenshot that shows one filled in. What goes in this sheet is
  whether it worked, never what you typed to make it work.
- **No blank cell.** Every one of the twelve rows below, on both phones, needs PASS, FAIL, or N/A
  with a reason — that's the one rule the very first sweep broke, and it's not repeated here.

## How to reach the app from your phone

**Just open https://www.shaperassistant.com on each phone.** The app is live in production at
that address — no dev server, no same-Wi-Fi requirement, nothing to start on a laptop first. (The
old `shaper-coral.vercel.app` address still works too — it redirects to the same place.)

## Before you start: a genuinely fresh account

Sign out fully and, if you can, start step 1 from an account that has never saved a board before —
a truly empty rack. That's the only way to see the home screen's empty state, the very first save,
and a board appearing in the rack for the first time, rather than assuming they work from a rack
that's already populated.

## The ten steps, per phone

Walk all ten steps once on your iPhone, then once on your Android phone — from step 1 both times,
whatever you answered on your first walk of this sheet. Either order, and you can do them in
separate sittings if you need to (see the note at the bottom on picking back up).

Three rows carry a flag because they have never once been answered on any real phone, on either
walk of this sheet: step 8, the avatar five-tap question below the table, and every row of the
**entire Android column** — your first walk covered one phone only and stopped before reaching a
second. Give all three your full attention.

| # | Step | Watch for | iPhone | Android |
|---|------|-----------|--------|---------|
| 1 | Starting from the genuinely empty, freshly signed-out account above: sign up fresh from the home screen (tap "Sign in" in the phone menu, use Clerk's combined sign-in/sign-up form). Confirm the home screen shows no saved boards yet. | iOS — does the keyboard cover the dialog's title or the form's own fields? Android — does the keyboard push the page correctly? Does the home screen genuinely show an empty rack before you save anything? |  |  |
| 2 | Sign out, then sign back in with that same account. | The "Sign in" row and the avatar once you're signed in — are they actually easy to tap, not just visually there? |  |  |
| 3 | Open the account menu (the single menu icon in the top bar) — Units, Theme and the account control all live in one popup. | Does tapping a row actually change units/theme without landing on a neighboring row by mistake? On iOS, does holding a finger on any row pop up the text-selection/copy menu instead? |  |  |
| 4 | Pick a preset from the card grid — tap "Start Shaping." | Is the chosen board still clearly a shortboard/fish/midlength/longboard, or does it look like any of the others at this size? |  |  |
| 5a | Save the board, then rename it from the rack. | Does the iOS keyboard cover the rename field or its Save button? Does the field zoom in when you tap it (it shouldn't)? |  |  |
| 5b | From the rack, duplicate the board you just saved. | Does a genuinely new, separate copy appear in the rack, easy to tell apart from the original? |  |  |
| 5c | From the rack, delete one of the two boards. | Does the delete confirmation make it genuinely easy to hit Cancel instead of Delete Board by accident? |  |  |
| 6 | Work through all five design screens (TEMPLATE, ROCKER, RAILS, VOLUME, FINS) using the bottom tab bar. On RAILS specifically, check the INSTRUCTIONS tab **while upright**: the sliders should be gone from under the reading (also check the Flat/Domed toggle, View Full Sized, and the legend checkboxes). While doing this, turn the phone sideways and back **at least twice**, noting each time whether you land exactly where you were — same tab, same scroll position, nothing left half-switched. Do one of those turns in the middle of dragging a control, and note whether the control ends up somewhere sensible rather than half-applied. | Any sticky highlight left over after a tap; the iOS "select text" popup appearing over a drag point; Safari's toolbar sliding away mid-scroll and the drawing reflowing (or not) when it does; whether turning sideways and back always lands you exactly where you left off, both times; on RAILS INSTRUCTIONS **upright**, the sliders should be gone entirely. |  |  |
| 7 | On a design screen (any of the five from step 6), turn the phone sideways. **First: does the screen scroll sideways at all? It shouldn't.** Then look at where the tabs land and whether the "Hide Toolbar" tip shows. | The six screen tabs should now move to a row across the **top** of the screen, with the controls sitting beside the board, and the bottom tab bar should be gone — this is the desktop look, and it's the opposite of what an earlier version of this sheet told you to expect (see the table above; this is your own call, D-10). On **both** phones. Then, with the phone sideways: on the iPhone, does the "Hide Toolbar" tip appear? It should. On the Android phone, it should NOT appear — that's correct, not a fault. |  |  |
| 8 | **⚠ NEVER ANSWERED ON ANY WALK OF THIS SHEET.** Save the board (Save button in the top bar). Then save a second, different board, and note the order the two boards appear in on the rack. Leave the rack (go to a design screen or sign out and back in) and come back to the home screen — the order should read the same both times. | Does it prompt for a name if the board is still untitled, the way it should? Is the rack's order the same when you come back to it? |  |  |
| 9 | Read the Summary screen and the on-screen order form. | No sideways scroll, every number legible, the order form's write-in fields usable with a real finger. |  |  |
| 10 | Return to the home screen via the wordmark (top bar), then turn the phone sideways there too. | The bottom tab bar stays gone on the home screen either way, and the top bar switches to the desktop-style row sideways (same "normal browser" call as step 7). The two-up card grid should still be there. Every board picture must be **visibly there** — not a sliver, and not nothing, the thing that failed last time. If the picture is tall enough now that you need a small scroll to see one whole card, that's the floor doing its job on purpose (see the trade above) — note whether that feels wrong rather than treating it as an automatic fail. |  |  |

## Eight things worth watching for by name

Each carries what was said last time, so you can see exactly what's being re-tested. Three of
these are brand new this round (the RAILS-sideways question, the two Hide Toolbar tip rows split
by phone, and the 220-dot question) — they carry no "last time" quote because there wasn't a last
time to quote.

| Question | Last time | iPhone | Android |
|---|---|---|---|
| **The Clerk avatar's real tap size — a thing to do, not a thing to look at.** ⚠ Never answered on any walk of this sheet. Tap the very edge of the round account picture, about a finger-width out from its rim, five times. If the account menu opens every time, the space is really there; if some taps do nothing, it is not. Write down how many of the five opened the menu (a number out of 5). | Never answered — the walk stopped before reaching it. | | |
| The iOS keyboard over a rename / name-a-board field — does it cover the field or its Save button? | "Works great." | | |
| Two board cards side by side, sideways, on the home screen — with the picture now floored at 220 dots so it can never vanish, does it still feel right, or does the floor create a new problem of its own (e.g. needing to scroll to see one whole card)? | *"horizontal the boards on the landing page cards have a 0 height."* | | |
| Turned sideways on a design screen: the six tabs now move to a row across the top and the bottom bar disappears — the opposite of what the previous version of this sheet predicted. Does that actually feel better in the hand, now that it's built? This is your own decision (D-10) getting its first real check. | *"horizontal is useless, as there are no controls other than the drag. It was honestly better when it was treated as a normal browser rather than a phone."* | | |
| **On RAILS → INSTRUCTIONS, turned sideways, the rail-band controls now sit beside the reading** (they're gone entirely when upright — see step 6). Is that fine, or should they get out of the way sideways too, the same as upright? This is cheap to change either way — say plainly which you'd rather have. | *"rails keeps the controls under all 3 tabs"* (upright; now fixed for upright, per step 6) | | |
| **The Hide Toolbar tip — iPhone.** With the phone held BOTH upright and sideways, does the tip appear (once, dismissible)? | "I did not see the hide toolbar tip" (orientation not recorded) | | (N/A — this question is iPhone-only) |
| **The Hide Toolbar tip — Android.** With the phone held BOTH upright and sideways, does the tip correctly stay absent? | "I did not see the hide toolbar tip" (orientation not recorded) | (N/A — this question is Android-only) | |
| **Is 220 dots of board picture actually enough to tell a board apart?** The founder previously rejected a much smaller picture (26–39 dots wide) as "a sliver." At the new 220-dot floor, on a narrow screen the four presets draw somewhere around 42–63 dots wide apiece by the numbers — but nobody has looked at that in the hand yet. Does a fish still read as a fish at that size, or does it need to be bigger? This is the one number in this round no machine can settle. | Not previously asked — the floor is new this round. | | |

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

**This sheet was re-issued above on 2026-09-12, after three more fixes and one round of code
review landed on top of what this first walk found. None of the answers below was carried up into
the tables above — the tables above start empty, on both phones, from step 1.**

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
