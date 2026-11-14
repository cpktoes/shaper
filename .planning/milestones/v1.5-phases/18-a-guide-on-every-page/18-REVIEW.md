---
phase: 18-a-guide-on-every-page
reviewed: 2026-11-10T00:00:00Z
depth: standard
files_reviewed: 36
files_reviewed_list:
  - app/globals.css
  - components/fins/fin-placement-editor.tsx
  - components/guide/fins-guide.tsx
  - components/guide/guide-card.tsx
  - components/guide/guide-cartoon.tsx
  - components/guide/guide-copy.ts
  - components/guide/guide-memo.ts
  - components/guide/guide-tab.tsx
  - components/guide/guide-view.ts
  - components/guide/guide-words.ts
  - components/guide/rails-guide.tsx
  - components/guide/rocker-guide.tsx
  - components/guide/template-guide.tsx
  - components/guide/volume-guide.tsx
  - components/guide/words/fins.ts
  - components/guide/words/metric-sayings.ts
  - components/guide/words/rails.ts
  - components/guide/words/read-words-page.ts
  - components/guide/words/rocker.ts
  - components/guide/words/template.ts
  - components/guide/words/volume.ts
  - components/outline/outline-editor.tsx
  - components/rails/rail-band-editor.tsx
  - components/rocker/rocker-editor.tsx
  - components/rocker/rocker-live-controls.ts
  - components/viewer/tabbed-panel.tsx
  - components/volume/volume-estimator.tsx
  - lib/geometry/fins.ts
  - lib/geometry/guide-card.ts
  - lib/geometry/guide-draw.ts
  - lib/geometry/guide-fins.ts
  - lib/geometry/guide-outline.ts
  - lib/geometry/guide-push.ts
  - lib/geometry/guide-rails.ts
  - lib/geometry/guide-rocker.ts
  - lib/geometry/guide-volume.ts
findings:
  critical: 0
  high: 0
  medium: 2
  low: 6
  info: 5
  total: 13
status: issues_found
---

# Phase 18: Code Review Report

**Reviewed:** 2026-11-10
**Depth:** standard (plus scratch probes of the builders on boards the fixtures do not cover)
**Files Reviewed:** 36
**Status:** issues_found

## Summary

The GUIDE is carefully built. `tsc --noEmit` and ESLint over every reviewed file print nothing, the
builders live in `lib/geometry/` and import no React, browser or database module, and no 25.4 or bare `10`
is used for a design value outside `guide-push.ts` (the one ledgered file). Nothing is read from `window` or
storage during render, so there is no hydration risk. All five guides mount only while the GUIDE tab is
open (each editor renders `{activeTab === "guide" && <XGuide />}`), so they cost nothing while it is closed.
The hooks are unconditional, and the memo keys in the five `*-guide.tsx` files cover everything each
builder reads.

I ran the five builders in a scratch script (in the scratchpad, not the repo) over every preset at lengths
60 to 120 in, widths 16 to 25 in, with and without a blank, a blank much shorter and much longer than the
board, wings 0/1/2, all five tails, every fin setup with Import Designed Board on and off, both systems,
and blank states at every slider end (placement, deck skin, fine-tunes, Thinning Starts, Tip Style, a
rocker change already at 2 in). No builder threw, and no figure had a NaN or an Infinity. The label-overlap
check (`guideLabelOverlaps` at fit 0.7) found two real cases, below. The Metric no-inch sweep over the
twelve fixture boards found inch figures only in the Customize Rocker card's tag and caption (the maker's
order code, see MD-02).

No Critical or High findings. Two Medium, six Low, five Info.

## Medium

### MD-01: RAILS "Tail Rail Blends From · Ends At" clips the Ends At figure off the left edge of its window on 5'0" to 5'11" boards

**File:** `lib/geometry/guide-rails.ts:541-542` (`blendsFigure`)
**Issue:** The two figures under the stringer are anchored away from each other. "Ends At" is set
`anchor: "end"` at `X(ends) - 3`, so its text runs toward the nose, and nothing checks that it stays inside
the window's clip box. On a short board the Ends At mark sits near the nose end of the window, and a figure
with a fraction ("29 1/2"") or a Metric figure ("72.4 cm") starts left of the window's x = 8 and is cut by
the window clip.

I measured it with `guideTextBox` at the narrowest card (fit 0.7). `guideLabelOverlaps` returns `[[1,-1]]`
(label 1 leaves its window), with the Ends At label starting at x = 2.2 to 4.3 against a window starting at
x = 8:

- Imperial: a 62" to 64" board and a 68" to 70" board, at an 18" wide point.
- Metric: every length from 60" to 71" at 18" wide (24 of 24 length/width/preset combinations).

The clip eats most of the first digit, so a shaper reads `9 1/2"` for 29 1/2" and `2.4 cm` for 72.4 cm.
That is a wrong figure on a card whose whole job is those two marks. It shows only on the narrowest cards
(fit below about 0.77, so card widths from 236 to about 256 dots). That is a two-column desktop canvas near
480 dots (the 820 line) and a phone held sideways, where `GuideTab` gives each card 236 to 248. The fixture
boards in `guide-pages.test.ts` never go below 8'0" minus 1 cm, which is why the label-collision test passes.

**Fix:** Place this pair through the same fallback the ROCKER builder uses (`LabelRoom.place`), or clamp
the left one inside the window and flip its anchor when it would leave it. Smallest change:

```ts
const boxLeft = box.x + 2; // inside the window's clip
const endsLabel = [guideFigure(formatDim(ends, system))];
const endsAt = f1(X(ends) - 3);
const endsW = guideTextBox({ kind: "text", role: "value", x: 0, y: 0, parts: endsLabel, anchor: "start" }, GUIDE_MIN_FIT)!.w;
prims.push({
  kind: "text", role: "value", dy: 0.85, y: labelY, parts: endsLabel,
  ...(endsAt - endsW < boxLeft ? { x: f1(X(ends) + 3), anchor: "start" } : { x: endsAt, anchor: "end" }),
});
```

Then add a short-board case to the label-collision test (a Shortboard at 63 in, 69 in, and the same in Metric).

### MD-02: The Customize Rocker card shows the maker's inch order code to a Metric shaper, on a surface CLAUDE.md Rule 2 does not list

**File:** `lib/geometry/guide-rocker.ts:283` (caption) and `:855` (tag)
**Issue:** In Metric the Customize Rocker card's tag reads `+1/2"N18"` and its dashed caption reads
`dashed · +1/2"N18"` (or `+1"N18"` on a board already ordering a bend). The metric no-inch sweep confirms
these are the only inch figures on any card, tag, caption or drawing label in Metric.

`18-UI-SPEC.md` line 316 authorises this by name, so it is a deliberate design choice and not a slip.
CLAUDE.md Rule 2, however, lists the surfaces that show the note in inches (the BLANK button, the Pick a
Blank cards, the DATASHEET, the phone's ROCKER tile, the order form's blank line) and calls
`formatRockerNote` "the one place an inch figure is shown to a Metric shaper". The GUIDE is not on that
list. The next reader of CLAUDE.md, or the next audit, will read these two strings as a Rule 2 breach, and
the CLAUDE.md sentence about the phone and the Metric sayings test's `GUIDE_METRIC_EXEMPT` disagree.

**Fix:** Either add "the GUIDE's Customize Rocker card (tag and caption)" to the surface list in CLAUDE.md's
Rule 2 (one line, in the same commit as the phase), or, if the founder prefers the card to stay all-metric,
print the bend as a mark (`formatSignedMark`) and keep the order code only on the surfaces already listed.
Either way, state the ruling next to `GUIDE_METRIC_EXEMPT` in `words/metric-sayings.ts`.

## Low

### LW-01: The "memoised per board, never worked out twice" cache never hits on flipping back to GUIDE

**File:** `components/guide/guide-memo.ts:12-29`, and the `useMemo` that makes the key in each of
`fins-guide.tsx:37`, `rails-guide.tsx:32`, `rocker-guide.tsx:30`, `template-guide.tsx:28`, `volume-guide.tsx:38`
**Issue:** `memoGuide` is keyed on `input`, an object each guide makes with `useMemo` inside the component.
Each editor renders the guide only while its tab is active, so leaving the tab unmounts it, and coming back
makes a new `input` object and a new WeakMap key. The doc comment ("flipping back to GUIDE ... never works a
page out twice") is not true. The cache helps only for an Imperial/Metric toggle while the tab stays open,
and there the surrounding `useMemo` already holds the result per system. I timed the builders
(FINS 5 to 11 ms, ROCKER 17 to 30 ms, the rest under 15 ms in Node), so this costs little and is not a
correctness bug.
**Fix:** Either key on an object that survives unmount (the store's own `finPlacement`, `sideProfile`,
`railBands`, `outlineGeometry`, `volumeResult`), or drop `memoGuide` and the five WeakMaps and rely on the
`useMemo`. If it stays, correct the comment.

### LW-02: A board name containing `$&`, `$'` or `{blank}` garbles the intro

**File:** `components/guide/guide-copy.ts:109-110`
**Issue:** `text.replaceAll("{board}", fill.board)` passes the shaper's board name as a replacement
*string*, so `$&`, `` $` ``, `$'` and `$$` are interpreted. In Node, a board named `Fish $& Pro $$` renders
as `Fish {board} Pro $`. Separately, `{blank}` is substituted after `{board}`, so a board named `{blank}`
shows the blank's name. Rare, user-controlled, cosmetic.
**Fix:** Use function replacements, and substitute both tokens in one pass:

```ts
text = text.replace(/\{board\}|\{blank\}/g, (token) => (token === "{board}" ? fill.board : (fill.blank ?? token)));
```

### LW-03: VOLUME's Board Type drawing collides its litres labels once a board is 100 L or more

**File:** `lib/geometry/guide-volume.ts:271-281` (`typesFigure`)
**Issue:** The seven litres figures sit 42 units apart. At the narrowest card each text is 14.3 units tall,
so a five-character figure ("104.3") is about 44 units wide and overlaps its neighbour.
`guideLabelOverlaps` reports six overlapping pairs on all four presets with VOLUME set to 10'0" x 25" x 5"
(Import Designed Board off). Only the narrowest cards on a very large board, but the slider ranges allow it
(for example a SUP-sized estimate).
**Fix:** Drop the decimal for figures of 100 L or more (`litres >= 100 ? litres.toFixed(0) : litres.toFixed(1)`),
or stagger the odd steps' labels onto a second row.

### LW-04: Several pushes are not held inside their control's range

**File:** `lib/geometry/guide-volume.ts:120` (Board Length, Board Width, Center Thickness),
`lib/geometry/guide-rocker.ts:225-232` (Center Thickness, Nose Tip, Tail Tip),
`lib/geometry/guide-rails.ts:248` (Board Thickness), `lib/geometry/guide-fins.ts:221-240`
(Fin Base Length, Aft/Forward, Off-Rail, Toe-In)
**Issue:** TEMPLATE, the RAILS nudges, the blends pair, Placement, Deck Skin and Thinning Start all push
through `pushWithin` or an equivalent and go the other way when there is no room (D-26). The cards named here
add the push to the board's value with no check. On a board already at the control's top, for example a
10'0" board on VOLUME (slider max 120") or a foil at 5" (`FOIL_THICKNESS_RANGE_IN.max`), the card draws and
captions a board the control cannot make (`dashed · 10'6"`), which is the very thing D-26 forbids elsewhere.
Not reachable on the presets.
**Fix:** Route these through the same `pushWithin`-style helper with the control's own `measureSlider` limits
(the code already does this for TEMPLATE in `sliderLimits`).

### LW-05: A card's caption and its drawing's figures are hidden from assistive technology with no text alternative

**File:** `components/guide/guide-card.tsx:47-66`, `components/guide/guide-cartoon.tsx:189-196`
**Issue:** The whole picture block (drawing and the `dashed · …` / `drawn as · …` caption) is wrapped in
`aria-hidden="true"`, and the SVG is `aria-hidden` too. The comment says the card's words say it all, but
the caption is the only text that says what the muted dashes show and by how much
(`dashed · +13 mm at the center`, `drawn as · Thruster — McKee Gun`). A screen-reader user gets the tag and
the two sentences but never the pushed amount, and the drawings carry no `role="img"` and no name.
**Fix:** Move the caption `<p>` out of the `aria-hidden` wrapper (it is plain text), and give the SVG
`role="img"` with `aria-label={guideCaptionText(caption) || card.name}` in place of `aria-hidden`, or keep it
hidden and add the caption text as `sr-only` text on the card.

### LW-06: The slider limits TEMPLATE pushes against are copied literals, not the controls' own constants

**File:** `lib/geometry/guide-outline.ts:240, 244, 257, 263, 272, 283` (and `:241, :246-247, :284`)
**Issue:** Nose angle 35 to 90, tail angle 30 to 90, widepoint offset -12 to 12, tail block 0 to 16, diamond
depth 1 to 5, swallow depth 1 to 8 and the 0 to 100 percentages are typed here a second time. They match
`components/outline/outline-controls.tsx` today (lines 231, 278, 370, 386, 429), but nothing ties them, so a
change to a sidebar range would silently make the GUIDE push to a value the slider cannot set.
**Fix:** Export each range once from `lib/geometry/board.ts` (as `BOARD_LENGTH_RANGE_IN` already is) and
import it in both places.

## Info

### IN-01: Dead and duplicated GUIDE copy constants

**File:** `components/guide/guide-copy.ts:27` and `:29`, `components/guide/guide-words.ts`
**Issue:** `GUIDE_COPY.tab` and `GUIDE_COPY.onThisBoard` are never read by any non-test file. The word
"GUIDE" is typed in five editors and "On this board" in five builders (`guide-fins.ts:587`,
`guide-outline.ts:509`, `guide-rails.ts:549`, `guide-rocker.ts:742`, `guide-volume.ts:347`).
`guide-words.ts` (`GUIDE_PAGE_WORDS`, `GUIDE_WORDS`, `GUIDE_GROUPS`, `guidePageWords`) is imported only by tests.
**Fix:** Have the builders and editors use the constants, or delete the unused ones.

### IN-02: `guideView` checks one direction only

**File:** `components/guide/guide-view.ts:30-50`
**Issue:** It throws for a words card with no worked-out card, as documented, but a worked-out card with no
words, or a words card whose `group` matches none of the groups, is dropped silently by the
`filter`/`map`. The 84-card count test catches it today.
**Fix:** Throw when `groups.flatMap(...)` yields fewer cards than `words.length`.

### IN-03: `read-words-page.ts` finds the words page by walking `.planning/` and takes the first match

**File:** `components/guide/words/read-words-page.ts:74-86`
**Issue:** Test-only and not imported by any screen, so there is no runtime risk. But `findPage` returns the
first `18-GUIDE-WORDS.md` in directory order, so a second copy (for instance after the phase is archived
beside a live one) makes the words tests read an arbitrary one, and the tests fail outright where
`.planning/` is not checked out.
**Fix:** Fail if two copies are found; note the dependency in the test header.

### IN-04: Two slightly different "narrowest card" fits

**File:** `components/guide/guide-tab.tsx:37` against `lib/geometry/guide-card.ts:174`
**Issue:** `GuideTab` clamps the measured fit to `MIN_PINNED_FIT_SCALE` (0.66) while every layout budget
assumes `GUIDE_MIN_FIT` (0.7). They only differ if a card is narrower than about 210 dots inside, which the
236-dot track floor prevents, so this is a latent mismatch and not a bug.
**Fix:** Clamp to `GUIDE_MIN_FIT` in `GuideTab`, so the two cannot drift.

### IN-05: A comment in `DesignScreenShell` is now false

**File:** `components/design/design-screen-shell.tsx:88-90` (not in the diff)
**Issue:** It says no caller uses `simpleSidebar` with a `phonePinned` other than `"none"`, and that VOLUME
"always pairs it with `phonePinned="none"`". VOLUME now passes `"66dvh"` while GUIDE is open
(`volume-estimator.tsx`, `phonePinned={activeTab === "guide" ? "66dvh" : "none"}`), which is exactly the
branch the comment calls unused. D-28 records that this was measured, so the code is right and the comment is stale.
**Fix:** Update the comment to name the VOLUME GUIDE as the caller.

---

_Reviewed: 2026-11-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
