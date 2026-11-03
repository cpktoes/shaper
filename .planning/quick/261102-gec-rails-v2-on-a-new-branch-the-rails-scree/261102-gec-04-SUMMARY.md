---
phase: quick-261102-gec
plan: 04
subsystem: rails
status: complete
tags: [rails, rails-v2, advanced-menu, nudges, domed-deck-band]
requires: ["261102-gec-01", "261102-gec-02", "261102-gec-03"]
provides:
  - "lib/geometry/rail-bands.ts: six nudge keys in menu order (apexThickness, deckMark1, deckMark3, domedDeckBand, bottomTuck1, bottomTuck3); the dome nudged ±2\" and held 1/16\" past Deck Mark 3; Deck Mark 2 and Bottom Tuck 2 as plain halves; railNudgesOf"
  - "lib/models/design-snapshot.ts: rule 10 amended — six nudges, the retired amounts dropped on read, a missing dome nudge reads 0"
  - "components/rails/rail-controls.tsx: the Advanced menu with the Domed Deck Band slider under Deck Mark 3, no Deck Mark 2 or Bottom Tuck 2 slider"
  - "components/design/design-store.tsx: updateRailNudge rebuilds a rail's nudges through railNudgesOf"
affects: [RAILS Advanced menu, RAILS drawing (only when the dome is nudged), DATA tab, volume (domed decks only, only when nudged), saved boards, Copy preset values]
tech-stack:
  added: []
  patterns: ["a guard applied after its parent mark settles, the same shape as Bottom Tuck 3 against Bottom Tuck 1"]
key-files:
  created: []
  modified:
    - lib/geometry/rail-bands.ts
    - lib/geometry/rail-bands.test.ts
    - lib/geometry/presets.ts
    - lib/geometry/preset-source.test.ts
    - lib/models/design-snapshot.ts
    - lib/models/design-snapshot.test.ts
    - lib/models/saved-board-open.test.ts
    - components/rails/rail-controls.tsx
    - components/design/design-store.tsx
    - components/design/slider-row.test.ts
    - e2e/rails-advanced.spec.ts
decisions:
  - "R17 (the founder): Deck Mark 2 and Bottom Tuck 2 lose their sliders — always halfway to their parent mark"
  - "R18 (the founder's final ruling): a Domed Deck Band slider, ±2\" in 1/16\" (1 mm) steps, never equal to Deck Mark 3 — held 1/16\" past it"
  - "PC25-PC34 applied as planned"
metrics:
  completed: 2026-11-02
actuals:
  tokens: 16300    # chars/4 over the realized code + test + spec diff (65,327 chars; pictures and the archive left out)
  tasks: 3
  commits: 5
duration: about 1 h 15 min
---

# Quick 261102-gec Plan 04: Deck Mark 2 and Bottom Tuck 2 always halfway, and a Domed Deck Band slider — Summary

**Each rail's Advanced menu now has six sliders instead of seven. Deck Mark 2 and Bottom Tuck 2 lost theirs
and always sit halfway to their parent mark. A new Domed Deck Band slider, right under Deck Mark 3, moves
where the deck reaches full thickness up to 2" either way, and stops 1/16" short of ever landing on Deck Mark
3. No board changes until a shaper moves the new slider.**

## For the founder, in plain words

**Deck Mark 2 and Bottom Tuck 2.** As you asked ("Always in the middle is great"), their sliders are gone.
Deck Mark 2 is always exactly half of Deck Mark 1, and Bottom Tuck 2 always half of Bottom Tuck 1, even after
you nudge Deck Mark 1 or Bottom Tuck 1. Band 2 starts at the middle of Band 1, and Tuck 2 at the middle of
Tuck 1. That is exactly how they were before anyone touched their sliders.

**The new Domed Deck Band slider.** It sits right under Deck Mark 3 on every rail (nose, centre and tail,
flat deck or domed, Hard Edge or not). It runs from -2" to +2" in 1/16" steps, or -50 to +50 mm in whole
millimetres in Metric. Its label reads the mark and the nudge the same way as the others, for example
`Domed Deck Band — 5 3/8" (0")`. Reset Advanced Settings puts it back to 0 with everything else.

- **On a domed deck** it moves where the deck reaches full thickness, so the deck falls toward the rail more
  steeply (slider down) or more gently (slider up). Band 1's and Band 2's deck ends ride the new deck line.
- **On a flat deck** the deck is flat either way, so only the dome's own green dot and the end of its line move.
  The marks, the DATA tab and the litres stay exactly as they were.
- **It never lands on Deck Mark 3.** Your final ruling was "never let it equal Deck Mark 3", so when the slider
  would bring the dome onto Deck Mark 3 or inside it, the dome stops 1/16" past Deck Mark 3. On the Shortboard's
  centre, Deck Mark 3 reads 4 1/16" and the dome at -2" stops at 4 1/8" (the sheet's own figure would be
  3 3/8"). If you push Deck Mark 3 out, the stop follows it. It carries no "trimmed" note; the label simply
  reads where it stopped.

**The drawing at the slider's ends.** The drawing always shows 2" beyond the dome, so a +2" dome on the centre
makes every cross-section reach further left. Where the drawing is limited by width (the narrowest computer
window and a phone), the cross-sections draw about a fifth smaller at +2" and about a fifth larger at -2". On a
wider computer window they keep their size and just reach further or shorter on the left.

**Nothing moves until you move the slider.** The sheet's own dome is 2.4 x the board thickness and Deck Mark 3
is at most 1.8 x the thickness, so the two are always at least 0.6 x the thickness apart, far more than 1/16"
on any board the app can make. The stop can only ever catch the slider. Every preset, every saved board and
the record of your sheets read exactly as before (litres table below).

**Boards saved earlier.** A board saved on this branch with a Deck Mark 2 or Bottom Tuck 2 nudge opens with that
nudge ignored, and its marks sit halfway as they always did. A board saved without a dome nudge opens at 0.
Nothing is rewritten until you save. There is no database change.

## One thing to look at: the drawing's corner buttons at +2" (not fixed here)

In `p4-after-dome-plus2-desktop.png` (a 1280-wide window, the Shortboard's centre dome at +2"), the cross-sections
are wide enough that the **Nose plot's own zoom and full-size buttons run under the drawing's top-right buttons**
(View Full Sized, Ghost Bands, Finished Rail). Before this slider, nothing could make a plot that wide at that
size. I checked the Longboard, whose 3" centre gives the widest un-nudged dome (7.2"): its drawing is limited by
height, so its plots stop well short of the corner (scratch picture, not committed). Only the slider can do this.
The fix is in the drawing's layout, not in this plan's files, so it is left for you and the orchestrator to
rule on. Two possible fixes: keep the plots clear of the corner buttons, or cap how wide a plot may grow.

## Litres, before and after this plan

From `scripts/phase14-before-after.ts --step curves`, run before any code change and after Task 1. The two
outputs are identical line for line (`diff` empty), card lines included.

| Board | Before | After |
|-------|--------|-------|
| Shortboard preset | 29.879 L | 29.879 L |
| Fish preset | 35.089 L | 35.089 L |
| Mid-length preset | 49.765 L | 49.765 L |
| Longboard preset | 73.179 L | 73.179 L |
| The first board (no blank) | 30.522 L | 30.522 L |
| The Arctic board | 47.417 L | 47.417 L |

What the slider does to litres, with every rail's dome nudged at once (scratch script, the app's own
`summarizeDesignWith`). These figures match the plan's M18:

| Preset | Decks | +2" on every rail | -2" on every rail |
|--------|-------|-------------------|-------------------|
| Shortboard, Fish, Longboard | flat | 0 L | 0 L |
| Mid-length | domed (96 / 91 / 93%) | -0.536 L | +0.478 L |

## What was built

- **Task 1 — the rules, storage, presets and unit tests** (`fc7e177a`). Covers PC25-PC31 and PC34:
  - `RAIL_NUDGE_KEYS` is now the six keys in menu order. Its limits, its zeros and its names follow, and the dome's
    window (`RAIL_NUDGE_LIMIT_IN.domedDeckBand`) is 2.
  - Deck Mark 2 = max(1/16", min(Deck Mark 1 / 2, Deck Mark 1 - 1/16")), and Bottom Tuck 2 likewise. The floors are
    as before, minus the nudge.
  - The dome is worked out after Deck Mark 3: max(2.4 x T + nudge, Deck Mark 3 + `MIN_RAIL_MARK_IN`). There is no new
    constant.
  - `railNudgesOf` returns exactly the six keys, reads anything that is not a finite number as 0, and drops other
    keys. `computeRailSection` and `computeRailSectionOutput` read their nudges through it.
  - Rule 10's comment in `design-snapshot.ts` is amended. The schema walks `RAIL_NUDGE_KEYS`, so it needed no other
    edit.
  - The twelve preset `nudges` blocks are rewritten as the printer writes them: 12 x `domedDeckBand: inchesToMm(0),`.
  - The sidebar's row list is changed, so the commit type-checks.
- **Task 2 — the sidebar, the store and the browser proof** (`0491bf99`). Covers PC29 and PC32-PC34:
  - `nudges` reads through `railNudgesOf`.
  - `showTwoTuckRows` is renamed `showBottomTuck1` (it hides only Bottom Tuck 1 now).
  - The Advanced comments are rewritten with the founder's words.
  - `updateRailNudge` rebuilds a rail's nudges through `railNudgesOf`. `resetRailAdvanced` is unchanged apart from
    its comment.
  - `slider-row.test.ts` now says "six nudges", and the count of 2 stands.
  - The browser spec: tests 1, 3, 4 and 6 are amended, and a new test 12 covers the dome.
- **Task 3 — checks, references, pictures** (`40ce1d8d`) and this summary.

PC25-PC34 were applied as planned, and M15-M22 were confirmed:
- **M15:** the unchanged generator re-wrote the golden byte for byte, and `git diff --exit-code` was clean.
- **M16:** the litres above.
- **M18:** the scratch script.
- **M20:** test 12 and the pictures. The first board's centre reads 4 9/16" against 4 1/2", then 5 1/16" against
  5".
- **M22:** the four predicted unit failures were exactly the ones rewritten.

## Gates

| Gate | Result |
|------|--------|
| Unit suite (`npx vitest run`) after Task 1 and after Task 2 | 156 files, 5,917 passed, 2 skipped, 0 failed (both times) |
| RED check (the new tests against the old rules) | 32 failed in the four touched suites, as expected; then 196/196 green |
| `npx next typegen` + `npx tsc --noEmit` | clean (both tasks) |
| `npm run lint` | clean (both tasks) |
| Golden generator re-run + `git diff --exit-code lib/geometry/__fixtures__/ scripts/` | clean: 1,450 cases, 180 half-way skips, 33 finished curves, 3,772 samples |
| No database, script, fixture, `volume.ts` or `finished-rail.ts` change | 0 files |
| `e2e/rails-advanced.spec.ts` (desktop, iPhone, Android) | 35 passed, 1 skipped (test 10, the finger, on desktop only), 0 failed |
| The nine-spec RAILS list (plan 01's list), every project | 212 passed, 118 skipped, 0 failed, no re-runs (22.3 min) |
| `e2e/desktop-baseline.spec.ts`, no re-record | 5 passed, 10 skipped (phones), 0 failed; nothing re-recorded, no diff against the base |

Every Playwright run used `PW_PORT=3175 IS_WEBPACK_TEST=1`, and port 3175 was free before each one.

## Pictures (`pictures/`)

| Picture | What to look at |
|---------|-----------------|
| `p4-before-viewer-desktop.png` / `p4-after-viewer-desktop.png` | The Shortboard on RAILS with every Advanced menu closed. Identical, byte for byte. |
| `p4-before-advanced-center-desktop.png` / `p4-after-advanced-center-desktop.png` | Deck Mark 2 and Bottom Tuck 2 are gone, and `Domed Deck Band — 5 3/8" (0")` sits right under Deck Mark 3. |
| `p4-before-advanced-nose-desktop.png` / `p4-after-advanced-nose-desktop.png` | The same on the nose, under "Scaled from center by". |
| `p4-before-advanced-iphone.png` / `p4-after-advanced-iphone.png` | The nose's menu on an iPhone. Deck Mark 3 now follows Deck Mark 1. |
| `p4-after-dome-plus2-desktop.png` | The centre's dome at +2" (7 3/8"). The drawing reaches further left. See the corner-button note above. |
| `p4-after-dome-minus2-desktop.png` | The centre's dome at -2" stops at 4 1/8", 1/16" past Deck Mark 3's 4 1/16". |
| `p4-after-dome-plus2-iphone.png` | The centre at +2" on an iPhone. The slider's thumb is at its end and the drawing has rescaled. |

The picture script is in `pictures/shoot-source-04.tar.gz`, and no loose `.ts` is left in `pictures/`.

## Deviations from Plan

- **Task 3's re-archive was skipped on purpose.** The picture script did not change between the before and after
  runs, so the archive committed with the before pictures already holds it. Re-packing would only change the
  file's timestamps.
- **RED was checked by putting the old rules back.** The tests were written right after the rules, so I checked
  RED by temporarily restoring `rail-bands.ts` to the base version, then put the new version back before the
  commit. The red run is in the Gates table. The plan wanted one commit for the whole task, so there is no
  separate `test(...)` commit.
- **Left as it is (outside this plan's files):** `lib/geometry/preset-source.ts` still has a comment that says
  "the seven nudges". The code walks `RAIL_NUDGE_KEYS`, so it prints the six. It is a one-word comment fix for a
  later touch of that file.
- **Found, not fixed:** the corner-button overlap at a +2" dome on a 1280-wide window (above).

## Known Stubs

None.

## Threat Flags

None. The new nudge is read by the existing forgiving reader: `z.number().catch(0)`, with unknown keys stripped.
The engine holds the nudge to ±2" and at least 1/16" past Deck Mark 3, and `railNudgesOf` covers a board in
memory.

## Self-Check: PASSED

- Commits `8e0ab1bb`, `fc7e177a`, `0491bf99` and `40ce1d8d` are on this branch.
- Four `p4-before-*.png` and seven `p4-after-*.png` pictures, plus `shoot-source-04.tar.gz`, are present.
- The golden, the preset-figures record, the generator, `volume.ts`, `finished-rail.ts` and the desktop references
  are unchanged against the base `ff4ead32`.
