---
phase: quick-260826-lg8
plan: 01
subsystem: ui
tags: [css, theming, print, tailwind, summary-screen]

requires: []
provides:
  - "Summary screen page background moved off a bespoke grey wash onto the app's own --surf-ground token"
  - "Logo block on the order form drawn by outline alone, no fill"
  - "Print path for the order form guaranteed white regardless of active theme, with the spine labels intentionally shaded"
affects: [summary, order-form, printing, theming]

actuals:
  tokens: 1315
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Print-only colour literals confined to @media print, with the guarantee declared at the point the printed element is defined rather than inherited through a token chain"

key-files:
  created: []
  modified:
    - components/summary/order-form.tsx
    - components/summary/order-form-primitives.tsx
    - app/design/summary/order-form.css

key-decisions:
  - "The summary page's background moved from an invented bg-surf-ink-muted/10 wash to bg-surf-ground, the same token the top bar and every other screen's page use — the two sheets are now held apart from the page by their own 1.5px ink border alone"
  - "Logo block's shaded fill was removed entirely rather than re-tinted; measured contrast improved in all four themes, so nothing needed recolouring"
  - "Print guarantee for the page background is declared as a direct rule on a new data-order-form-page hook, not left as a three-file consequence of globals.css forcing Daylight tokens"
  - "Spine labels print with a deliberate #ececec literal (not the --order-form-shade token) so they stay visually distinct on paper without also un-suppressing the SHAPER USE ONLY box, which must stay white"

patterns-established:
  - "Print-only literals: a colour literal is acceptable exactly where it is scoped inside @media print and commented as a guarantee, never elsewhere"

requirements-completed: [QUICK-260826-lg8]

coverage:
  - id: D1
    description: "Summary screen's page colour matches the app's page colour (--surf-ground) in all four themes, with the two sheets held apart by their own outline only"
    requirement: "QUICK-260826-lg8"
    verification:
      - kind: unit
        ref: "npm test (670 tests, all geometry suites green — no dedicated contrast test exists in this project)"
        status: pass
    human_judgment: true
    rationale: "Visual colour-matching across four themes (Daylight, Chalk, Slate, Phosphor) requires eyes on the rendered screen; grep/build checks confirm the class was swapped and nothing else changed, but not that it reads correctly."
  - id: D2
    description: "Logo block has no fill and is still legible as a box via its outline, in all four themes"
    requirement: "QUICK-260826-lg8"
    verification:
      - kind: unit
        ref: "npm test (670 tests green)"
        status: pass
    human_judgment: true
    rationale: "Confirming the box still reads as a box, and that contrast improved as measured, needs a human looking at the rendered page in each theme."
  - id: D3
    description: "Print preview from any theme, with Background graphics on or off, yields plain white paper with ink drawings/type plus a faint grey spine band"
    requirement: "QUICK-260826-lg8"
    verification:
      - kind: unit
        ref: "npm run build (production build succeeds, from the main checkout)"
        status: pass
    human_judgment: true
    rationale: "Print preview correctness (paper colour, spine shading, background-graphics toggle behaviour) can only be confirmed by opening the browser's print dialog and looking at the eight theme/toggle combinations named in the plan's verification section."

duration: 12min
completed: 2026-08-26
status: complete
---

# Quick Task 260826-lg8: Fix Summary Order Form Colours in All Themes Summary

**Summary screen's page now sits on the app's own page colour (not an invented grey wash), the logo box lost its shading, and printing is now guaranteed white-paper-plus-ink from any theme, with the section spine labels printing a deliberate faint grey.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-26T22:26:00Z
- **Completed:** 2026-08-26T22:38:09Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- The desk-like area around and between the two order-form sheets is now the same tone as the top bar in every theme — one continuous page with the form drawn on it, held apart only by each sheet's own dark outline.
- The SHAPER identity box at the top left of page 1 dropped its fill; it now stands directly on the page and is still clearly a box because of its ink outline, reading MORE clearly in every theme than it did shaded.
- Printing the order form now carries an explicit guarantee — a `data-order-form-page` hook pinned white inside `@media print` — instead of depending on a three-file chain of token overrides to happen to come out white. The vertical spine labels (RIDER INFO / SURFBOARD SHAPE AND DESIGN / GLASSING) now print with a faint grey band for the first time, which is what lets a shaper tell the sheet's sections apart on the printed page.

## Task Commits

Each task was committed atomically:

1. **Task 1: Put the summary page on the app's page colour** - `52af8d6` (fix)
2. **Task 2: Take the shading off the logo block** - `a3b81cb` (fix)
3. **Task 3: Guarantee a printer-friendly sheet from every theme** - `ffeb397` (fix)

_Note: this quick task is not committing docs artifacts — SUMMARY.md/STATE.md/PLAN.md are handled by the orchestrator._

## Files Created/Modified

- `components/summary/order-form.tsx` - Outer scrolling wrapper's background swapped from a one-off `bg-surf-ink-muted/10` wash to `bg-surf-ground`; the same element gains a `data-order-form-page` hook the print stylesheet targets directly.
- `components/summary/order-form-primitives.tsx` - `LogoBlock`'s wrapper `<div>` no longer carries `bg-(--order-form-shade)` — everything else on that element (border, radius, padding, layout) is unchanged.
- `app/design/summary/order-form.css` - `--order-form-shade` commentary rewritten to name its two remaining consumers (spine labels, SHAPER USE ONLY box) and record why the logo block was dropped; two new `@media print` rules added — one pinning `[data-order-form-page]` to white, one giving `.order-form-spine` a `#ececec` background — each with commentary explaining the guarantee and why a colour literal is correct there.

## Decisions Made

- Followed the plan's explicit guidance not to touch `--outline-page-bg` (confirmed it draws nothing on this route, since both `OutlineViewer`s pass `hideCallouts`) and not to add any tint/shadow/ring to hold the sheets off the page — the shared `--surf-ground`/`--surf-panel` value in every theme is what makes the ink border alone sufficient.
- Kept the `--order-form-shade` token itself untouched (still derived from `--surf-board-fill`, never a literal) — only the `LogoBlock` consumer was detached from it, per the 260825-rqm lesson recorded in that file's own commentary.
- Verified by inspection (Part C of Task 3) that the sheets' own surface, the SHAPER USE ONLY box, and the fin-system dropdown all already print white — each resolves through tokens `globals.css` forces to the Daylight/white values inside `@media print`, and the board drawings' interior wash is separately forced to `transparent` via an inline style override on this screen. No additional print rules were needed for any of those; this is documented as the completed Part C check rather than left silent.

## Deviations from Plan

None - plan executed exactly as written. The one correction made during execution was self-caught before it reached a commit: Task 3's `data-order-form-page` attribute was initially placed on the `@container` wrapper (`data-order-form-root`) rather than the scrolling wrapper the plan named at line 198; caught on re-reading the plan's `read_first` note and moved to the correct element before any verification or commit.

## Issues Encountered

- The plan's Task 3 verification expects `grep -c '#ececec'` to equal exactly 1 across the whole file. The first draft of the print-rule commentary repeated the hex literal in prose as well as in the rule itself, tripping that count to 2. Reworded the prose to describe "the grey below" instead of restating the hex value, restoring the count to 1 while keeping the explanation intact.
- Two `git commit -m "$(cat <<'EOF' ... EOF)"` heredoc invocations failed with a bash quoting error (unrelated to file content — no stray quote was ever identified). Switched to writing the message to a scratch file and committing with `git commit -F <file>`, which succeeded both times.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three commits are independently reviewable in the browser; the founder still needs to do the visual pass this SUMMARY could not perform: all four themes at `/design/summary` (page colour, logo block), plus the print preview (Cmd+P) in all four themes with "Background graphics" both ticked and unticked, per the plan's `<verify>` `human-check` blocks. No dev server was started by this executor, per the orchestrator's instruction.
- `npm test` (670 tests), `npm run lint` (0 errors, 9 pre-existing warnings unrelated to this task), and `npm run build` (production build from the main checkout) all pass.
- No new colour tokens were introduced; the only two colour literals added (`#fff`, `#ececec`) are both inside `@media print`, per the plan's success criteria.

---
*Phase: quick-260826-lg8*
*Completed: 2026-08-26*

## Self-Check: PASSED

All modified files and all three task commits (52af8d6, a3b81cb, ffeb397) verified present in the working tree and git history.

---

## Orchestrator Addendum — Browser Verification (2026-08-26)

The visual pass this SUMMARY deferred was carried out by the orchestrator at
`localhost:3000/design/summary`, and it found a **real defect in Task 3's core promise**. A
fourth commit, `72a0d20`, fixes it. The task is complete only with that commit included.

### On screen — all four themes confirmed

Rendered values read back from the live page, not inferred:

| Theme | `--surf-ground` | `--surf-canvas` | page wrapper renders | verdict |
|---|---|---|---|---|
| Daylight | `#fff` | `#dfdcd3` | `rgb(255,255,255)` | ground, not canvas ✓ |
| Chalk | `#fff` | `#dfdcd3` | `rgb(255,255,255)` | ground, not canvas ✓ |
| Slate | `#12141a` | `#1a1d25` | `rgb(18,20,26)` | ground, not canvas ✓ |
| Phosphor | `#050805` | `#142414` | `rgb(5,8,5)` | ground, not canvas ✓ |

`LogoBlock` measures `rgba(0,0,0,0)` — no fill — and is drawn by its 1px `border-surf-ink`
outline in every theme. The four spine labels keep their on-screen shade.

### The defect: `@media print` never actually forced the light palette

Forcing the two `@media print` blocks to apply on screen (by flipping their `mediaText` to
`all`) and reading back the computed values exposed it. With **Phosphor** selected:

- `--surf-ground` `#050805`, `--surf-panel` `#050805` — the sheet painted near-black
- `--surf-ink` `#26d026` — every letter printed green
- `--surf-board-fill` `#142414` — the board's interior printed filled, not hollow

**Cause:** a media query contributes no specificity. `@media print { :root { … } }` scores
(0,1,0); an explicitly chosen theme is `:root.theme-<id>` at (0,2,0) and beat it. The light
forcing therefore only ever worked for a shaper who had never opened the theme picker — for
the two *default* themes, where bare `:root` and the `prefers-color-scheme` block are both
(0,1,0) and source order decides. Every explicit choice printed itself.

This is precisely the founder's stated requirement — *"we must only ever pass a printer
friendly version"* — so it was in scope, not a separate task.

**Fix (`72a0d20`):** the print block's selector is tripled to `:root:root:root`, (0,3,0), which
outranks any theme class regardless of source order. Chosen over seventeen `!important`
declarations because this codebase already reasons in specificity terms, and over enumerating
theme names because nothing outside the `THEMES` registry should list themes — a fifth theme is
covered the day it is added. The commentary at `app/globals.css:610` records the why.

Note the executor's own two rules were never at fault: both carry `!important` and did land.
They just could not save the tokens everything else paints from.

### After the fix — print verified in all four themes

With the print rules forced on screen, all four themes resolve **identically**:

| | value |
|---|---|
| `--surf-ground` / `--surf-panel` | `#fff` |
| `--surf-ink` | `#1f2a3b` (Daylight slate) |
| `--surf-board-fill` | `#fff` — board prints hollow |
| `html`/`body`/`[data-order-form-page]`/sheet | `rgb(255,255,255)` |
| `.order-form-spine` | `rgb(236,236,236)` |

A full-page screenshot taken from **Phosphor** with print rules active shows white paper, slate
lettering, hollow board outlines and the pale grey section spines.

### What still puts colour on paper, and why it was left

An audit of every element under `[data-order-form-sheet]` with a non-white background found
exactly three, all correct:

1. The four `.order-form-spine` labels → `#ececec`. The founder's explicit exception.
2. The SHAPER USE ONLY box (`bg-(--order-form-shade)`) → resolves white in print via
   `--surf-board-fill`. Confirmed, not assumed.
3. A `h-px w-2/3 bg-surf-ink` divider under the wordmark — a 1px rule, not a fill.

The rail-section plots keep their six data hues (a band's colour is what identifies it). These
are thin strokes, documented as deliberately outside the brand palette, and print in colour. If
the founder wants those monochrome on paper too, that is a separate change — flagged, not made.

### Checks

`npm test` 670 passed · `npm run lint` 0 errors (9 pre-existing warnings in `scripts/`,
unrelated) · `npm run build` succeeds. All run from the main checkout.

**Commits: `52af8d6`, `a3b81cb`, `ffeb397`, `72a0d20`.**

---

## Follow-up — spines print in the accent wash (`3f19277`)

Founder's correction after reviewing the sheet: *"the accent color should still print with the
spine shading. The user can choose black and white if they like."*

The spine labels now print `#d9f2ed` — `var(--ramp-daylight-fill)`, the pale sage they already
show on screen in Daylight — instead of the neutral `#ececec` the first pass chose. The
ink-frugality reasoning behind that grey was sound but was the wrong call to make on the
shaper's behalf: black-and-white is a checkbox in the print dialog, so the sheet should carry
the shop's colour by default and let them spend less if they want to.

Still a tint, not a block: 1.16:1 against white, and on a colour printer it lays down cyan
rather than black. Label lettering (`#1f2a3b` Daylight ink) reads **12.31:1** on it — the grey
gave 12.24:1, so legibility is unchanged.

The rule names `--ramp-daylight-fill` directly rather than the contract, because
`--surf-board-fill` — which carries that value everywhere else — is deliberately pinned white
in print so the board prints hollow. Reaching past the contract into a ramp is wrong anywhere
else in the app; inside `@media print` it is the established idiom, and globals.css's own print
block names Daylight ramps seventeen times.

**Supersedes** the plan's Task 3 automated check `grep -c '#ececec' == 1`. That literal is gone
from the repo entirely — the print block now adds exactly one colour literal (`#fff`), down from
two.

Re-measured with the print rules forced on screen, all four themes identical:

| | value |
|---|---|
| page / sheet | `rgb(255,255,255)` |
| `--surf-board-fill` | `#fff` — board hollow |
| `.order-form-spine` | `rgb(217,242,237)` |
| spine lettering | `rgb(31,42,59)` |

`npm test` 670 passed · `npm run lint` 0 errors · `npm run build` succeeds.

**Final commit list: `52af8d6`, `a3b81cb`, `ffeb397`, `72a0d20`, `3f19277`.**

---

## Follow-up 2 — the printed spines follow the chosen theme (`e3da1be`)

Founder: *"spine print color should come from their theme. Right now it's all the light green
only."* Correct — the previous commit named `--ramp-daylight-fill`, so every theme printed
Daylight's sage.

### Why the literal reading could not be taken

Printing each theme's *own* `fill` ramp — the value the spines wear on screen — was the obvious
implementation and is wrong. Two of the four are dark:

| theme | on-screen spine (`--ramp-<id>-fill`) |
|---|---|
| Daylight | `#d9f2ed` |
| Chalk | `#d8ebf2` |
| Slate | **`#1a2732`** |
| Phosphor | **`#142414`** |

Print forces the lettering to Daylight ink `#1f2a3b`. Slate and Phosphor would therefore have
printed near-black blocks carrying near-black lettering — unreadable, and precisely the
cartridge-burning the print path exists to prevent. It also contradicts the founder's own
standing instruction from the original task: *"should never be black or use up a ton of ink."*

Both instructions reconcile in one way: keep the theme's **identity**, drop its **darkness**.

### What was built

A new contract token, `--surf-print-shade`, assigned in all six blocks that assign the contract
(bare `:root`, the `prefers-color-scheme: dark` block, and the four `:root.theme-<id>` blocks) as
that theme's own accent at 20% on white:

```css
--surf-print-shade: color-mix(in srgb, var(--ramp-<id>-accent) 20%, #fff);
```

**It is deliberately absent from the `@media print` block's pin list, and that absence is the
mechanism.** Every other `--surf-*` token is pinned to Daylight there so paper stays white; this
one is the single thing allowed through, so the chosen theme reaches paper. The print block now
carries a comment saying so, since an absence is otherwise indistinguishable from an oversight.

Derived rather than four frozen literals so a re-picked accent carries onto paper with it —
freezing values is how a palette and its print path drift apart, which this repo has form for.

Inserted by matching each block's own `--surf-board-fill: var(--ramp-<id>-fill)` line and reading
the ramp id back out of it, rather than by mapping block to ramp by hand — the near-identical
blocks are exactly where the 260824-pdg substring bug came from. Verified per block afterwards:
each names its own ramp.

### Measured, print rules forced on screen

| theme | spine on paper | vs paper | lettering on it |
|---|---|---|---|
| Daylight | `#e8f3f1` | 1.13:1 | 12.75:1 |
| Chalk | `#d6e9f2` | 1.25:1 | 11.56:1 |
| Slate | `#d1dce2` | 1.40:1 | 10.36:1 |
| Phosphor | `#d5edd5` | 1.32:1 | 11.64:1 |

All four remain tints rather than blocks, and lay down cyan or green rather than black on a
colour printer. Worst lettering case is more than double the 4.5:1 floor. Sheet, board interior
and the SHAPER USE ONLY box measure `rgb(255,255,255)` in all four. **Nothing on screen changed** —
the spines still wear `--order-form-shade` there.

`npm test` 670 passed · `npm run lint` 0 errors · `npm run build` succeeds.

**Final commit list: `52af8d6`, `a3b81cb`, `ffeb397`, `72a0d20`, `3f19277`, `e3da1be`.**
