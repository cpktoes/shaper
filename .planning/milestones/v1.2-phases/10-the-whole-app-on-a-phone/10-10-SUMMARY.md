---
phase: 10-the-whole-app-on-a-phone
plan: 10
subsystem: ui
tags: [tailwind, css, playwright, responsive, layout, gap-closure]

requires:
  - phase: 10-05
    provides: "the width-and-height layout switch this plan reverts, and the corrected real-hardware sideways widths (about 844 on an iPhone, about 863 on a Pixel 7) this plan keeps"
  - phase: 10-09
    provides: "the board card height cap, already moved off the layout axis onto the coarse pointer variant, so this plan's revert cannot reopen the zero-height card bug"
provides:
  - "app/globals.css's max-shell/shell custom variants, back to a single width test at 820px — D-10, the shaper's own decision"
  - "components/design/shell-variant.css.test.ts rewritten from a proof that the switch reads three axes into a guard that it reads one, plus a new case proving the Hide Toolbar tip's pointer-plus-iOS gate compiles to real nested at-rules"
  - "components/design/toolbar-tip.tsx's gate moved from the layout switch to the coarse pointer variant, so the tip is reachable on any touch device in the desktop shell (a phone held sideways, or a tablet) without depending on which layout a width selects"
  - "e2e/phone-layout.spec.ts's sideways-phone describe flipped to assert the desktop shell, plus a new standing test for the 819/820px boundary itself"
  - "e2e/viewer-toolbar.spec.ts, e2e/slider-touch.spec.ts, e2e/phone-layout.spec.ts's touch-tablet describes returned to real sideways-phone viewports (844x390 iPhone, 863x360 Pixel 7) instead of tablets"
  - "CLAUDE.md's Layout section rewritten to describe three switches that exist: width (820px) picks the layout, pointer picks the sizing, height (FINS only) picks beside-or-beneath"
affects: [phone-layout, responsive-shell, toolbar-tip, card-thumbnail, rail-band-editor]

actuals:
  tokens: 16400
  tasks: 3
  commits: 8

tech-stack:
  added: []
  patterns:
    - "A layout switch reverted from a multi-axis @custom-variant back to a single-condition one, keeping the explicit two-block form (not a --breakpoint-shell theme token) specifically so the compiled-CSS guard test can keep existing and keep failing loudly if the decision is ever quietly reversed a third time"
    - "A sizing/visibility gate (the Hide Toolbar tip) moved from the layout variant to the pointer variant so it survives a later change to which layout a given width selects — the same pattern 10-09 already applied to the board card's height cap, now applied to a second call site"

key-files:
  created: []
  modified:
    - app/globals.css
    - components/design/shell-variant.css.test.ts
    - components/design/toolbar-tip.tsx
    - components/design/toolbar-tip.test.ts
    - components/design/use-viewer-media.ts
    - components/design/design-screen-shell.tsx
    - components/rails/view-full-sized-dialog.css.test.ts
    - e2e/phone-layout.spec.ts
    - e2e/phone-toolbar-tip.spec.ts
    - e2e/viewer-toolbar.spec.ts
    - e2e/slider-touch.spec.ts
    - e2e/phone-fins-landscape.spec.ts
    - CLAUDE.md

key-decisions:
  - "D-10 is the shaper's own decision (10-SWEEP-2.md, 2026-09-11), not re-litigated here: a phone held sideways goes back to being a normal browser. The layout switch (app/globals.css's max-shell/shell custom variants) is width < 820px OR width >= 820px, full stop — no pointer or height term in either condition any more."
  - "The Hide Toolbar tip's outer gate moved from the max-shell layout variant to the coarse pointer variant, keeping the iOS feature-detection variant and the tip's own sentence byte-identical. This is what makes the tip reachable on an iPhone in both orientations without depending on which layout a width selects — the exact fix the tip needed and never got from 10-05's width-and-height version."
  - "Kept the two layout variants as explicit @custom-variant blocks rather than restoring the pre-10-05 --breakpoint-shell theme token, so the compiled-CSS guard test can keep existing (and keep failing loudly) if this decision is ever reversed a third time."
  - "The three sideways-phone test beds 10-05 moved onto touch tablets (iPad Mini landscape, Galaxy Tab S9 landscape) came home to real phone widths (844x390 hand-set on the iPhone 14 landscape descriptor's other properties; 863x360 from Playwright's own Pixel 7 landscape descriptor, which already matches real hardware) rather than staying on tablets, since a sideways phone is the case that now needs proving again."
  - "Fixed a pre-existing WebKit-only dev-server flake in e2e/phone-toolbar-tip.spec.ts's dismissal test (Rule 1): a hard page.goto to a second design route raced a background Fast Refresh full reload right after the first route's paint. Replaced with a client-side nav via the bottom tab bar, the same fix pattern 10-05 already established for an equivalent race in phone-layout.spec.ts."

patterns-established:
  - "When a layout-axis gate needs to survive future changes to the layout switch itself, move it to the pointer variant instead — established by 10-09 for the board card's height cap, now applied a second time to the Hide Toolbar tip."

requirements-completed: [PHON-10]

coverage:
  - id: D1
    description: "The layout switch reads width alone again: max-shell fires on width < 820px, shell fires on width >= 820px, and the two are strict complements so exactly one applies at every width including the boundary."
    requirement: PHON-10
    verification:
      - kind: unit
        ref: "components/design/shell-variant.css.test.ts#max-shell: emits exactly one rule, at a width condition under 820, with no pointer-type term and no height term"
        status: pass
      - kind: unit
        ref: "components/design/shell-variant.css.test.ts#shell: emits exactly one rule, at a width condition of 820 or more, with no negation keyword"
        status: pass
      - kind: unit
        ref: "components/design/shell-variant.css.test.ts#the two conditions partition at 820: max-shell is strictly under it, shell is at or over it, so the boundary belongs to exactly one side"
        status: pass
      - kind: e2e
        ref: "e2e/phone-layout.spec.ts#819px wide renders the phone stack, 820px wide renders the desktop shell (desktop project, mouse pointer)"
        status: pass
      - kind: e2e
        ref: "e2e/phone-layout.spec.ts#at 863 x 360 (a real Pixel 7 turned sideways) the desktop shell renders... (android project)"
        status: pass
      - kind: e2e
        ref: "e2e/phone-layout.spec.ts#the rotate button is gone on both TEMPLATE and ROCKER, with the desktop shell rendering (iphone project, real 844x390 sideways viewport)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The Hide Toolbar tip is reachable on any touch device in the desktop shell (a phone held sideways, or a tablet) because its gate is now the coarse pointer variant instead of the layout switch, with the tip's own sentence byte-identical."
    requirement: PHON-10
    verification:
      - kind: unit
        ref: "components/design/toolbar-tip.test.ts#carries the combined pointer+iOS variant, in order, on the same class as the hidden base"
        status: pass
      - kind: unit
        ref: "components/design/shell-variant.css.test.ts#the Hide Toolbar tip's own class compiles to a pointer-plus-iOS gate with no width condition anywhere"
        status: pass
      - kind: e2e
        ref: "e2e/phone-toolbar-tip.spec.ts#the tip stays attached both upright and sideways at a real iPhone width (844x390)"
        status: pass
    human_judgment: true
    rationale: "Whether the tip actually PAINTS on a real iPhone (upright and sideways) depends on iOS Safari's own -webkit-touch-callout feature detection, which Playwright's WebKit does not implement (documented in e2e/phone-toolbar-tip.spec.ts's own header, confirmed by a real webkit.launch() probe at planning time). No test in this repo can prove the tip painted; plan 10-08's re-sweep settles it on real hardware. This plan's own job — making the tip reachable regardless of orientation or which shell renders — is fully proven above."
  - id: D3
    description: "The three sideways-phone test beds 10-05 moved onto touch tablets are returned to real phone viewports (844x390 iPhone, 863x360 Pixel 7), keeping every original assertion, and the one file needing Chromium's real-touch CDP session stays on it."
    verification:
      - kind: e2e
        ref: "e2e/viewer-toolbar.spec.ts, e2e/slider-touch.spec.ts Case B, e2e/phone-layout.spec.ts's iPhone-sideways describe — full run, all three projects"
        status: pass
    human_judgment: false
  - id: D4
    description: "CLAUDE.md and three doc comments (use-viewer-media.ts, design-screen-shell.tsx, view-full-sized-dialog.css.test.ts) describe the width-only switch that exists, not the withdrawn width-and-height rule."
    verification:
      - kind: other
        ref: "git diff of each file shows only doc-comment changes in the three source files; CLAUDE.md's Layout section rewritten in full"
        status: pass
    human_judgment: false
  - id: D5
    description: "Nothing a desktop mouse sees changed: the desktop screenshot baselines pass without being re-recorded, and the full three-project Playwright suite is green."
    verification:
      - kind: e2e
        ref: "e2e/desktop-baseline.spec.ts (part of the full suite run below); git status on e2e/*-snapshots/ shows no changes"
        status: pass
    human_judgment: false

duration: 60min (including a required 17.9-minute full three-project Playwright run)
completed: 2026-09-11
status: complete
---

# Phase 10 Plan 10: A Phone Held Sideways Goes Back to Being a Normal Browser Summary

**D-10 reverts the layout switch to width alone (820px, one question again), and moves the Hide Toolbar tip's gate off that switch entirely onto the touch-pointer variant, so it finally appears on an iPhone whichever way it's held.**

## Performance

- **Duration:** ~60 min, including a required 17.9-minute full three-project Playwright run
- **Tasks:** 3 of 3
- **Files modified:** 13 (0 created, 13 modified)

## Accomplishments

- **The layout switch asks one question again.** `app/globals.css`'s `max-shell`/`shell` custom
  variants are back to `width < 820px` and `width >= 820px` — the width-and-height rule 10-05 tried
  (width OR a coarse-pointer-and-short-height pair) is fully withdrawn. This is the shaper's own
  call (D-10, 10-SWEEP-2.md, 2026-09-11), holding a real phone sideways: *"horizontal is useless, as
  there are no controls other than the drag. It was honestly better when it was treated as a normal
  browser rather than a phone."* Kept as two explicit `@custom-variant` blocks (not restored to a
  single `--breakpoint-shell` theme token) so the compiled-CSS guard can keep failing loudly if this
  decision is ever quietly reversed a third time.
- **A phone held sideways gets the desktop shell again** — controls beside the board, proved in a
  real browser at 863x360 (a real Pixel 7 turned sideways, android project) and at a hand-set real
  844x390 iPhone viewport (iphone project, WebKit). At exactly 820px the desktop side owns the
  boundary by declaration, proved both in the compiled CSS (a strict `<` on the phone side, a
  `>=` on the desktop side) and in a real browser (a new standing test at 819/820px, run on the
  desktop project since the boundary no longer depends on pointer type at all).
- **The Hide Toolbar tip stopped depending on the layout switch entirely.** Its gate moved from
  `max-shell:` to `coarse:`, keeping the iOS feature-detection variant in the same order and the
  tip's own sentence byte-identical (`git diff` confirms only the class string and the doc comment
  changed). This is the one thing 10-05 was built to fix and never delivered — the tip is now
  reachable on any touch device inside the desktop shell, a phone held sideways or a tablet, exactly
  when the extra height is most wanted.
- **The three sideways-phone test beds 10-05 moved onto touch tablets came home to real phones.**
  `e2e/viewer-toolbar.spec.ts` and the touch-tablet describe in `e2e/phone-layout.spec.ts` now use a
  hand-set 844x390 viewport on top of the `iPhone 14 landscape` descriptor's other properties (touch,
  scale factor), since Playwright's own landscape descriptor reports a stale 750x340. `e2e/slider-touch.spec.ts`
  Case B moved from `Galaxy Tab S9 landscape` to `Pixel 7 landscape` (863x360) — the real Android
  sideways width that also happens to run on Chromium, which its real-finger CDP touch dispatch
  requires.
- **The FINS short-screen key-placement rule was re-measured and is unmoved.** `e2e/phone-fins-landscape.spec.ts`'s
  plot-to-viewer ratio at 863x360 is 1.000, identical to every prior recording (before 10-05, during
  10-05, and now after D-10) — confirming, a third time, that this rule was never driven by the
  layout switch. Its header now explains all three shell rules this one viewport has lived under.
- **The project's own notes describe the app that exists.** CLAUDE.md's Layout section, and three
  other doc comments, no longer describe the withdrawn width-and-height rule. CLAUDE.md keeps the
  corrected real-hardware widths (about 844 on an iPhone, about 863 on a Pixel 7) and records the
  two things that moved off this switch entirely: the board card's height cap (10-09) and the Hide
  Toolbar tip (this plan).

## Task Commits

1. **Task 1: The switch asks one question again — how wide is the screen**
   - `8881c02` (test) — RED: the compiled-CSS guard and the flipped browser test, failing against
     today's width-and-height switch
   - `f24c489` (feat) — GREEN: the CSS fix, back to a single width condition per variant
2. **Task 2: The Hide Toolbar tip finds the place it actually belongs**
   - `b3ce899` (test) — RED: the source-contract test and a new compiled-CSS case, expecting the
     pointer variant instead of the layout variant
   - `4709563` (feat) — GREEN: the tip's class moved to `coarse:`, doc comment rewritten, sentence
     untouched
   - `b8158a4` (test) — the e2e suite updated to reflect the pointer gate, plus a fix for a
     pre-existing WebKit dev-server flake (Rule 1)
3. **Task 3: The tests come home to a sideways phone, and every note says what is true**
   - `addf3f1` (test) — the three re-pointed test beds returned to real phone viewports
   - `6c2e24c` (docs) — three doc comments corrected (assertions untouched)
   - `7a0766b` (docs) — CLAUDE.md's Layout section rewritten in full

## Files Modified

- `app/globals.css` — `max-shell`/`shell` back to one width condition each; comment rewritten
- `components/design/shell-variant.css.test.ts` — rewritten from a three-axis proof to a
  one-axis guard, plus a new case for the tip's own compiled class
- `components/design/toolbar-tip.tsx` — gate moved to `coarse:`; sentence untouched
- `components/design/toolbar-tip.test.ts` — variant assertion now names the pointer variant
- `components/design/use-viewer-media.ts` — doc comment corrected
- `components/design/design-screen-shell.tsx` — doc comment corrected
- `components/rails/view-full-sized-dialog.css.test.ts` — comment corrected; assertion untouched
- `e2e/phone-layout.spec.ts` — sideways describe flipped; touch-tablet describe returned to a real
  iPhone; new 819/820px boundary test
- `e2e/phone-toolbar-tip.spec.ts` — header and desktop-guard comment updated; new both-orientations
  attachment case; dismissal-test flake fixed
- `e2e/viewer-toolbar.spec.ts` — touch-tablet describe returned to a real iPhone
- `e2e/slider-touch.spec.ts` — Case B returned to a real Pixel 7 (Chromium)
- `e2e/phone-fins-landscape.spec.ts` — header corrected; ratio re-measured
- `CLAUDE.md` — Layout section rewritten

## Call-Site Count (Task 1 acceptance criterion)

Measured with a comment-stripping script (the same technique `toolbar-tip.test.ts` already uses),
so a doc comment mentioning `max-shell:` by way of explanation is never miscounted as a real call
site — `grep`'s raw text search over-counted by 25 sites for exactly this reason:

| | Before any edit in this plan | After Task 1 alone (before Task 2) | After all three tasks |
|---|---|---|---|
| `max-shell:` (excluding `app/globals.css` and its guard test) | 90 | 90 | 89 |
| bare `shell:` (excluding `app/globals.css` and its guard test) | 0 | 0 | 0 |

Task 1 (the switch's own definition) touched **zero** call sites, as required — 90 before, 90 after.
The single point drop to 89 is Task 2's own deliberate, documented change: `toolbar-tip.tsx`'s class
moved from `max-shell:…` to `coarse:…`, exactly one call site, exactly as that task intends. Command
used: a Node script under `app/`, `components/`, `e2e/`, `lib/` that strips `//` and `/* */` comments
per file, then counts `\bmax-shell:\b` and `(?<!max-)\bshell:\b` occurrences in the remaining text.

## Compiled-CSS Emitted Conditions (verbatim)

- `max-shell:hidden` → `@media (width < 820px) { .max-shell\:hidden { display: none; } }`
- `shell:flex` → `@media (width >= 820px) { .shell\:flex { display: flex; } }`
- the Hide Toolbar tip's own class (`coarse:supports-[-webkit-touch-callout:none]:flex`) →
  `@media (pointer: coarse) { @supports (-webkit-touch-callout:none) { .coarse\:supports-\[-webkit-touch-callout\:none\]\:flex { display: flex; } } }`

## Non-Vacuity Results (Task 1 and Task 2 acceptance criteria)

- **Task 1:** `app/globals.css`'s diff captured as a patch, file reverted with `git checkout --`,
  `shell-variant.css.test.ts` re-run — 2 of 4 cases failed (the negation and pointer/height-term
  checks). Patch re-applied — all 4 passed.
- **Task 2:** the tip's own compiled-CSS case temporarily built against `max-shell:supports-[...]:flex`
  instead of `coarse:supports-[...]:flex` — failed (no coarse-pointer condition found). Restored —
  passed.

## FINS Plot Ratio Re-Measurement (Task 3 acceptance criterion)

| | Recorded pre-10-05 | Recorded during 10-05 | Re-measured after D-10 (this run) |
|---|---|---|---|
| Plot-to-viewer height ratio at 863x360 | 1.000 | 1.000 | 1.000 |

Identical across all three versions of the layout switch this viewport has lived under — the ratio
was never driven by the shell switch. The asserted bound (`>= 0.95`) is unchanged.

## CLAUDE.md's Rewritten Layout Section (in full)

> Three switches live in `app/globals.css` and `components/fins/fin-viewer.tsx`, and each answers a
> different question about the screen — never conflated with either of the others.
>
> **Layout — width alone.** The `max-shell`/`shell` custom variants in `app/globals.css` decide
> which LAYOUT a screen renders: stacked-and-pinned (drawing above, controls scrolling beneath, a
> compact top bar and a six-tab bottom bar) below 820 dots wide, the desktop sidebar-beside-canvas
> shell at or above it. At exactly 820 the desktop side owns the boundary, by declaration rather
> than by source order. For one wave (10-05, 2026-09-11 to 2026-09-11) this switch read width AND
> height together, because a real iPhone held sideways — about 844 dots wide, a real Pixel 7 about
> 863, both over 820 — had been losing its own layout at the exact moment its screen got shortest.
> That fix was tried and withdrawn the same day: walking a real phone sideways, the shaper's own
> verdict was blunt — *"horizontal is useless, as there are no controls other than the drag. It was
> honestly better when it was treated as a normal browser rather than a phone"* (D-10, 10-SWEEP-2.md).
> The desktop shell needs 820 dots because that is 340 dots of controls beside a 480-dot drawing, and
> a phone on its side, at 844-863 real dots, fits — controls beside the board beats a half-height
> drawing stacked over controls with almost nothing left under them. So the switch reads width alone
> again, and a phone held sideways gets the desktop shell, same as a touch laptop at 1280px or an
> iPad held sideways. A narrow desktop browser window keeps the stacked layout by width alone, same
> as always — width is the one question, on any device. (An earlier version of this section quoted
> 750 dots for a sideways iPhone — that number came from a test tool's emulated device, never from
> real hardware. The corrected figures above, about 844 on an iPhone and about 863 on a Pixel 7, are
> measured, not emulated, and they survive this revert: what changed is the conclusion drawn from
> them, not the numbers themselves.)
>
> Two things that used to ride on this switch no longer do, on purpose: the setup screen's board-card
> height cap and the Hide Toolbar tip both read the `coarse` pointer variant below instead, because
> how big a picture draws and whether a browser has a toolbar worth hiding are both questions about
> the device in hand, not about which layout a width selects. That is what lets both keep working
> correctly on either side of this switch, including through the one wave it briefly read height too.
>
> **Control size (and the Rotate button's presence) — pointer alone.** The `coarse` pointer variant
> decides how BIG a control draws, on any width a touch device happens to be, and, for the viewer's
> Rotate button alone, whether it draws at all — since turning a touch device already turns the
> board. Pointer never decides a LAYOUT; the layout switch above reads width alone, and this variant
> is never reached for to move one.
>
> **Beside or beneath (FINS only) — height alone.** How SHORT the screen is decides whether, on
> FINS, the Base Length key sits beside the tail drawing or beneath it — written inline in
> `fin-viewer.tsx` as `[@media(max-height:500px)]` rather than a named variant, since it has exactly
> one consumer today, and deliberately not tied to width or to the layout switch above: a phone held
> sideways is short regardless of which layout it lands in.
>
> Width picks the layout, pointer picks the sizing, height (FINS only) picks beside-or-beneath — and
> none of the three is ever conflated with another.

## What the Re-Sweep (Plan 10-08) Now Has to Answer About the Tip

The tip's reachability no longer depends on which phone the last walk was on. After this plan:

- **On an iPhone, upright and sideways:** the tip must appear (once, dismissible permanently) —
  the `coarse` pointer condition is satisfied on any iPhone viewport, and the iOS feature-support
  guard is satisfied by real iOS Safari (confirmed unreachable in every Playwright project by a
  direct `webkit.launch()` probe, documented in `e2e/phone-toolbar-tip.spec.ts`'s own header).
- **On an Android phone, upright and sideways:** the tip must still NOT appear — it is gated on the
  iOS-only `-webkit-touch-callout` feature test, which Android's WebView/Chrome does not implement.
  This has always been correct and is unrelated to the layout question this plan changed.

The re-sweep can score both rows without first knowing which phone the earlier walk used to record
"I did not see the hide toolbar tip."

## Decisions Made

See `key-decisions` in the frontmatter above. In short: D-10 is implemented verbatim (width alone,
no re-litigation); the tip's gate moved to the pointer variant rather than being patched again on
the layout axis, following the same pattern 10-09 already established for the board card's height
cap; the two layout variants stayed explicit `@custom-variant` blocks rather than reverting all the
way to a `--breakpoint-shell` theme token, specifically to keep the compiled-CSS guard alive.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-existing WebKit-only dev-server flake in phone-toolbar-tip.spec.ts's dismissal test**
- **Found during:** Task 2's own verification run (`e2e/phone-toolbar-tip.spec.ts`, iphone project)
- **Issue:** A hard `page.goto("/design/rails")` — pre-existing code, byte-identical to before this
  plan (`git show ae9d40d` confirms) — occasionally raced a background Next.js "Fast Refresh had to
  perform a full reload" event right after the outline route's first paint, throwing "Navigation to
  ... is interrupted by another navigation". Reproduced consistently (3 of 3 attempts) on the iphone
  (WebKit) project, in this worktree's webpack dev server only.
- **Fix:** Replaced the hard `page.goto` with a client-side navigation via the bottom tab bar's own
  RAILS link — the same path a shaper actually uses, and the identical fix pattern 10-05 already
  established for an equivalent race in `e2e/phone-layout.spec.ts`. Same assertion, no change in
  what the test proves.
- **Files modified:** `e2e/phone-toolbar-tip.spec.ts`
- **Verification:** Re-ran 3 times after the fix; passed every time. Full run confirms 6 of 6
  running tests pass (9 correctly skipped by project scoping).
- **Committed in:** `b8158a4`

No other deviations. Every acceptance criterion in all three tasks was met and measured, not
assumed.

## Issues Encountered

- **A separate, non-deterministic instance of the same class of WebKit dev-server flake** was
  observed twice in `e2e/phone-layout.spec.ts`'s pre-existing "phone controls — every slider sits in
  its own section" test (unmodified by this plan) during standalone single-file runs — once it
  failed, once (on a fresh port) it passed cleanly. It did NOT reproduce in the final required full
  three-project suite run (219 passed, 0 failed). Since this test is outside this plan's
  `files_modified` and the failure is non-deterministic and environment-specific (a worktree running
  webpack instead of Turbopack, per this project's own `AGENTS.md`/`CLAUDE.md` notes), it was left
  unfixed per the deviation rules' scope boundary — only the one instance that reproduced 100% of
  the time, inside a file this plan already had open, was fixed.
- **Fresh worktree had no Next.js generated route types** (`LayoutProps<...>` undefined), the same
  tooling friction 10-05 and 10-09 both recorded. Resolved with `npx next typegen`. Not a plan
  deviation — no plan file was involved, and `.next/`/`next-env.d.ts` are both gitignored.

## Verification Run (this plan's own required checks)

- `npx tsc --noEmit` — exits 0.
- `npx vitest run` — 59 test files, 2463 passed, 2 skipped, 0 failed.
- `PW_PORT=3122 IS_WEBPACK_TEST=1 npx playwright test` (full suite, all three projects, required by
  the orchestrator's rulings) — **219 passed, 204 skipped (project scoping), 0 failed, 17.9 minutes.**
- Desktop screenshot baselines under `e2e/*-snapshots/` — untouched (`git status --short` on that
  path and on every `*.png` reports nothing); the full suite run above includes them and they pass
  without re-recording.
- `git diff --stat` against the wave's base commit confirms exactly the 13 files this plan's
  frontmatter names were touched — no more, no fewer.

## Next Phase Readiness

- No blockers. Every task's acceptance criteria is met and measured; the full suite is green across
  all three Playwright projects and the full Vitest suite.
- Plan 10-08's re-sweep can now score the Hide Toolbar tip on either phone without first knowing
  which phone the earlier walk used — see "What the Re-Sweep Now Has to Answer About the Tip" above.
- D-10 is implemented and closed. Gap 4 (the tip) is closed in the form the plan's own
  `<gaps_this_plan_closes>` section specified — by design, not by waiting on the open "which phone"
  question.

## Self-Check: PASSED

All 13 files listed in "Files Modified" confirmed present on disk. All 8 commit hashes (`8881c02`,
`f24c489`, `b3ce899`, `4709563`, `b8158a4`, `addf3f1`, `6c2e24c`, `7a0766b`) confirmed present in
`git log --oneline --all`. No missing items.

---
*Phase: 10-the-whole-app-on-a-phone*
*Completed: 2026-09-11*
