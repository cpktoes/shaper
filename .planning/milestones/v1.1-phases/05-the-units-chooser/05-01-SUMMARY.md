---
phase: 05-the-units-chooser
plan: 01
subsystem: ui
tags: [units, geometry, next-app-router, base-ui, cookies, localstorage]

requires:
  - phase: 02-accounts-and-saving
    provides: the board rack cards (board-rack-card.tsx) and the settings menu (settings-menu.tsx) this plan wires into
  - phase: 01-foundation
    provides: lib/geometry/units.ts's imperial formatters, which formatCentimetres and formatSummaryLine sit beside
provides:
  - A shared UnitsSystem type and formatCentimetres in lib/geometry/units.ts
  - formatSummaryLine/formatDimsExample/presetSummary in the new lib/geometry/summary-line.ts — the one place a DesignSummary becomes card/menu text in either system
  - The units preference boundary (lib/units-preference.ts) and its server resolver (lib/units-server.ts), including decideUnitsHandoff, which encodes the full account-vs-browser rule 05-02 will plug real account data into
  - A working, server-render-correct Units chooser in the gear menu, live on the board rack
affects: [05-02-account-column, 05-03-preset-and-card-lines, 05-04-metric-parser]

actuals:
  tokens: 10500
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Preference boundary mirrors lib/theme.ts's shape (storage key constant, parse-with-fallback, DOM-free module) but returns null instead of a default for 'nothing chosen yet', with resolveUnitsSystem as the one place the Imperial default is applied"
    - "useSyncExternalStore over localStorage + a storage-event listener for free cross-tab sync, matching theme-provider.tsx, with the units-specific twist that getServerSnapshot returns the server's actual resolved value (not a fixed literal) because rendered text can't be patched after paint the way a CSS class can"
    - "decideUnitsHandoff centralizes the full account-wins / browser-promotes / nothing-written-by-default rule as one pure, tested function so both this plan (browser only) and 05-02 (adds the account) read from the same decision"

key-files:
  created:
    - lib/geometry/summary-line.ts
    - lib/geometry/summary-line.test.ts
    - lib/units-preference.ts
    - lib/units-preference.test.ts
    - lib/units-server.ts
    - components/units-provider.tsx
  modified:
    - lib/geometry/units.ts
    - lib/geometry/units.test.ts
    - app/layout.tsx
    - components/settings-menu.tsx
    - components/setup/board-rack-card.tsx

key-decisions:
  - "UnitsSystem is declared in lib/geometry/units.ts (the units boundary itself), and Imperial is demoted from 'the way the app renders' to one of two variants of that type — every display site takes a UnitsSystem argument rather than defaulting to inches with a metric branch bolted on, so Phase 6's ~300 call sites inherit no Imperial-favoring asymmetry"
  - "formatCentimetres returns a bare one-decimal number with no unit suffix — the unit is composed once, at the end of a whole line, by summary-line.ts — matching how the imperial formatters already separate number from unit"
  - "The units cookie is deliberately not HttpOnly (the browser has to write it) and not Secure (so localhost keeps working); it carries one of two public words and nothing sensitive"
  - "app/layout.tsx became async and now reads the units cookie on every request, which opts every route into dynamic rendering — accepted as the deliberate cost of D-12 (never a flash of the wrong system on reload), and app/page.tsx already rendered dynamically for the same reason"

requirements-completed: [UNIT-02, UNIT-04, RACK-01]

coverage:
  - id: D1
    description: "Gear menu carries a Units group (Imperial/Metric, ruler icon rows) sitting above Theme, each row showing the Shortboard reference board's own dimensions in that system, one row always checked"
    requirement: "UNIT-02"
    verification:
      - kind: unit
        ref: "lib/geometry/summary-line.test.ts#formatDimsExample"
        status: pass
      - kind: manual_procedural
        ref: "checkpoint:human-verify Task 2, step 1 — approved"
        status: pass
    human_judgment: true
    rationale: "Visual menu layout, icon choice, and row rhythm against the Theme group below it are a judgment call the UI-SPEC set out but only a human eye confirms — the checkpoint was run and approved."
  - id: D2
    description: "Clicking Metric re-labels every rack card immediately without closing the menu or reloading; clicking Imperial restores the exact prior string"
    requirement: "RACK-01"
    verification:
      - kind: unit
        ref: "lib/geometry/summary-line.test.ts#formatSummaryLine"
        status: pass
      - kind: manual_procedural
        ref: "checkpoint:human-verify Task 2, steps 2-3 — approved"
        status: pass
    human_judgment: true
    rationale: "The instant re-label with the menu staying open, and byte-identical return to the imperial string, is a live-interaction behavior the test suite can prove piecewise (formatSummaryLine's two branches, closeOnClick={false}) but only a browser click-through confirms end to end."
  - id: D3
    description: "Reloading the page as a Metric shaper renders the metric line from the very first paint — no flash of inches — because app/layout.tsx resolves the units system from the cookie before rendering"
    requirement: "UNIT-04"
    verification:
      - kind: unit
        ref: "lib/units-preference.test.ts#decideUnitsHandoff"
        status: pass
      - kind: manual_procedural
        ref: "checkpoint:human-verify Task 2, step 4 (including a hard reload) — approved; orchestrator additionally curled server HTML confirming \"system\":\"metric\" with the cookie set and \"system\":\"imperial\" with no cookie or a junk cookie value"
        status: pass
    human_judgment: true
    rationale: "First-paint correctness across a real reload (and a hard reload, which re-fetches everything) can only be judged by watching the actual paint in a browser; the orchestrator's server-HTML curl is corroborating evidence, not a substitute for the human's eyes."
  - id: D4
    description: "An untouched browser shows Imperial and writes nothing to localStorage or the units cookie until a row is explicitly clicked"
    requirement: "UNIT-04"
    verification:
      - kind: unit
        ref: "lib/units-preference.test.ts#parseUnitsPreference and #decideUnitsHandoff (signed-out, no browser value case)"
        status: pass
      - kind: manual_procedural
        ref: "checkpoint:human-verify Task 2, step 6 (private window, DevTools Application check) — approved"
        status: pass
    human_judgment: true
    rationale: "Confirming DevTools shows no stray localStorage or cookie entry in a fresh private window is an inspection only a human running the app can perform."

# Metrics
duration: 15min
completed: 2026-09-04
status: complete
---

# Phase 5 Plan 1: One End-to-End Units Path — Chooser to Rack Card Summary

**A working Imperial/Metric chooser in the gear menu, one shared browser-remembered preference, and board rack cards that read in the chosen system from the very first server-rendered paint.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-09-04T21:55:49Z
- **Completed:** 2026-09-04T22:11:09Z
- **Tasks:** 2 (1 tracer + 1 checkpoint)
- **Files modified:** 11 (6 new, 5 modified)

## Accomplishments

- A shaper can open the gear menu and see a **Units** group sitting above **Theme**, with an
  Imperial row and a Metric row — each showing the exact dimensions of the same reference board
  (the Shortboard preset) in that system, so a shaper can compare the two before picking either
  one.
- Clicking a row re-labels every card on the board rack in the same instant, without the menu
  closing and without a page reload. Clicking the other row puts the card back to exactly the
  string it showed before — down to the byte.
- The chosen system is remembered by the browser (in `localStorage`, mirrored into a cookie) so a
  reload — even a hard reload — shows the right numbers from the very first frame the page paints.
  There is no flicker where the page briefly shows inches before switching to metric.
- A browser that has never touched the chooser sees Imperial exactly as the app has always shown
  it, and writes nothing to `localStorage` or the cookie until a row is actually clicked.
- The number formatting itself follows the rules the design decided on: metric measurements always
  show one decimal place, even when that decimal is a trailing zero (so 188 centimetres reads
  "188.0", never "188"), and a metric card's three dimensions are separated by a `×` sign with the
  unit written once at the end, followed by the volume in litres — e.g.
  `188.0 × 51.4 × 6.7 cm · 34.0 L`. Litres themselves read identically whichever system is chosen.
- The rule for what happens when a shaper eventually signs in (an account's saved choice always
  wins and is copied into that browser; a browser's own pick is saved to the account only if the
  account has nothing yet; nobody's un-chosen default is ever written anywhere) is built and fully
  tested now, even though this plan only exercises the signed-out half of it — 05-02 plugs in real
  account data without changing this rule's shape.

## Task Commits

Work for this plan was executed in an isolated worktree by a prior executor agent and merged to
`main` by the orchestrator; this continuation confirmed those commits, recorded the approved
checkpoint, and closed out the plan's documentation.

1. **Task 1 (RED): Failing tests for metric formatting, summary lines, and units preference** —
   `558976e` (test)
2. **Task 1 (GREEN, pure modules): Metric formatting, summary-line composer, and units
   preference boundary** — `450a171` (feat)
3. **Task 1 (GREEN, wiring): Units chooser wired into the gear menu and the rack cards** —
   `47d8130` (feat)
4. **Orchestrator merge of the executor worktree into `main`** — `5558280` (chore, not authored
   by this plan's tasks but the point at which the code landed on `main`)
5. **Task 2: Check the chooser in the browser** — `checkpoint:human-verify`, resume-signal
   "approved" (no commit of its own; this is the checkpoint this SUMMARY closes out)

**Plan metadata:** committed alongside this SUMMARY.

_Note: this was a `tdd="true"` tracer task — RED (failing tests) → GREEN (implementation), no
separate REFACTOR commit was needed._

## Files Created/Modified

- `lib/geometry/units.ts` — gained `UnitsSystem`, `UNITS_SYSTEMS`, `MM_PER_CM`,
  `mmToCentimetres`, `centimetresToMm`, and `formatCentimetres` (one-decimal centimetres, no unit
  suffix, same signed-epsilon rounding discipline as the existing inch formatters) beside the
  existing imperial functions.
- `lib/geometry/summary-line.ts` (new) — `formatSummaryLine`, `formatDimsExample`, and
  `presetSummary`: the one place a board's numbers become the text a card or menu row shows, in
  either system.
- `lib/units-preference.ts` (new) — the preference boundary: storage/cookie key constants,
  `parseUnitsPreference` (an allow-list that treats any stored value as untrusted and returns
  `null` rather than guessing), `resolveUnitsSystem`, `unitsCookieString`, `readUnitsCookie`, and
  `decideUnitsHandoff` (the full sign-in/sign-out reconciliation rule).
- `lib/units-server.ts` (new) — `resolveUnitsHandoff`, the server-side function that reads the
  cookie and resolves what the very first HTML should show.
- `components/units-provider.tsx` (new) — the React context every card and menu row reads the
  chosen system through, keeping browser tabs in sync and writing to `localStorage`/the cookie
  only on an explicit click.
- `app/layout.tsx` — now resolves the units system on the server before rendering and wraps the
  app in `UnitsProvider`.
- `components/settings-menu.tsx` — the new Units radio group above Theme, with a ruler-icon row
  for each system.
- `components/setup/board-rack-card.tsx` — the rack card's dimensions line now reads the chosen
  system and renders through `formatSummaryLine` instead of formatting inline.

## Decisions Made

See `key-decisions` above (frontmatter). In short: the units system type lives at the geometry
boundary as a first-class type rather than a special case bolted onto imperial, the metric
formatter carries no unit suffix so the caller composes it once, the cookie is intentionally
non-`HttpOnly`/non-`Secure` because it holds nothing sensitive and the browser must write it
itself, and reading that cookie in the root layout deliberately makes every route render
dynamically — the same trade the page already made for its own account lookup.

## Deviations from Plan

### Auto-fixed Issues

None during Task 1's build — the prior executor's work matched the plan as written and both
`npm test` and `npx tsc --noEmit` passed clean on the first run reported in that commit's message.

### Process deviation (not a code fix)

**1. [Process] Checkpoint verified on port 3005, not 3000**
- **Found during:** Task 2 (browser checkpoint)
- **Issue:** The plan's verification steps say to run `npm run dev` and open
  `http://localhost:3000`, but port 3000 was already held by another project's dev server on the
  machine used for verification.
- **Fix:** The orchestrator added a `shaper-dev-3005` launch entry (commit `d8f7f25`, outside this
  plan's own task commits) and the shaper ran the checkpoint against `http://localhost:3005`
  instead. No application code changed as a result — only which port served the same app.
- **Verification:** All six checkpoint steps in the plan's `<how-to-verify>` were carried out
  against port 3005 and approved.
- **Committed in:** `d8f7f25` (orchestrator-authored, not a task commit of this plan).

---

**Total deviations:** 0 code auto-fixes; 1 process note (verification port).
**Impact on plan:** None on correctness or scope — the port substitution is purely about which
local URL the shaper's browser pointed at.

## Issues Encountered

None. `npm test` passes at 27 files / 1847 tests / 2 pre-existing skips on `main` after the merge,
`npm run build` passed (run by the orchestrator from the main checkout, not a worktree, per the
plan's own build-verification note), and the wave gates (schema drift, codebase drift, UI safety)
all passed.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The whole units chain is proven end to end on the signed-out path: chooser → shared preference
  → `lib/geometry/units.ts` → rack card label, server-rendered correctly from the first paint.
- `decideUnitsHandoff` is fully built and unit-tested for all five UNIT-04 cases, including the
  three that involve a signed-in account — 05-02 supplies real `signedIn`/`account` values without
  needing to change this function.
- `lib/units-server.ts`'s `resolveUnitsHandoff` has a doc comment marking exactly where 05-02 adds
  `await auth()` and the account row read.
- `components/units-provider.tsx`'s `handoff.adoptIntoBrowser` and `handoff.promoteToAccount`
  branches already exist and are exercised by tests, but both are no-ops in this plan (there is no
  account yet) — 05-02 is expected to give them real values, not build new plumbing.
- No blockers. Ready for 05-02 (the account column and sign-in handoff).

---
*Phase: 05-the-units-chooser*
*Completed: 2026-09-04*
