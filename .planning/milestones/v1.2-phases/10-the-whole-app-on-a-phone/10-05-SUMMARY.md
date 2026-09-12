---
phase: 10-the-whole-app-on-a-phone
plan: 05
subsystem: ui
tags: [tailwind, css, playwright, responsive, layout]

requires:
  - phase: 10-04
    provides: the real-device sweep finding that a phone held sideways renders the desktop shell
provides:
  - "app/globals.css's max-shell/shell custom variants, now width-and-height (not width alone) — a phone held sideways stays a phone"
  - "components/design/shell-variant.css.test.ts — compiled-CSS proof that both media conditions are emitted for max-shell and that shell carries the negation"
  - "e2e/phone-layout.spec.ts, e2e/viewer-toolbar.spec.ts, e2e/slider-touch.spec.ts re-pointed at a touch tablet viewport that genuinely still keeps the desktop shell"
  - "e2e/phone-fins-landscape.spec.ts's header corrected to stop attributing its subject to the shell switch"
  - "CLAUDE.md's Layout section rewritten around the real rule and real measured widths"
affects: [phone-layout, responsive-shell, toolbar-tip, card-thumbnail]

actuals:
  tokens: 11300
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A layout switch that reads width, height AND pointer together, written as a multi-condition @custom-variant rather than a single --breakpoint theme token, when one axis alone can no longer answer the question"
    - "Compiled-CSS contract tests (compile() from @tailwindcss/node) as the only way to prove a multi-branch @custom-variant emits the right media conditions — a broken variant compiles silently to nothing or to the wrong condition, with no build warning"

key-files:
  created:
    - components/design/shell-variant.css.test.ts
  modified:
    - app/globals.css
    - e2e/phone-layout.spec.ts
    - e2e/viewer-toolbar.spec.ts
    - e2e/slider-touch.spec.ts
    - e2e/phone-fins-landscape.spec.ts
    - e2e/phone-setup-landscape.spec.ts
    - CLAUDE.md
    - components/design/toolbar-tip.tsx
    - components/design/use-viewer-media.ts
    - components/design/design-screen-shell.tsx
    - components/rails/view-full-sized-dialog.css.test.ts

key-decisions:
  - "The layout switch is now width < 820px OR (a coarse pointer AND height < 500px) for the phone stack, and width >= 820px AND NOT that same pair for the desktop shell — the shaper's own decision from 10-SWEEP.md, implemented exactly as specified: purely additive, no existing behaviour changes, only a genuinely short touch screen is newly treated as a phone."
  - "e2e/slider-touch.spec.ts Case B is re-pointed at Galaxy Tab S9 landscape (1024 x 640, Chromium) rather than the iPad Mini landscape (WebKit) descriptor the sibling files use, because that file's real-finger touch dispatch only works via a CDP session, which only Playwright's Chromium exposes — the file's own header already documented this constraint."
  - "IS_WEBPACK_TEST=1 environment variable used to run Playwright's dev server in this worktree, since Turbopack cannot resolve next/package.json from inside a git worktree with its own copied lockfile — the same root cause the plan's own executor notes already flag for npm run build, now confirmed to affect next dev too. No config file was touched; the orchestrator's real build/e2e run on main uses Turbopack normally."

patterns-established:
  - "A multi-condition layout switch belongs in one @custom-variant block in app/globals.css, never derived from a single @theme breakpoint token, once the condition needs more than one axis (width, height, pointer)."

requirements-completed: [PHON-08, PHON-10]

coverage:
  - id: D1
    description: "The layout switch reads width AND height together: max-shell fires on width < 820px OR (coarse pointer AND height < 500px); shell fires on width >= 820px AND NOT that same pair, so the two partition and a phone held sideways stays a phone."
    requirement: PHON-10
    verification:
      - kind: unit
        ref: "components/design/shell-variant.css.test.ts#max-shell: emits both the under-820px width rule and the coarse-and-short-height rule, each carrying the candidate's own declaration"
        status: pass
      - kind: unit
        ref: "components/design/shell-variant.css.test.ts#shell: emits exactly one media rule combining width>=820px with a negation of the coarse-and-short pair"
        status: pass
      - kind: e2e
        ref: "e2e/phone-layout.spec.ts#at 863 x 360 the phone stack renders: the six-screen bottom bar and compact top bar show, the desktop link row is hidden, and the rotate button is gone"
        status: pass
      - kind: e2e
        ref: "e2e/phone-layout.spec.ts#touch tablet, sideways — the rotate button is gone on both TEMPLATE and ROCKER, even though the screen keeps the desktop layout"
        status: pass
    human_judgment: false
  - id: D2
    description: "The already-built Hide Toolbar tip becomes reachable on a phone held sideways, with no change to the tip itself or its wording — same gate, now width-and-height."
    requirement: PHON-08
    verification:
      - kind: other
        ref: "components/design/toolbar-tip.tsx's class string is byte-identical before and after this plan (git diff shows only its doc comment changed); its gate is the max-shell variant fixed in this plan"
        status: pass
    human_judgment: true
    rationale: "The tip's reachability sideways depends on iOS Safari's own -webkit-touch-callout support, which Playwright's WebKit cannot exercise (documented in e2e/phone-toolbar-tip.spec.ts's own header) — only a real iPhone held sideways can confirm the tip actually shows. Deferred to plan 10-08's real-device sweep."
  - id: D3
    description: "Four browser specs that borrowed a sideways-phone viewport as a stand-in for a touch screen wide enough for the desktop layout are re-pointed at a device that genuinely still carries that case, keeping every original assertion at least as strong."
    verification:
      - kind: e2e
        ref: "e2e/phone-layout.spec.ts, e2e/viewer-toolbar.spec.ts, e2e/slider-touch.spec.ts, e2e/phone-fins-landscape.spec.ts — full run, all three projects"
        status: pass
    human_judgment: false
  - id: D4
    description: "CLAUDE.md's Layout section and five doc comments (toolbar-tip.tsx, use-viewer-media.ts, design-screen-shell.tsx, view-full-sized-dialog.css.test.ts, phone-setup-landscape.spec.ts) describe the switch that actually exists, not the disproven width-only one."
    verification:
      - kind: other
        ref: "git diff of each file shows only doc-comment/header changes; no assertion or class string touched"
        status: pass
    human_judgment: false

duration: 52min
completed: 2026-09-11
status: complete
---

# Phase 10 Plan 05: A Phone Held Sideways Stays a Phone — Summary

**The app's "is this a phone" test stopped being one number (screen width) and became width-and-height together, so turning a phone on its side no longer hands it the desktop layout — closing the exact defect a real iPhone found on 2026-09-11.**

## Performance

- **Duration:** ~52 min
- **Tasks:** 3 of 3
- **Files modified:** 11 (1 created, 10 modified)

## Accomplishments

- **The switch is fixed in one place.** `app/globals.css`'s `max-shell`/`shell` custom variants are now explicit two-condition rules (`width < 820px` OR `coarse pointer AND height < 500px` for the phone stack; the negated pair for the desktop shell) instead of a single `--breakpoint-shell: 820px` theme token. 114 `max-shell:` call sites and 3 `shell:` call sites elsewhere in the app inherit the new rule with zero edits of their own — verified equal before and after this change (see "Call-site count" below).
- **A compiled-CSS proof exists for the switch itself.** `components/design/shell-variant.css.test.ts` runs the real `app/globals.css` through the app's own Tailwind pipeline and asserts on the emitted media conditions, so a broken variant (a dropped OR branch, a missing negation) fails loudly instead of compiling silently to the wrong thing.
- **A real browser proves it.** A new Playwright test asserts that at 863 x 360 (a Pixel 7 turned sideways) the app now renders the phone stack — the six-screen bottom bar, the compact top bar, the hidden desktop link row, and the gone rotate button — where it used to render the desktop shell.
- **Four tests that used to say "a phone on its side is a desktop" now say what's true.** Each is re-pointed at a genuinely tablet-sized touch screen (`iPad Mini landscape` for two files, `Galaxy Tab S9 landscape` for the one that needs real CDP touch dispatch), keeping every original assertion.
- **The project's own notes describe the app that exists.** CLAUDE.md's Layout section, and five other doc comments, no longer claim a phone held sideways stays a phone by virtue of width, and name the real measured widths (about 844 on an iPhone, 863 on a Pixel 7) instead of the disproven 750-dot emulator figure.

## Task Commits

1. **Task 1: A phone held sideways stays a phone — one switch, proved from the CSS to a real browser**
   - `4b94908` (test) — RED: the compiled-CSS proof, failing against the old width-only switch
   - `a15887d` (feat) — GREEN: the CSS fix plus the new browser test
2. **Task 2: Re-point the four sideways-phone tests at a screen where what they prove is still true** — `16976d5` (test)
3. **Task 3: Say what is true — the Layout notes, the tip's own description, and the comment that repeats the disproven number** — `7cc28b9` (docs)

## Files Created/Modified

- `components/design/shell-variant.css.test.ts` (new) — compiled-CSS proof of both variants
- `app/globals.css` — `max-shell`/`shell` rewritten as explicit `@custom-variant` blocks; `--breakpoint-shell` removed
- `e2e/phone-layout.spec.ts` — new 863x360 phone-stack test; sideways describe re-pointed at a touch tablet and retitled
- `e2e/viewer-toolbar.spec.ts` — sideways describe re-pointed at a touch tablet and retitled
- `e2e/slider-touch.spec.ts` — Case B re-pointed at a Chromium touch tablet and retitled
- `e2e/phone-fins-landscape.spec.ts` — header corrected; ratio re-measured
- `e2e/phone-setup-landscape.spec.ts` — header corrected (code review WR-03); no assertion change
- `CLAUDE.md` — Layout section rewritten
- `components/design/toolbar-tip.tsx` — doc comment corrected; class string/wording untouched
- `components/design/use-viewer-media.ts` — doc comment corrected
- `components/design/design-screen-shell.tsx` — doc comment corrected
- `components/rails/view-full-sized-dialog.css.test.ts` — comment corrected; assertion untouched

## Call-Site Count (Task 1 acceptance criterion)

Measured with `grep -r` across `app`, `components`, `e2e` and `lib`, isolating occurrences in the definition file (`app/globals.css`) and its own new proof test (`components/design/shell-variant.css.test.ts`) from every other call site, since `git diff --stat` confirms no other file was touched by Task 1's CSS edit:

| | Before (git HEAD, base `8f44ff5`) | After (Task 1 complete) |
|---|---|---|
| `max-shell:` call sites (excluding `app/globals.css`) | 114 | 114 |
| bare `shell:` call sites (excluding `app/globals.css`) | 3 | 3 |

Equal, as required — this change edited the switch, never its call sites. (The plan's own estimate of 115/3 was close but not exact; re-measuring rather than trusting the plan's own figure, per the plan's own instruction.)

## Stash-and-Fail Check (Task 1 acceptance criterion)

`git stash` is prohibited in this workflow, so the check was done with a saved patch instead: `app/globals.css`'s diff was captured, the file was reverted with `git checkout -- app/globals.css`, and `components/design/shell-variant.css.test.ts` was run.

- **Reverted:** 3/3 tests fail (confirms the proof is not vacuous).
- **Restored** (patch re-applied): 3/3 tests pass.

## FINS Plot Ratio Re-Measurement (Task 2 acceptance criterion)

`e2e/phone-fins-landscape.spec.ts`'s subject (the FINS key sitting beside the tail plot on a short screen) is driven by a separate `[@media(max-height:500px)]` rule in `fin-viewer.tsx`, untouched by this plan. Re-measured on this checkout after Task 1 landed:

| | Previous figure (recorded pre-10-05) | Re-measured (this run) |
|---|---|---|
| Plot-to-viewer height ratio at 863x360 | 1.000 | 1.000 |

Identical — the ratio was never driven by the shell switch, so this plan's change to that switch did not move it. The asserted bound (`>= 0.95`) is unchanged.

## Touch-Tablet Descriptor Choice (Task 2)

- `e2e/phone-layout.spec.ts` and `e2e/viewer-toolbar.spec.ts`: `iPad Mini landscape` (1024 x 768, WebKit, `hasTouch: true`) — confirmed via a live precondition (`pointer: coarse`, width >= 820, height >= 500) to genuinely still keep the desktop shell. Runs on the `iphone` project.
- `e2e/slider-touch.spec.ts` Case B: `Galaxy Tab S9 landscape` (1024 x 640, Chromium, `hasTouch: true`) instead — this file's own header documents that real-finger touch dispatch only works via a CDP session (`Input.dispatchTouchEvent`), which only Playwright's Chromium exposes, so the replacement bed had to stay Chromium. Runs on the `android` project.

## Decisions Made

- The layout switch is `width < 820px` OR `(coarse pointer AND height < 500px)` for the phone stack, and `width >= 820px` AND NOT that pair for the desktop shell — the shaper's own decision from 10-SWEEP.md, implemented verbatim.
- `e2e/slider-touch.spec.ts` Case B uses a different (Chromium) tablet descriptor than the sibling files, to keep its CDP-based real-touch dispatch working — see "Touch-Tablet Descriptor Choice" above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `next dev`'s Turbopack bundler cannot resolve `next/package.json` from inside this git worktree**
- **Found during:** Task 1, first attempt to run the new Playwright test
- **Issue:** The plan's executor notes already flag that `npm run build` cannot resolve `next` from inside a worktree (Turbopack root detection stops at the worktree's own copied `package-lock.json`, treating the worktree as an isolated workspace root). This turned out to also affect `next dev` — which Playwright's own `webServer` spawns — so the dev server failed to start with `Error: Could not find the Next.js package (next/package.json)`.
- **Fix:** Set the `IS_WEBPACK_TEST=1` environment variable when invoking Playwright. Next's own CLI (`node_modules/next/dist/lib/bundler.js`) already reads this variable to select the webpack bundler instead of Turbopack; webpack's standard Node module resolution walks up the directory tree and finds `next` in the parent (main) checkout's `node_modules`, same as `tsc`/`vitest` already do. No config file was touched — `next.config.ts` and `playwright.config.ts` are both outside this plan's `files_modified` list, and the orchestrator's real build/e2e run on `main` uses Turbopack normally, unaffected by this worktree-only workaround.
- **Files modified:** None (environment variable only, at invocation time)
- **Verification:** `PW_PORT=3115 IS_WEBPACK_TEST=1 npx playwright test` starts the dev server and runs the full suite; confirmed 208 passed, 185 skipped, 0 failed.

**2. [Rule 1 - Bug] WebKit-only dev-server flake on the re-pointed tablet describe**
- **Found during:** Task 2, running the re-pointed `e2e/phone-layout.spec.ts` tablet describe on the `iphone` project
- **Issue:** The tablet describe's viewport switch (the first request for that exact device/viewport combination in the run) occasionally triggered a background Next.js "Fast Refresh had to perform a full reload" event, which raced a subsequent hard `page.goto("/design/rocker")`, throwing `Navigation to ".../design/rocker" is interrupted by another navigation to ".../design/outline"`. Reproducible consistently on the `iphone` (WebKit) project only; the same two-`page.goto` pattern elsewhere in the same file (a different describe) never hit it.
- **Fix:** Replaced the second `page.goto` with a client-side navigation via the desktop nav's own `ROCKER` link (`page.getByRole("link", { name: "ROCKER" }).click()`) — the same path a shaper actually uses to move between screens on this viewport (the desktop shell's own link row), and a sturdier one than a hard navigation. Same assertion, no change in what the test proves.
- **Files modified:** `e2e/phone-layout.spec.ts`
- **Verification:** Re-ran the test 3 times after the fix; passed every time. Full 4-file, 3-project run confirms 42 passed, 45 skipped (project scoping), 0 failed.

---

**Total deviations:** 2 auto-fixed (1 blocking/environment, 1 bug/flake)
**Impact on plan:** Both fixes were necessary to run this plan's own required verification inside an isolated worktree; neither touched a file outside this plan's `files_modified` list, and neither changes what any test proves.

## Issues Encountered

- **Fresh worktree had no Next.js generated route types** (`LayoutProps<...>` undefined), failing `npx tsc --noEmit` on two files this plan never touches (`app/layout.tsx`, `app/design/layout.tsx`). Resolved with `npx next typegen`, which generates `.next/types/*` without a full build — `.next/` and `next-env.d.ts` are both gitignored, so this left no tracked-file trace. Not a plan deviation (no plan file was involved); recorded here as encountered-and-resolved tooling friction specific to a fresh worktree checkout.

## Human Verification Deferred to the Real-Device Sweep

- **The Hide Toolbar tip actually appearing sideways on a real iPhone.** This plan's fix reaches the tip's existing gate (confirmed unchanged by `git diff`), but whether iOS Safari's `-webkit-touch-callout` feature-detection actually fires as expected on real hardware cannot be proven by Playwright's WebKit (documented limitation, `e2e/phone-toolbar-tip.spec.ts`'s own header). Plan 10-08 re-walks this.
- **Whether the new width-and-height media query is evaluated identically by a real mobile Safari/Chrome** as it is by Playwright's emulated `iPhone 14`/`Pixel 7` devices — the whole reason this plan exists is that an earlier emulator-based assumption (750px for a sideways iPhone) was wrong; the corrected figures (about 844/863) are the shaper's own 2026-09-11 measurements, but the fix's actual behaviour on that same hardware is not re-verified by this plan itself. Plan 10-08 re-walks step 7 of the sweep.

## Next Phase Readiness

- Plan 10-06 (the board card's height cap) depends on this plan landing first — the cap only reaches a sideways phone once a sideways phone is a phone, which is now true.
- No blockers. The switch, its compiled-CSS proof, and every browser test that touches it are green across all three Playwright projects and the full Vitest suite.

## Self-Check: PASSED

All 12 files listed in "Files Created/Modified" (plus this SUMMARY) confirmed present on disk with `[ -f ... ]`. All 5 commit hashes (`4b94908`, `a15887d`, `16976d5`, `7cc28b9`, `cb4fdec`) confirmed present in `git log --oneline --all`. No missing items.

---
*Phase: 10-the-whole-app-on-a-phone*
*Completed: 2026-09-11*
