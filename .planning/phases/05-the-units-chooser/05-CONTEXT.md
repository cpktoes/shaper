# Phase 5: The Units Chooser - Context

**Gathered:** 2026-09-04
**Status:** Ready for planning

<domain>
## Phase Boundary

A shaper picks **Imperial** or **Metric** from the gear menu in the top bar, and that one choice
follows them: saved on their account when signed in, remembered by the browser when signed out,
with a defined handoff at sign-in (UNIT-02..04). Switching only changes how numbers are shown
and typed — no saved board is ever rewritten, and switching back reproduces every value exactly
(UNIT-05). The phase proves the whole chain end to end on the setup screen — chooser → one shared
preference → `lib/geometry/units.ts` → a label — by converting the first two display sites: the
preset cards (SCRN-04) and the rack cards (RACK-01).

Concretely this phase delivers:

1. The **Units** chooser in the gear menu, beside the theme chooser.
2. **One shared preference** with three homes that never disagree: an account-level value in
   Neon via Drizzle (new per-user storage — code deploys before production migrates), the
   browser (localStorage, mirroring the theme pattern), and a cookie mirror so the server can
   render the right system on first paint.
3. The **metric side of the number rules** in `lib/geometry/units.ts`, pure and unit-tested:
   cm and whole-mm formatting, decimal-cm and whole-mm parsing, rounding, and the round-trip
   guarantee behind UNIT-05. Phases 6 and 7 call these functions and add none of their own.
4. **One hook/context** every component reads the chosen system through; no component converts
   on its own.
5. **Preset cards and rack cards** reading in the chosen system — preset cards gain a
   dimensions line to do it (today they show a name and a prose descriptor, no numbers at all).
6. **CLAUDE.md Rule 2 rewritten** — the project rules must stop claiming the app is inches-only
   the moment it isn't.
7. Two folded refactors as groundwork (see Folded Todos): a shared `SliderRow` across the five
   control sidebars, and a shared viewer toolbar button across the Template and Rocker screens.

**Out of scope here:** every number on the five design screens (Phase 6), everything that comes
out of a printer (Phase 7), and any new capability. In the deployed app after this phase a shaper
who picks Metric sees metric cards and inch design screens — that is the roadmap's "three passes
a shaper can see and try one at a time", not a defect.

**Codebase reality check (2026-09-04):** every length is already stored in millimetres and
converted only at the edge, so this is presentation work. The theme preference (`lib/theme.ts` +
`components/theme-provider.tsx` + `components/settings-menu.tsx`, quick task 260824-m6k) is the
exact pattern to mirror. There is deliberately **no users table** yet — `lib/db/schema.ts`'s
header anticipates adding one — so "a new account column" means new per-user storage keyed by
the Clerk user id, not a column on `models`. `app/page.tsx` is a Server Component that already
reads `auth()` before rendering the setup screen, which is where a first-paint read of the
account value or the cookie fits. Preset cards show **no numbers today** (`preset.descriptor` is
prose such as "Fast and responsive, for performance surfing"); rack cards show four numbers
through `CardMetadataLine` in `components/setup/board-rack-card.tsx`.

</domain>

<decisions>
## Implementation Decisions

### Metric number rules (the formatters and parsers Phases 6 and 7 inherit)
- **D-01:** Every centimetre value reads to **one decimal**: `188.0 × 51.4 × 6.7 cm`. A tenth of
  a centimetre is one millimetre — what a metric tape reads — and it matches Phase 6's sliders
  stepping in whole millimetres. No whole-cm headline variant, no stripping of a trailing `.0`.
  — **Reversibility:** costly — this formatter is the single source roughly 300 display sites
  across Phases 6 and 7 will call; changing its precision later means re-verifying every site
  and every frozen print pin in `lib/geometry/template.test.ts`.
- **D-02:** Two families of metric number, decided by what the number *is*, not where it shows:
  **dims** (a board's length, widths and headline thickness — the three numbers a shaper quotes
  as a size) read in cm; **marks** (rail band marks, rocker heights, the five-station foil
  thicknesses on the ROCKER datasheet) read in whole mm. So a rack or preset card's thickness —
  which is the foil's centre thickness — reads `6.7 cm` on the dims line, while the same value
  reads `67 mm` in the datasheet column in Phase 6. — **Reversibility:** costly — the cm/mm split
  is baked into which formatter each site calls.
- **D-03:** A metric dims line carries the unit **once at the end, with × between numbers**:
  `188.0 × 51.4 × 6.7 cm · 34.0 L`. The imperial line stays exactly as it is today
  (`6'2" · 20 1/4" · 2 5/8" · 34.0 L`) — until a shaper touches the chooser, everyone sees
  Imperial exactly as they do now. Litres read the same in both systems.
- **D-04:** Typed metric entry: a **bare number is the field's own unit** (a cm field reads
  `51.4` as cm, an mm field reads `67` as mm) and an **explicit `cm` / `mm` suffix overrides**
  (`514 mm` typed into a cm field works). Unreadable input returns null, the same contract as
  `parseImperial`. The parser lands in `units.ts` this phase; Phase 6 wires it into the fields.

### The chooser in the gear menu
- **D-05:** A **Units** radio group sits **above Theme** in the gear menu — two rows open the
  menu, and the Theme group follows beneath unchanged.
- **D-06:** Two rows, **Imperial** and **Metric**, each with a label and, as its detail line, a
  **live example of the same board in that system** — `6'2" · 20 1/4" · 2 5/8"` under Imperial,
  `188.0 × 51.4 × 6.7 cm` under Metric — so a shaper sees exactly what they will get before
  picking. The example strings are formatted through `units.ts`, never hand-typed.
- **D-07:** Both rows carry a **ruler icon**, and the **menu stays open after a pick**
  (`closeOnClick` off, as the theme rows already are) so the shaper watches the cards behind the
  menu re-label as they click.
- **D-08:** **No reassurance line** in the group. It stays as terse as Theme; switching back and
  forth with nothing moving is the proof.

### Sign-in and sign-out handoff
- **D-09:** **One stored value per browser that always mirrors what is on screen.** On sign-in the
  account's saved choice wins (UNIT-04) and the browser adopts it; signing out changes nothing —
  the browser keeps showing whatever was on screen until the shaper touches the chooser again.
  There is never a second "underneath" browser value to reconcile.
- **D-10:** **Nothing is stored until the shaper explicitly picks.** An untouched browser holds no
  value and simply shows Imperial; when it signs in to an account with no saved choice, nothing is
  written. Only an explicit browser pick is promoted to an empty account, and a default is never
  written to the account — so a default nobody chose can never outrank a real Metric pick made
  later on another device. Absence of a value must therefore be representable everywhere the
  preference lives (nullable column, absent key, absent cookie).
- **D-11:** A **signed-in pick switches the screen on the click**; the account write happens in the
  background with quiet retries, the way autosave's debounce-and-backoff already behaves. A failed
  write never blocks the switch and never reverts the screen.
- **D-12:** **Never a blink of inches.** A Metric shaper's page reads Metric from its first paint,
  the way the theme's pre-hydration script makes a dark theme flash-free. Because the numbers are
  rendered text rather than CSS classes, the server has to know the system when it renders: the
  browser choice is **mirrored in a cookie beside localStorage**, and a signed-in shaper's account
  value is read at render time. — **Reversibility:** costly — this makes the preference
  server-readable and shapes the provider's server snapshot; dropping the cookie later means
  accepting the blink on every reload.

### Preset cards gain a dimensions line
- **D-13:** Preset cards show the **same four numbers as a rack card** — length · width ·
  thickness · litres — produced by the **same `summarizeDesign()` pipeline** the rack uses.
  `BoardPreset` carries a full board (outline, rocker, foil, rails, fins) since Phase 4 D-12, so
  the numbers are honest, and Phase 2 asked that the rack feel like the preset cards.
- **D-14:** The line sits **under the name, with the prose descriptor kept beneath it**:
  thumbnail, name, dims, descriptor, "Start Shaping". The two card types now match line for line.
- **D-15:** **No discoverability hint** on the setup screen. The gear is where settings live; the
  cards just read in whichever system is chosen.

### What a switch never touches (UNIT-05)
- **D-16:** The units preference lives **outside `DesignState` and outside the design snapshot**.
  Toggling it never marks a design dirty, never triggers an autosave, and never rewrites a row —
  "per-board units" is out of scope by requirement. Tests pin the round trip: formatting never
  writes back into design state, and a saved board reopened after switching both ways holds the
  same millimetres it was saved with.

### Claude's Discretion
- **Shape of the account storage** — Drizzle + Neon is locked (kickoff), but with no users table
  the planner chooses the table/column (e.g. a per-user preferences row keyed by `clerk_user_id`),
  nullable per D-10. The CLAUDE.md database rule is absolute: push to `main`, let Vercel deploy,
  only then `npm run db:migrate:prod` — the code must understand the new storage before it exists.
- **Provider and hook shape** — mirror `components/theme-provider.tsx` (`useSyncExternalStore`,
  not effect-plus-setState; a server snapshot that agrees with what the server rendered — here,
  from the cookie/account rather than a fixed default). Naming (`useUnits`, `UnitsProvider`, the
  storage key and cookie name beside `THEME_STORAGE_KEY`) is the planner's; cross-tab sync via
  the `storage` event comes free with the pattern.
- **Which board the D-06 live example quotes** — a fixed reference board (e.g. the Shortboard
  preset) is simplest and keeps the row stable; a live read of the board in progress is
  acceptable if it stays formatted through `units.ts`.
- **Rounding mode** for cm and mm formatting (nearest, with the same tie-breaking epsilon
  discipline `formatInchesFraction` documents) and the exact form of the UNIT-05 round-trip tests.
- **Sequencing the folded extractions** after the chooser and cards, honouring each todo's own
  constraints (below). They are groundwork, not the phase's proof.
- **CLAUDE.md Rule 2 rewording**, the Units group label, and all plain-English copy.
- **Playwright** stays uninstalled unless phase acceptance genuinely needs an end-to-end run
  (the Phase 3 stance); the handoff cases are unit-testable as pure reconciliation logic.

### Folded Todos
- **Global settings: units toggle (inches vs cm) and colour themes**
  (`.planning/todos/pending/2026-08-21-units-toggle-global-settings.md`, `resolves_phase: 5`) —
  the phase's origin: Phase 1 UAT asked for "a Units option for Inches vs cm … in a later phase
  when I add other global settings like color themes". Themes landed in 260824-m6k, which recorded
  the units side as deliberately skipped (211 formatter call sites, 113 inch-domain slider bounds,
  17 files at the time). This phase resolves it as the chooser plus the first two display sites;
  the remaining sites are Phases 6 and 7.
- **Extract a shared SliderRow component and migrate all five control sidebars**
  (`.planning/todos/pending/2026-08-30-extract-shared-sliderrow-across-control-sidebars.md`) —
  folded as groundwork for Phase 6, where every slider on the five screens starts reading the
  chosen system. Its constraints hold: extract once and migrate all five sidebars in the same
  pass; keep every slider's own inch/mm conversion **visible at its call site** (as
  `outline-controls.tsx`'s `SliderRow` does via `onValueChange`) — that call site is exactly where
  the Phase 6 units hook plugs in; preserve the TEMPLATE sidebar's disabled/hint/note behaviour
  and clamped-depth warning.
- **Extract a shared viewer toolbar button and migrate all screens onto it**
  (`.planning/todos/pending/2026-08-30-extract-shared-viewer-toolbar-button.md`) — folded as
  housekeeping: one shared component carrying the className, the box treatment and
  `RotateBoardIcon` (currently defined byte-identically in `outline-editor.tsx` and
  `rocker-editor.tsx`), migrating both screens in one pass. `rocker-editor.tsx`'s header comment
  documents the old "local mirror" posture and must be updated with the change.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` — Phase 5 goal, its four success criteria and phase notes (Rule 1 for
  the metric functions; the Drizzle column and deploy-before-migrate; the theme mirror including
  the pre-hydration read; the CLAUDE.md Rule 2 rewrite). Read success criterion 2's example
  "188 × 51.4 cm" with D-01: it reads `188.0 × 51.4 cm` under the one-decimal rule.
- `.planning/REQUIREMENTS.md` — UNIT-02, UNIT-03, UNIT-04, UNIT-05, SCRN-04, RACK-01, and the v1.1
  out-of-scope table (no mixed systems, no per-board units, names stay as typed, litres only)
- `.planning/PROJECT.md` — the v1.1 milestone section and its three key decisions (Imperial vs
  Metric as a measuring system; all-metric with the cm/mm split; account + per-browser fallback)
- `CLAUDE.md` — Rule 1 (geometry pure and tested), Rule 2 (rewritten this phase), and the
  database rule (push, let Vercel deploy, then `npm run db:migrate:prod` — never ahead of the code)

### The pattern being mirrored (theme preference, quick task 260824-m6k)
- `lib/theme.ts` — the preference boundary: storage key, parse-with-fallback, DOM-free module,
  and the pre-hydration script generated from the same data the module uses
- `lib/theme.test.ts` — the drift guard that runs the real init script against a fake document;
  the model for testing whatever pre-render read the units preference needs
- `components/theme-provider.tsx` — `useSyncExternalStore` over localStorage and a media query,
  server snapshot, synchronous apply on click, free cross-tab sync
- `components/settings-menu.tsx` — Base UI `Menu.RadioGroup` + `Menu.GroupLabel` + the
  icon/label/detail row shape, `closeOnClick` off; the Units group goes above the Theme group here
- `.planning/quick/260824-m6k-settings-menu-in-the-nav-with-a-theme-ch/SUMMARY.md` — why Base UI
  in app code rather than a `components/ui/*` wrapper, why `useSyncExternalStore`, two dead ends
  worth not repeating, and the "Units toggle — founder chose to skip" note with its site counts
- `app/layout.tsx` — where the pre-hydration script and the providers mount; the units provider
  joins `ThemeProvider` here

### Persistence & identity
- `lib/db/schema.ts` — the single `models` table; its header anticipates per-user storage
- `app/design/actions.ts` — the Server Action idiom every write follows: `await auth()` before
  any database call, never a client-supplied owner
- `lib/db/ownership.test.ts` — enforces that idiom mechanically for `app/design/actions.ts`;
  extend or mirror it for wherever the preference write lives
- `lib/auth/open-access.test.ts` + `proxy.ts` — no route may gate; saving a preference must
  never become a reason to redirect a signed-out shaper
- `app/page.tsx` — Server Component reading `auth()` and the model list before rendering the
  setup screen; the natural place to read the account value / cookie for D-12
- `drizzle.config.ts`, `drizzle/0000_moaning_zodiak.sql`, `drizzle/0001_timezone_aware_timestamps.sql`,
  `package.json` (`db:generate`, `db:migrate`, `db:migrate:prod`) — migration mechanics and the
  two Neon branches
- `lib/models/autosave.ts` — the debounce/backoff behaviour D-11 mirrors for the account write

### Display sites this phase converts, and the boundary they call
- `lib/geometry/units.ts` — the units boundary; every metric function lands here beside the
  imperial ones (Rule 1: pure, no React/browser/database imports, every export unit-tested)
- `lib/geometry/units.test.ts` — the existing imperial suite the metric tests sit beside
- `components/setup/board-rack-card.tsx` — `CardMetadataLine`, the four-number line for saved
  and in-progress cards (RACK-01)
- `components/setup/preset-card.tsx` — gains the dims line (D-13, D-14; SCRN-04)
- `lib/geometry/design.ts` — `summarizeDesign()` and `DesignSummary`, the one pipeline both card
  types use
- `lib/geometry/presets.ts` — `BoardPreset` carries outline, rocker, foil, rails and fins
- `components/rocker/imperial-field.tsx` — the typed-entry contract (focus → raw string, blur/
  Enter → parse, clamp, snap, reformat, revert on failure) the metric parser is a counterpart to

### Prior phase decisions that bind this one
- `.planning/milestones/v1.0-phases/02-accounts-saved-designs/02-CONTEXT.md` — D-01 (sign-in is a
  nudge, never a gate), D-08 (autosave), D-12 (rack card contents) and the specific "the rack
  should feel like the preset cards"

### Folded todo files (full problem statements)
- `.planning/todos/pending/2026-08-21-units-toggle-global-settings.md`
- `.planning/todos/pending/2026-08-30-extract-shared-sliderrow-across-control-sidebars.md`
- `.planning/todos/pending/2026-08-30-extract-shared-viewer-toolbar-button.md`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/theme.ts` / `components/theme-provider.tsx` / `components/settings-menu.tsx` — the whole
  preference stack to mirror: a DOM-free module with a storage key and a parse-with-fallback,
  a provider on `useSyncExternalStore`, and a radio-row menu. The units chooser is a second
  `Menu.RadioGroup` in the same popup, above the existing one.
- `lib/geometry/units.ts` — `formatFeetInches`, `formatInchesFraction`, `formatSignedInchesFraction`,
  `parseImperial`, `roundToSixteenthInch`, `MM_PER_INCH`; the metric counterparts (cm and mm
  formatters, a metric parser, a mm snap) sit beside them. `cubicMmToLitres` is unchanged.
- `lib/geometry/design.ts` `summarizeDesign()` — already produces the four numbers a card shows
  from any full design, so preset cards (D-13) reuse `CardMetadataLine`'s pipeline unchanged.
- `components/setup/board-rack-card.tsx` `CardMetadataLine` — the one place the card line is
  formatted; it becomes system-aware and can be shared with `preset-card.tsx`.
- `lib/models/autosave.ts` — debounce + failure backoff for the background account write (D-11).
- `app/design/actions.ts` — the Server Action shape (and `lib/db/ownership.test.ts`'s
  source-contract test) for the preference read/write.

### Established Patterns
- Metric internally (branded `Mm` / `Degrees` / `Litres`), conversion only in `units.ts` — the
  25.4 rule and now the cm/mm rules live in one file; no component restates a factor.
- Geometry pure and tested under `lib/geometry/`; the metric functions get unit tests with values
  computed from known conversions (there is no prototype ancestor for metric, so no golden
  extraction — same sanctioned exception Phase 4 D-14 used, with provenance comments).
- Preferences are read through `useSyncExternalStore` with a server snapshot that matches what
  the server rendered (260824-m6k) — for units the server snapshot comes from the cookie/account
  read rather than a fixed default (D-12).
- Every write derives identity from `await auth()` and never gates a route (Phase 2 D-01,
  `open-access.test.ts`).
- Source-contract tests (`theme.test.ts`, `ownership.test.ts`, `open-access.test.ts`) are the
  house idiom for pinning behaviour that lives outside pure functions.
- Deploy-then-migrate for any schema change (CLAUDE.md), with `.env.local` on the development
  branch.

### Integration Points
- `components/settings-menu.tsx` — the Units group above Theme (D-05..D-08)
- `app/layout.tsx` — the units provider beside `ThemeProvider`; a pre-render read of the cookie /
  account value so the first paint is right (D-12)
- `app/page.tsx` — reads the account preference (signed in) or cookie for the setup screen
- `lib/db/schema.ts` + a new `drizzle/000N_*.sql` — per-user preference storage (nullable, D-10)
- New Server Action(s) for reading/writing the account preference, following `actions.ts`
- `components/setup/preset-card.tsx` and `board-rack-card.tsx` — the two display sites (SCRN-04,
  RACK-01)
- `CLAUDE.md` Rule 2 — rewritten to describe the chosen-system rule
- Folded extractions: `components/outline/outline-controls.tsx`, `components/rocker/rocker-controls.tsx`,
  `components/rails/rail-controls.tsx`, `components/fins/fin-controls.tsx`,
  `components/volume/volume-controls.tsx` (SliderRow); `components/outline/outline-editor.tsx`,
  `components/rocker/rocker-editor.tsx` (toolbar button)
- Not a display site: `components/setup/continue-board-card.tsx` is no longer imported anywhere
  (the rack card's in-progress variant replaced it) — dead code, safe to delete in passing or
  leave for a quick task

</code_context>

<specifics>
## Specific Ideas

- The whole discussion converged on one example board, `6'2" × 20 1/4" × 2 5/8"`, reading
  `188.0 × 51.4 × 6.7 cm` — it is the D-06 menu example and the shape every card line takes.
- "One rule, the way Shape3d and BoardCAD switch" (kickoff): Metric is all-metric, including
  length in cm. D-02's dims-vs-marks split is how that rule meets the whole-mm rule for the
  small stuff without a mixed-unit dims line.
- The handoff is designed so a value only ever exists because a shaper chose it (D-10). That is
  what lets "account wins on sign-in" be safe: an account value is always a real decision.
- No blink (D-12) is the same trust ethos as the theme's flash-free restore — the numbers a
  shaper reads must be the right ones from the first frame.
- Ship state after this phase is intentionally half-converted (metric cards, inch screens); the
  roadmap overview says so, and the planner should not try to hide the chooser until Phase 6.

</specifics>

<deferred>
## Deferred Ideas

None new — discussion stayed within phase scope.

### Reviewed Todos (not folded)
- **Copy-spec-to-clipboard across the design screens** (`2026-08-21-copy-spec-to-clipboard.md`) —
  keyword match only; same verdict as Phases 3 and 4. Backlog. (When it lands, its copied text
  should read in the chosen system.)
- **Rails: port the INSTRUCTIONS page** (`2026-08-21-rails-instructions-page.md`) — keyword only.
- **Rails viewer: View Full Sized modal and plan view** (`2026-08-21-rails-viewer-extras.md`) —
  keyword only.
- **Finished-board photo uploads with ratings** (`2026-08-19-add-finished-board-photo-uploads-with-ratings.md`)
  — unrelated capability.
- **Mobile/phone-width layout polish** (`2026-08-19-mobile-phone-width-layout-polish.md`) —
  unrelated.
- **Fins imported tail uses the generic polynomial curve** (`2026-08-21-fins-imported-template-width-branch.md`)
  — cosmetic curve behaviour, not units.
- **Extend presets to rail bands and fin setups** (`2026-08-21-presets-for-rails-and-fins.md`) —
  adjacent to preset cards but its own capability.
- **Bottom contours** (`2026-08-23-build-in-bottom-contours-with-shading-and-selectable-shapes.md`)
  — new capability needing its own requirement and roadmap slot.

</deferred>

---

*Phase: 5-The Units Chooser*
*Context gathered: 2026-09-04*
