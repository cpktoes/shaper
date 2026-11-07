---
phase: 16-3d-board-and-cnc-export
verified: 2026-11-06T23:30:00Z
status: passed
score: 11/12 requirements verified in code (R8 open by the founder's decision, not a code gap)
behavior_unverified: 0
overrides_applied: 1
overrides:
  - must_have: "R8 The files are what Shape3D takes: the DXF, STL and text files open in Shape3D's import"
    reason: "NOT TESTED. Deferred with explicit tracking in .planning/todos/pending/2026-11-06-run-the-shape3d-acceptance-test-on-the-export-zip.md. The founder shipped without the test ('shape3d I'll have to come back to') and the Export button says the export is experimental. R8 stays out of requirements-completed."
    accepted_by: "the founder"
    accepted_at: "2026-11-06T23:20:00Z"
re_verification: false
gaps: []
deferred: []
human_verification:
  - test: "R8 - open the exported zip's files in Shape3D (Scan import: the .dxf as a Board with the board unit set to mm, then one slice file as a Slice, the outline file as an Outline, the .stl as a scan)"
    expected: "Shape3D accepts each file, with the tail at x = 0, the deck up and the length in millimetres, and fits its own curves to it"
    why_human: "Shape3D has never opened these files. It is a third-party program with a trial licence, so no test here can prove it. The founder shipped without running it (\"shape3d I'll have to come back to\", 2026-11-06). The Export button says the export is experimental and that Shape3D may or may not import the files yet."
  - test: "Mac Safari trackpad pinch on the live 3D screen"
    expected: "A two-finger pinch zooms toward the pinch point, and the page itself never zooms"
    why_human: "Asked for in plan 16-13 (UI-SPEC open items 2 and 3) and not reported. The handler exists (gesturestart/gesturechange at three-d-screen.tsx around line 1142), but real Safari behaviour cannot be checked from code."
  - test: "One of the founder's own saved boards on the live 3D screen (signed in)"
    expected: "The board draws as a closed solid, and VOLUME's litres on the board's own screens match the new figure in the 16-13 surface report"
    why_human: "Asked for and not reported. The live check used the Shortboard preset, signed out. The 30 real saved boards were exercised only through the read-only reports and the 102-board in-memory test set."
behavior_unverified_items: []
---

# Phase 16: 3D Board and CNC Export - Verification Report

**Phase Goal:** A shaper sees the board they designed as a solid, realistic surface they can spin and move in every direction, lit the way a shaping room is lit so every contour shows, on a 3D screen of its own. They take that surface away as a file a CNC shaping program (Shape3D, AkuShaper) can read as a 3D guide: a wireframe (DXF) and/or XYZ text files for the outline, the profile and the slices. The surface is built from the same cross-sections the litres count, so what the shaper sees and exports is exactly what VOLUME counts.
**Verified:** 2026-11-06
**Status:** human_needed
**Re-verification:** No, initial verification
**What was verified:** the code as it stands on `board-3d` (`fa9e2804`). Its tree equals live `main` `1c6dc5ef` for all non-`.planning` files (`git diff 1c6dc5ef HEAD` touches only `.planning`). The live code equals the gated tip `022963df` except for two test and doc files (`e2e/board-lock-screens.spec.ts`, `16-13-SUMMARY.md`).

## Goal Achievement

The phase goal is achieved in code. The one part that cannot be proven here is the second half of the goal: that Shape3D reads the files. That is a human item, not a gap, per the founder's ruling and plan 16-13's own rule.

### Observable Truths (the 12 SPEC requirements, with later rulings applied)

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| R1 | A 3D screen of its own, seven screens everywhere | VERIFIED | `NAV_LINKS` in `components/site-nav.tsx` has 3D last (7 entries). `app/design/3d/page.tsx` mounts `ThreeDScreen`. `lib/screen-steps.test.ts` passes: SUMMARY's Next goes to `/design/3d`, 3D has Back only and never wraps. `screen-tiles.tsx`, `phone-menu.tsx`, `step-nav.tsx` and `three-d-tile-art.ts` all say seven. The 4+3 upright and one-row sideways layouts are proven by browser specs (not re-run). Three stale "six screens" comments remain (see Anti-Patterns, info only). |
| R2 | One surface with the litres | VERIFIED | `board-surface.ts` builds only from `boardSections` (volume.ts), and a source test enforces that. `three-d-screen.tsx` and `design-store.tsx` both feed it through `designCrossSectionInput`. 74-board and 102-board tests: watertight, consistently wound, no zero-area triangle, (mesh minus litres)/litres in (-0.15%, 0]. Swallow: no triangle crosses the notch. Diamond: V is foam. All pass (16 files, 2,720 tests, run by me). |
| R3 | Realistic foam under shaping-room lights | VERIFIED (superseded in detail) | `board-scene.ts`: matte `MeshStandardMaterial` (roughness 0.92), stringer ribbons on deck and bottom, strip lights under the shelves, fixed in the room while the board turns. D-43/D-45 replaced R3's "two lights plus soft overhead" with the drawn bay. D-47 replaced "white in every theme" with a theme-coloured room. The foam itself stays near-white in every theme (`--surf-foam` is #fff or #f2f4f7). Live picture `16-13-live-computer.png` shows it. |
| R4 | Spin, zoom and slide | VERIFIED (superseded in detail) | Handlers for pointer drag, native wheel, two-finger pinch, Safari gesture events, right-drag slide, double-click to 1x, and keys (arrows, Shift-arrows, +, -, 0, Home) are all in `three-d-screen.tsx`. Reduced motion is read through `useReducedMotion`. D-44/D-45 reworked the views: Turn the Board and Walk Around, Nose and Tail turn the board end for end, Side works in Walk Around only, and there are raise, rotate and look-down-the-rail sliders. The 16-REVIEW findings WR-01 and WR-02 (a quick second press, the Room's settle) are fixed and have specs 8c, 8d, 8e and 15b. |
| R5 | Fins and the blank as switches | VERIFIED (superseded in detail) | `three-d-show-buttons.tsx`: Fins on by default, Blank off and dimmed with its reason when `hasBlank` is false. D-35 moved them from panel switches to corner icons. `fin-outline.ts` has generic outlines per role (D-36 amended the figures), tested by `fin-outline.test.ts` and `phase16-fin-pin.test.ts` (both pass). |
| R6 | Contour Stripes | VERIFIED | The `look` state defaults to `"shaded"`, so stripes are off. `board-scene.ts` has the stripe `ShaderMaterial` (`stripeSlopeInForce`, `STRIPE_PAIR_SLOPE_DEG`). The icon is `ContourStripesIcon`. |
| R7 | Export for CNC | VERIFIED (name and caption superseded) | `lib/export/cnc-files.ts` builds one zip: an R12 DXF (layers OUTLINE, PROFILE-DECK, PROFILE-BOTTOM, SLICES), a binary STL, an outline text file, a profile text file and one text file per slice. It reads the surface and the board name only, so no fins and no blank. `export-cnc.ts` is synchronous inside the tap, with no `three` import. The button is `data-lock-exempt` and dimmed only when the board can't be built. `e2e/three-d-export.spec.ts` covers a stubbed-null `getContext`, signed out. The live check downloaded a 5.25 MB zip. The button now reads "Export 3D Files" with the "experimental" note (supersedes D-15 and D-23 wording). |
| R8 | The files are what Shape3D takes | HUMAN (open) | The writers' forms, axes and units are proven by round-trip readers (`formats.test.ts`, `cnc-files.test.ts`, 100% pass). Slice points are mesh vertices. Whether Shape3D opens them is unproven (see Human Verification). |
| R9 | Hard Edge Ends At | VERIFIED (superseded in detail) | D-30 and D-32 amended it: two sliders, Tail Rail Blends From (12"-30") and Tail Rail Ends At (default L/6+18"), always shown on the tail rail and also on the 3D panel's Rail Blend Controls. They are stored as optional forgiving fields in `RailBandSpec` (version stays 5). `rail-controls.tsx` and `design-store.tsx` reset both in one undo. `rail-bands.test.ts`, `design-snapshot.test.ts` (parser leaves absent fields absent), `volume.test.ts` and the pinned litres fixtures pass. `phase14-preset-figures.json` is regenerated. |
| R10 | What the screen says and shows | VERIFIED (words superseded in places) | All three canvas messages, the loading picture, the four themes and the phone layout are in `three-d-screen.tsx`, `three-d-copy.ts` and `three-d-tile-art.ts`, and are covered by `e2e/three-d-screen.spec.ts` (tests 3 to 7, 10 to 12). Founder confirmed on iPhone and iPad. |
| R11 | Nothing stored, nothing announced | VERIFIED | `git diff 43bd948a 1c6dc5ef -- drizzle lib/db app/api` is empty. `components/3d` has no `localStorage`, `sessionStorage` or `fetch`. Switches and views are React state and refs. No notice text was added. |
| R12 | Shown before it ships | VERIFIED (process) | The phase's `pictures/` folder holds a before/after set for every wave, and 16-13-SUMMARY records the founder's "push all". The push was 2026-11-06 22:14, after the gate. |

**Score:** 11/12 verified in code, 1 open for human acceptance (R8). 0 failed. 0 behavior-unverified.

Behavior-dependent truths (R4's quick-second-press landing, the Room settle): named specs exist (`three-d-bay.spec.ts` 8c, 8d, 8e, 15b). I did not run Playwright, as instructed. Their passing is recorded in the final gate in 16-13-SUMMARY (1620 passed, the 9 failures traced to a stale test and load timeouts and all re-run green). The shipped code is identical to the gated tip apart from test and doc files.

### Superseded, not gaps

| Original wording | Later ruling | Where it now stands |
|---|---|---|
| R3 "white in every theme"; D-43 "same colours in every theme" | D-47 and quick 261106-ni6: the room takes the theme's accent hue, and the Room icon has three steps (theme, blue, none) | `three-d-show-buttons.tsx`, `three-d-copy.ts` `roomTip`, e2e 10, 10b, 10c |
| R4 views: Deck, Bottom, Side, Nose, Tail | D-44/D-45: Turn the Board and Walk Around, Look Down the Rail | `three-d-controls.tsx`, `view-3d.ts`, `shaping-bay.ts` |
| R5 panel switches | D-35: corner icons | `three-d-show-buttons.tsx` |
| R7 "Export for CNC..." and the note naming Shape3D | "Export 3D Files" and "This export is experimental: Shape3D may or may not be able to import these files yet." | `three-d-copy.ts` |
| R9 "14" to 24", default 18", only while Hard Edge on" | D-30 and D-32: two sliders, the whole rail character, always on the tail | `rail-bands.ts`, `rail-controls.tsx` |

### Required Artifacts

| Artifact | Status | Details |
|---|---|---|
| `app/design/3d/page.tsx`, `components/3d/*` (8 files) | VERIFIED | Substantive and wired. `three` is imported only in `board-scene.ts`, reached through `import("./board-scene")` (`three-source.test.ts` passes). `package.json` pins `three` 0.186.1 and `@types/three` 0.186.0. |
| `lib/export/{cnc-files,dxf,stl,xyz,zip}.ts` | VERIFIED | Pure, with no React, WebGL or 25.4 (`formats.test.ts` guard passes). |
| `lib/geometry/{board-surface,board-surface-render,view-3d,shaping-bay,fin-outline,blank-ghost,three-d-tile-art}.ts` | VERIFIED | Pure, tested, no browser imports and no `25.4` outside `units.ts` (grep clean). |
| Pinned fixtures `phase16-*-pin.json`, `phase14-preset-figures.json` | VERIFIED | Pin tests pass. |

### Key Links

| From | To | Status |
|---|---|---|
| `three-d-screen.tsx` | `designCrossSectionInput` (the helper `summarizeDesign` uses) then `buildBoardSurface` then `boardSections` | WIRED (the litres and the surface share one section source) |
| `three-d-screen.tsx` `onExport` | `exportForCnc` then `cncZip` then `cncFiles` | WIRED (built from the same `surface` that is drawn) |
| `three-d-screen.tsx` | `board-scene.ts` | WIRED, dynamic `import()` only |
| `site-nav.tsx` `NAV_LINKS` | desktop row, phone tiles, Back and Next | WIRED, one list |
| RAILS Tail Rail sliders | `design-store` `rails.tailHardEdge*` | `volume.ts` `boardSections` | 3D panel's Rail Blend Controls | WIRED, one stored value |

### Data-Flow Trace (Level 4)

The 3D board's data comes from the live design store (`outlineGeometry`, `sideProfile`, `effectiveRails`) through the litres' own section builder. It is not static or mocked. The live site, signed out, reached `ready` on the Shortboard and the zip downloaded (16-13 live checks, `16-13-live-computer.png` read by me).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Surface, export, view, bay, fin, pins and volume suites | `npx vitest run` on 16 files (lib/export, components/3d, board-surface, board-surface-render, view-3d, fin-outline, shaping-bay, four phase16 pins, three-d-tile-art, screen-steps, finished-rail, volume) | 16 files, 2,720 tests passed | PASS |
| Hard-edge fields, reports, units, screen tiles | `npx vitest run` on 8 files (design-snapshot, rail-bands, rail-character-report, surface-report, hard-edge-report, units-isolation, units, screen-tiles) | 8 files, 581 tests passed | PASS |
| No DB or API change in go-live 2 | `git diff --name-only 43bd948a 1c6dc5ef -- drizzle lib/db app/api` | empty | PASS |
| No scratch scripts under `.planning` | `git ls-files .planning \| grep -E '\.(ts\|js\|cjs\|mjs)$'` | empty | PASS |
| Debt markers (TBD, FIXME, XXX, TODO, HACK) in 113 code files changed by go-live 2 | grep | none | PASS |

Playwright and the full unit suite were not run (the gate is in 16-13-SUMMARY).

### Probe Execution

SKIPPED: the phase declares no probe scripts.

### Requirements Coverage

Every R1 to R12 appears in at least one PLAN's `requirements` (the plans from 16-15 on carry no frontmatter requirement list, but they deliver D-32 to D-47 amendments to R2 to R10). All 12 map to 16-SPEC.md. There are no orphans. This project has no `.planning/REQUIREMENTS.md`.

Plan 16-13's `requirements-completed` lists R7, R9, R11 and R12. R8 is correctly absent. R1 to R6 and R10 are recorded as completed in their own plans.

### Prohibitions (ADR-550)

| Prohibition | Tier | Result |
|---|---|---|
| Surface must not compute its own sections | test | VERIFIED: `board-surface.test.ts` "never makes a section of its own" passes |
| `three` not imported outside `board-scene.ts`, never in `lib/` | test | VERIFIED: `three-source.test.ts` passes |
| Writers need no WebGL | test | VERIFIED: `formats.test.ts` guard; `export-cnc.ts` imports no scene |
| Files hold no fins or blank | test | VERIFIED: `cncFiles` takes the surface and name only; STL triangle count equals the mesh |
| No `25.4` outside `units.ts` | test | VERIFIED: grep clean across new files |
| Opening a saved board must not write `tailHardEdge*` | test | VERIFIED: `design-snapshot.test.ts` passes |
| No database or migration change | test | VERIFIED by my one-off diff (empty); there is no standing automated test, so a reviewer may want the diff kept as a gate step |
| No scratch scripts in repo | test | VERIFIED by my one-off `git ls-files` check |
| No push, deploy or migrate without the founder's go (C8) | judgment | NON-AUTHORITATIVE PASS, **unverified-prohibition: human review recommended**. 16-13-SUMMARY records "push all" at about 19:20 and the push at 22:14, after the gate. I cannot independently confirm the conversation. |
| MUST NOT ship files Shape3D refuses (16-13, D-14 costly) | judgment | **unverified-prohibition: human review recommended.** The files were shipped without ever being opened in Shape3D, on the founder's explicit decision. Plan 16-13 allows "his explicit decision to ship with what it showed"; here nothing was shown. See R8. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `components/outline/outline-editor.tsx` | 31 | comment says "six screens" | Info | none |
| `components/design/phone-undo-bar.tsx` | 41 | comment says "all six screens" (historical measurement) | Info | none |
| `e2e/board-lock-screens.spec.ts` | 20, 568 | says "all six design screens" | Info | the spec's own x-3d case covers 3D separately |
| `lib/geometry/view-3d.ts` | 157, 163 | `quatConjugate`, `VIEW_NAMES` unused by app code (`VIEW_NAMES` is used by e2e) | Info | dead code (IN-06) |
| `lib/geometry/shaping-bay.ts` | 740 | `railSightDeg` unused | Info | dead code (IN-06) |
| `components/3d/three-d-copy.ts` | 15, 69 | `tileLine`, `exportWorking` unused | Info | dead copy (IN-06) |

No blockers and no unreferenced debt markers.

### Deferred code-review items (IN-02, IN-05, IN-06): do any touch the goal?

None affects the goal.

- **IN-02** (a crafted file's absurd figures pass `buildBoardSurface`, giving a non-manifold mesh or huge coordinates): only a hand-crafted board file can reach it. The 600-random-board and 500-crafted-file sweeps in 16-REVIEW found no crash or hang, and the worst outcome was the quiet "can't be drawn" message. No slider or real board reaches it. 16-REVIEW-FIX also notes a diamond tail at zero tip thickness still throws inside `resampleRun`. It lands on the same quiet message and is the same class.
- **IN-05** (fin placement arithmetic lives in `board-scene.ts`, outside unit-test reach): a Rule 1 purity debt. The reviewer traced `finSolid` by hand and found it correct. Fin outlines and bases are unit-tested (`fin-outline.ts`, `phase16-fin-pin.test.ts`), and fins never enter the files.
- **IN-06** (dead code, a stale comment): no effect on a board or a file.

The other review findings (WR-01 to WR-04, IN-01, IN-03, IN-04) are fixed in `16-REVIEW-FIX.md`. I confirmed in code that IN-03's `boardFileOutlineLoop` is in use by `cnc-files.ts`, and that the D-46 left/right outline match is covered by the "outline's two sides" test (passes).

### Human Verification Required

#### 1. Shape3D opens the export (R8)

**Test:** In Shape3D's trial, run research section C's acceptance test on a board's zip: Scan import, Data format BOARD, the `.dxf` (tail at x = 0, deck up, millimetres, automatic adjustment); then one slice file as a Slice, the outline file as an Outline, and the `.stl` as a scan. If the DXF's mixed layers confuse slice detection, try the SLICES layer alone.
**Expected:** Each file is accepted and read in the right place and size.
**Why human:** Third-party program, trial licence. The founder shipped on 2026-11-06 without this test and will return to it. The Export button's caption tells shapers the export is experimental. The files' layout is a published contract (D-14, "costly"), so if Shape3D refuses or misreads anything, the files will need a gap plan and shapers who already exported will hold the old generation.

#### 2. Mac Safari trackpad pinch

**Test:** On a Mac in Safari, open `/design/3d` and pinch on the trackpad over the drawing.
**Expected:** The board zooms toward the pinch and the page doesn't zoom.
**Why human:** Asked for in 16-13 and not reported. Real Safari only.

#### 3. One of the founder's own saved boards, live

**Test:** Signed in, open one of the 30 saved boards and visit 3D.
**Expected:** A closed solid draws. The litres on VOLUME match the new figure from the surface report in 16-13-SUMMARY.
**Why human:** Needs the founder's account and production data. Asked for and not reported.

### Gaps Summary

There are no code gaps. Every requirement R1 to R12 is implemented, wired and covered by passing unit tests (3,301 across the two batches I ran). The browser specs, run in the final gate, cover the screen-level behaviour. All of the founder's later rulings (D-30 to D-47) are in the code, so the SPEC's original wording of R3, R4, R5, R7 and R9 is superseded, not unmet.

What remains is acceptance, not construction. R8 is the only requirement the phase cannot call satisfied: the files have never been opened in Shape3D. The founder chose to ship anyway, and the Export button says so plainly. Plan 16-13's wording ("his explicit decision to ship with what it showed") assumed a test had been run, so that clause was met only in its "explicit decision" half. Phase closure should record R8 as open, not completed. The Mac Safari pinch and a real saved board on the live site are the other two unchecked items.

---

_Verified: 2026-11-06_
_Verifier: Claude (gsd-verifier)_

## Close-out (the orchestrator, 2026-11-06)

The verifier returned human_needed. The status above was moved to passed at the founder's instruction to close the
phase. Two of the three hand items then passed by his hand: the Mac Safari pinch and one of his own saved boards on the
live 3D screen (the founder, 2026-11-06: "only the shape3D is still open.  the other 2 passed."). The third, R8, is the
one override in the frontmatter: not tested, accepted open by him and tracked in a todo. 11 of the 12 requirements are
verified in code. 16-UAT.md holds 3 passes and 1 skipped with its reason.
