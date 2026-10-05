---
phase: quick-261005-big
plan: 01
subsystem: rails-screen
tags: [rails, phone, controls, playwright]
status: complete
requirements: [QT-261005-big]
key-files:
  modified:
    - components/rails/rail-controls.tsx
    - components/rails/rail-band-editor.tsx
    - e2e/phone-rails.spec.ts
    - e2e/prod/slider-dots.spec.ts
  created:
    - .planning/quick/261005-big-on-screens-that-put-the-rails-on-individ/pictures/rails-iphone-nose.png
    - .planning/quick/261005-big-on-screens-that-put-the-rails-on-individ/pictures/rails-iphone-nose-end.png
    - .planning/quick/261005-big-on-screens-that-put-the-rails-on-individ/pictures/rails-iphone-center.png
    - .planning/quick/261005-big-on-screens-that-put-the-rails-on-individ/pictures/rails-iphone-tail.png
    - .planning/quick/261005-big-on-screens-that-put-the-rails-on-individ/pictures/rails-iphone-data.png
decisions:
  - "D-01 to D-08 of the plan were followed as written; no new decisions were made."
actuals:
  tokens: 40000
  tasks: 3
  commits: 4
---

# Quick 261005-big: RAILS shows only the picked rail's controls on an upright phone

On RAILS' VIEWER tab, in the upright layout (any window under 820 dots wide), the controls under the drawing now show
only the rail picked on the NOSE / CENTER / TAIL switch.

## What changed on the screen

- **Upright phone, VIEWER tab (and an iPad held upright, which is 810 wide):** NOSE shows only the Nose Rail group
  (heading, Thickness, Deck Profile, Family, Ratio, Advanced fold). CENTER shows only the Center Rail group. TAIL shows
  only the Tail Rail group, with its Hard Edge checkbox. The other two groups are not drawn at all, so they are also out of
  the tab order and out of what a screen reader reads.
- **Always shown, whichever rail is picked:** the Rail Band Calculator title and its line under it, "Use Board's Rocker &
  Foil Thickness" and its note, "Include Rail Band Instructions in Print" and its note, and Back / Next.
- **Unchanged:** DATA still lists all three rails' controls; INSTRUCTIONS still hides the whole controls column on an upright
  phone; a computer, an iPad held sideways and a phone held sideways (844x390, 863x360) still show all three groups beside
  the stacked drawings with no switch. Going VIEWER, DATA, VIEWER comes back on the rail last picked.
- Nothing about a board changes: no fold opens or closes by itself, nothing in the design, a saved board or the database is
  touched, and nothing under `lib/` changed. The rule is decided by the same width rule that draws the switch, in the page's
  first paint, with no JavaScript width check.

The change is one optional prop through `RailControls` (`phoneSection`) and one optional flag on each rail group
(`hiddenOnPhone`, adding `max-shell:hidden` as a complete literal class on the group's root), plus one line and a comment
block in `rail-band-editor.tsx`.

## Commits

| Commit | What |
| ------ | ---- |
| f686ed4 | Browser test first (fails until the next commit) |
| 3a24331 | The change: only the picked rail's controls on an upright phone |
| 64efe9f | Production-build check for slider dots (cannot run in a worktree) |
| (this commit) | SUMMARY and the five pictures |

## Failing-first evidence (f686ed4, run on the unchanged components)

`PW_PORT=3141 IS_WEBPACK_TEST=1 npx playwright test e2e/phone-rails.spec.ts -g "261005-big"`: 3 failed, 3 passed, 6 skipped.

- `[iphone]` and `[android]`, "NOSE, CENTER, TAIL each show only their own group...": failed at
  `Center Rail's group should be hidden` (`expect(locator).toBeHidden()` — Expected: hidden, Received: visible), at the
  first hidden-group assertion on the default NOSE tab.
- `[desktop]` at 810x1080, "the one-rail rule follows width alone (D-07)": the same failure, `Center Rail's group should be
  hidden`, Received: visible.
- The 3 that passed on today's code are the guards for the side that must not change: the 1280x800 computer, and the sideways
  iPhone (844x390) and Pixel 7 (863x360), all showing no switch and all three groups.

After 3a24331 the same command gives 6 passed, 6 skipped, 0 failed.

## Gates, with real results

All run in the worktree on port 3141 (no other port was needed; nothing was listening on it beforehand).

| Gate | Result |
| ---- | ------ |
| `npx vitest run` | 105 files passed; 3962 tests passed, 2 skipped |
| `npx tsc --noEmit` | clean, after each code commit |
| `npm run lint` | clean |
| `-g "261005-big"` (3a24331) | 6 passed, 6 skipped |
| `phone-rails`, `slider-touch`, `step-nav`, `undo-redo`, `viewer-toolbar`, `phone-screen-tiles` (all three projects) | 118 passed, 90 skipped, 2 failed on the first run (see below), 25 passed on the re-run |
| `touch-sizing`, `phone-chrome` (all three projects) | 83 passed, 112 skipped, 0 failed |
| `desktop-baseline` `-g "RAILS"` on desktop | 1 passed (the RAILS screenshot matches its baseline) |
| `playwright -c playwright.prod.config.ts --list` for "261005-big" | the new test is listed on iphone, android and desktop (3 lines) |
| Scope check, `git diff --name-only 9836eb9..HEAD` | only the two rail components and the two spec files; nothing under `lib`, `app`, `components/design`, `components/ui` or the other screens |
| Grep checks | `flex flex-col gap-3.5 max-shell:hidden` once in `rail-controls.tsx`; the `phoneSection={activePage === "viewer" ? phoneSection : undefined}` line once in `rail-band-editor.tsx`; no `matchMedia`, `innerWidth` or `useMediaQuery` in either file |

**The two first-run failures and the re-run.** In the first combined run, two android tests failed: `phone-screen-tiles.spec.ts`
"Imperial reads the Shortboard's 6'2" x 18 3/4"" and `step-nav.spec.ts` "Next walks TEMPLATE to SUMMARY and Back walks home
again". Both failed in their opening helper (`openPreset` / `startTheFirstPreset`), which taps a preset card on the home page
and waits for `/design/outline`; the page stayed on `/`. Neither opens RAILS before that point. I re-ran both files alone on the
android project (`--project=android`): 25 passed, 4 skipped, 0 failed. I judged this a cold dev server hydrating late rather than
a result of this change, and did not check the two tests against the base commit because both passed on the re-run.

## Existing assertions changed

None. No existing assertion was edited or loosened.

## The production slider-dot test

`e2e/prod/slider-dots.spec.ts` has a second test ("RAILS on an upright phone: every dot in the rail that comes into view is
drawn — NOSE, CENTER, TAIL and back (261005-big)"), and its header comment now says why: an upright phone's RAILS now loads
the Center and Tail rails' sliders `display:none`, which is the case the slider remount guard in `components/ui/slider.tsx`
exists for (untouched). It cannot run in a worktree. It is type-checked, linted and listed by the production config, but it has
not been run.

## Pictures (upright iPhone, 390x664, signed out, dev server)

In `.planning/quick/261005-big-on-screens-that-put-the-rails-on-individ/pictures/`:

- `rails-iphone-nose.png`: NOSE selected; the Nose Rail group fills the window under the drawing, and Center and Tail are not there.
- `rails-iphone-nose-end.png`: NOSE, scrolled to the end; the print checkbox and Back / Next come straight after the Nose group.
- `rails-iphone-center.png`: CENTER selected, drawing on the center rail; only the Center Rail group.
- `rails-iphone-tail.png`: TAIL selected; only the Tail Rail group (its Hard Edge checkbox sits just below the Ratio row, one scroll down).
- `rails-iphone-data.png`: the DATA tab; the controls show all three rails. The window under the drawing is only about 220
  dots tall and the Nose group nearly fills it, so the picture is scrolled to show the end of the Nose group (the Advanced fold)
  with the Center Rail group following. The Nose Rail heading itself is scrolled off the top of this one.

The "Copy preset values" button at the bottom of every picture is development-only and is not on the live site. The pictures
were taken from a throwaway spec and config under `.gsd/`, hiding the dev server's "Compiling" badge; both were deleted and
nothing from them is committed. The first take of the DATA picture showed the Nose group alone (no Center Rail), and the first
takes of CENTER, TAIL and DATA caught the dev "Compiling" badge, so those were retaken.

## Deviations from Plan

None. The plan was followed as written; the only unplanned step was re-running two flaky-looking files, described above.

## Follow-ups for the orchestrator

- Run `npm run build` and `npm run test:e2e:prod` on main after the merge. The production run covers the new slider-dot test
  and `e2e/prod/phone-controls-clear-undo.spec.ts` (RAILS controls still end with the print checkbox and Back / Next).
- Run the full browser suite on main.
- The founder should look at the five pictures before anything is pushed.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- Commits f686ed4, 3a24331 and 64efe9f exist in the worktree's history.
- The four changed source files and the five pictures exist.
