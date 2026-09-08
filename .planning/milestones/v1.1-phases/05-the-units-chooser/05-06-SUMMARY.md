---
phase: 05-the-units-chooser
plan: 06
subsystem: ui
tags: [refactor, viewer, react, drift-guard]

requires:
  - phase: 05-the-units-chooser
    provides: "05-03's completed Wave 2, which unblocked Wave 3's two folded groundwork plans"
provides:
  - "components/viewer/toolbar-button.tsx — the one shared floating toolbar button (ViewerToolbarButton) and rotate glyph (RotateBoardIcon) for viewer panels"
  - "TEMPLATE and ROCKER screens' seven floating buttons drawn from that one shared component instead of two hand-mirrored copies"
affects: [06-design-screens-in-metric]

actuals:
  tokens: 5200
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "One composition point per shared viewer chrome piece: ViewerToolbarButton follows the same idea 05-03's CardMetadataLine established for card lines — a piece of markup two screens hand-mirrored is pulled into components/viewer/ once, with a source-contract test guarding against a third hand-mirrored copy"
    - "aria-pressed is set only when the pressed prop is actually supplied, never defaulted to false — so a one-shot action button carries no pressed attribute at all rather than a false one"

key-files:
  created:
    - components/viewer/toolbar-button.tsx
    - components/viewer/toolbar-button.test.ts
  modified:
    - components/outline/outline-editor.tsx
    - components/rocker/rocker-editor.tsx

key-decisions:
  - "The extraction was treated strictly as a move: the base class string, the box treatment, the hover-accent pairing and the rotate glyph were copied verbatim rather than reconstructed from memory of what the two files looked like"
  - "Position offsets (right-0/10/20/30) are held as a literal Record from a small ordinal to complete class names, never built by string concatenation, so Tailwind's compiler can always see them in the source"
  - "rocker-editor.tsx's header comment, which used to describe this toolbar as a deliberate faithful local mirror of outline-editor.tsx, was rewritten to say the button and glyph are now shared — the standing posture it recorded was deliberately overturned by this plan and the comment now says so"

requirements-completed: [UNIT-02]

coverage:
  - id: D1
    description: "The seven floating buttons over the TEMPLATE and ROCKER board drawings (Rotate, Construction Lines, Wide view, and TEMPLATE's Export Template) are drawn by one shared component instead of two hand-mirrored copies, and the rotate glyph is defined once instead of twice"
    requirement: "UNIT-02"
    verification:
      - kind: unit
        ref: "components/viewer/toolbar-button.test.ts#viewer toolbar button extraction (05-06) — both editors import the shared module, neither declares its own rotate glyph, neither writes the base class string by hand, both draw all their buttons from ViewerToolbarButton"
        status: pass
      - kind: manual_procedural
        ref: "checkpoint:human-verify Task 3 — approved"
        status: pass
    human_judgment: true
    rationale: "Whether a button's position, spacing, hover fill and pressed state look and behave exactly as they did before the move is a visual/interaction judgment only a human eye and hand confirm; the checkpoint was run and approved."
  - id: D2
    description: "A non-toggle button (Export Template, Rotate) carries no pressed attribute at all; the two genuine toggles (Construction Lines, Wide view) keep their persistent accent fill while on and drop it completely when off"
    verification:
      - kind: unit
        ref: "components/viewer/toolbar-button.tsx — aria-pressed is only spread onto the element when pressed !== undefined"
        status: pass
      - kind: manual_procedural
        ref: "checkpoint:human-verify Task 3, steps 2-3 and 6 (hover, toggle cycling, keyboard/announcement) — approved"
        status: pass
    human_judgment: true
    rationale: "Whether a toggle's fill genuinely persists after the pointer leaves, and whether a screen reader announces a sensible name, is confirmed by hand in the browser, not by a unit assertion alone."
  - id: D3
    description: "rocker-editor.tsx's header comment no longer claims to be a faithful local mirror of outline-editor.tsx for this toolbar — it now names the shared module and explains why the old posture was overturned"
    verification:
      - kind: unit
        ref: "components/viewer/toolbar-button.test.ts (implicitly, via the shared-import assertion) plus direct grep for \"shared\" in the rewritten comment"
        status: pass
    human_judgment: false
  - id: D4
    description: "A third screen that grows this same toolbar in future reuses the shared component rather than hand-mirroring it a third time"
    verification: []
    human_judgment: true
    rationale: "This is a claim about future maintainability, not something any test today can prove; it is recorded as the intent the extraction exists to serve."

duration: 6min
completed: 2026-09-05
status: complete
---

# Phase 5 Plan 6: The Shared Viewer Toolbar Button Summary

**The Rotate, Construction Lines, Wide view and Export Template buttons floating over the TEMPLATE and ROCKER board drawings are now drawn by one shared `ViewerToolbarButton` component instead of two hand-mirrored copies, and the two-board rotate glyph exists once instead of twice.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-09-04T18:50:00Z
- **Completed:** 2026-09-04T18:56:00Z
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files modified:** 4 (2 new, 2 modified)

## Accomplishments

- Nothing changed on screen. TEMPLATE still shows its four buttons — Rotate, Construction Lines,
  Wide view, Export Template — in one row over the top-right corner of the drawing, and ROCKER
  still shows its three, at the exact same positions, spacing, and 34px square size as before.
  This plan is groundwork behind the scenes, not a visible change.
- Both screens' buttons now come from one new file, `components/viewer/toolbar-button.tsx`,
  instead of each screen carrying its own copy of the button's border, background, hover-fill and
  icon-colour classes. That duplication had already caused the same class string to be hand-edited
  in all seven button instances twice in a single day (2026-08-30) — once to add the hover fill,
  once to fix a border-colour mistake the first edit introduced. A shared component means the next
  fix happens once.
- The little two-board "rotate the drawing" icon, previously defined byte-for-byte in both
  `outline-editor.tsx` and `rocker-editor.tsx`, now exists in exactly one place
  (`RotateBoardIcon`), still built the same way: one planshape drawn once and reused twice at the
  same scale so it reads as one board turning rather than two boards of different sizes.
- The two toggle buttons — Construction Lines and Wide view — keep their accent fill while turned
  on, hung off a truthful pressed state (`aria-pressed`) that is only ever set when the component
  is actually told the button is a toggle. The two one-shot buttons (Rotate, Export Template) carry
  no pressed attribute at all, so neither can accidentally announce itself to a screen reader as a
  toggle.
- `rocker-editor.tsx`'s header comment, which used to describe this toolbar as a deliberate
  faithful local mirror of `outline-editor.tsx`, has been rewritten to say plainly that the button
  and the rotate glyph are now shared, and to name the module they live in — so the comment no
  longer contradicts the imports directly beneath it.
- A new drift-guard test, `components/viewer/toolbar-button.test.ts`, reads both editors' real
  source and fails if either one ever stops importing the shared module, brings back its own copy
  of the rotate glyph, or writes the button's base class string out by hand again.

## Task Commits

Tasks 1 and 2 were executed by a prior executor agent in an isolated worktree; the orchestrator
merged that worktree into `main`. This continuation confirmed the merged commits, recorded the
approved checkpoint, and closed out the plan's documentation.

1. **Task 1: The shared toolbar button and the rotate glyph** — `bdcd1ed` (feat)
2. **Task 2: Migrate both editors and correct the header comment** — `711f9fb` (feat)
3. **Orchestrator merge of the executor worktree into `main`** — `d7422a9` (chore, the point at
   which this plan's code landed on `main`)
4. **Task 3: Check every toolbar button on both screens** — `checkpoint:human-verify`,
   resume-signal "approved" (no commit of its own; this is the checkpoint this SUMMARY closes out)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified

- `components/viewer/toolbar-button.tsx` (new) — `ViewerToolbarButton` (the shared button:
  `label`/`title` for accessible name and tooltip, `slot` for position, `pressed?` to opt into
  toggle behaviour, `children` for the icon), a literal `ViewerToolbarSlot` → class-name record
  for the four positions (`right-0`/`right-10`/`right-20`/`right-30`, so Tailwind's compiler can
  always see them whole), and `RotateBoardIcon` (the two-board glyph, moved here verbatim
  including its `useId`-derived SVG id so two instances on one page never collide).
- `components/viewer/toolbar-button.test.ts` (new) — source-contract drift guard, same idiom as
  `lib/theme.test.ts`: strips comments from both editors' source and asserts they import the
  shared module, declare no local rotate-glyph copy, don't write the base class string by hand,
  and each render the expected count of `<ViewerToolbarButton` (4 on TEMPLATE, 3 on ROCKER).
- `components/outline/outline-editor.tsx` — all four floating buttons and the local glyph
  definition replaced with the shared component and import; each button keeps its own handler,
  icon, accessible name/tooltip and slot ordinal.
- `components/rocker/rocker-editor.tsx` — the same migration for its three buttons, its local
  glyph copy deleted, and its header comment rewritten to describe the shared extraction instead
  of a faithful local mirror.

## Decisions Made

See `key-decisions` above. In short: the move was verbatim (no visual or behavioural change), the
position offsets are a literal record rather than a computed string, and the ROCKER header
comment was corrected to match the new reality rather than left describing a posture the plan
deliberately overturned.

## Deviations from Plan

None — plan executed exactly as written. The prior executor's Task 1 and Task 2 commits matched
the plan's action and acceptance criteria; `npx tsc --noEmit`, `npm run lint` and `npm test` all
passed clean at each commit as reported in those commits' own messages, and re-confirmed here on
`main` (1896 tests passing, 2 pre-existing skips, 30 files).

### Process note (not a code fix)

**1. [Process] Checkpoint verified on port 3005, not 3000**
- **Found during:** Task 3 (browser checkpoint)
- **Issue:** The plan's `<how-to-verify>` says to run `npm run dev` and open
  `http://localhost:3000`, but port 3000 was already held by another project's dev server on the
  verification machine — the same condition already noted in 05-01 and 05-03.
- **Fix:** The shaper ran the checkpoint against `http://localhost:3005` (the `shaper-dev-3005`
  launch entry added in 05-01's plan). No application code changed as a result.
- **Verification:** All seven checkpoint steps in the plan's `<how-to-verify>` were carried out
  against port 3005 and approved, including the Slate theme pass.

---

**Total deviations:** 0 code auto-fixes; 1 process note (verification port), already covered by
05-01's launch-config addition.
**Impact on plan:** None on correctness or scope.

## Issues Encountered

One environment note worth recording, not a code issue: measuring the toggle colours in a hidden
browser tab reads one state behind, because CSS transitions freeze while the tab is hidden. The
checkpoint verification was done in a visible tab, where this did not apply.

`npx vitest run` passes at 30 files / 1896 tests / 2 pre-existing skips on `main` after the merge.
`git status --short` is clean.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- UNIT-02's folded-todo groundwork is complete for the viewer toolbar: a third screen that grows
  this same toolbar reuses `ViewerToolbarButton` rather than hand-mirroring it again.
- Phase 5's Wave 3 is now fully closed (05-05 and 05-06 both complete); Wave 4 (05-07, ship it) is
  unblocked.
- No blockers.

---
*Phase: 05-the-units-chooser*
*Completed: 2026-09-05*
