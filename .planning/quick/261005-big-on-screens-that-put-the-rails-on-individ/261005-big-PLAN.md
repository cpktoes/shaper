---
phase: quick-261005-big
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/rails/rail-controls.tsx
  - components/rails/rail-band-editor.tsx
  - e2e/phone-rails.spec.ts
  - e2e/prod/slider-dots.spec.ts
  - .planning/quick/261005-big-on-screens-that-put-the-rails-on-individ/pictures/rails-iphone-nose.png
  - .planning/quick/261005-big-on-screens-that-put-the-rails-on-individ/pictures/rails-iphone-nose-end.png
  - .planning/quick/261005-big-on-screens-that-put-the-rails-on-individ/pictures/rails-iphone-center.png
  - .planning/quick/261005-big-on-screens-that-put-the-rails-on-individ/pictures/rails-iphone-tail.png
  - .planning/quick/261005-big-on-screens-that-put-the-rails-on-individ/pictures/rails-iphone-data.png
  - .planning/quick/261005-big-on-screens-that-put-the-rails-on-individ/261005-big-SUMMARY.md
autonomous: true
requirements: [QT-261005-big]
estimate:
  # One executor in its own git worktree. Three tasks: about a dozen changed lines across two
  # components, two new browser-test describes plus one production-build test, the unit suite, tsc,
  # lint, eight browser spec files on all three projects, then five pictures from a scratch config.
  tokens: 90000
  raw_tokens: 90000
  tasks: 3
  confidence: low
must_haves:
  truths:
    - "On an upright phone (any window under 820 dots wide), RAILS' VIEWER tab opens on NOSE and the controls under the drawing show the Nose Rail group only; the Center Rail and Tail Rail groups are not shown at all — display:none, so out of the tab order and out of what a screen reader reads (D-01)."
    - "Tapping CENTER shows only the Center Rail group; tapping TAIL shows only the Tail Rail group, Hard Edge checkbox included; tapping NOSE brings the Nose Rail group back (D-01)."
    - "Wherever the controls show, the shared controls stay: the Rail Band Calculator title and its subtitle, Use Board's Rocker & Foil Thickness and its note, Include Rail Band Instructions in Print and its note, and Back/Next (D-03)."
    - "DATA shows all three rail groups as today; INSTRUCTIONS still hides the whole controls column on an upright phone; going VIEWER → DATA → VIEWER comes back on the rail last picked, showing only its group (D-02, D-04)."
    - "The desktop shell is untouched: a computer at 1280x800, an iPhone held sideways at 844x390 and a Pixel 7 held sideways at 863x360 all show Nose, Center and Tail groups on VIEWER with no NOSE/CENTER/TAIL switch; a mouse-driven window 810 dots wide (an iPad held upright) gets the one-rail rule, because width alone picks the layout (D-02, D-07)."
    - "The picked group looks and behaves exactly as today (its ▾/▸ fold, sliders, Advanced fold, Hard Edge on Tail); no fold opens or closes by itself, nothing in the design, a saved board or the database changes, and the right controls are in the server's first paint with no JavaScript width check (D-01, D-04, D-05)."
    - "On a production build, every slider dot in a rail group that comes into view after a tap is drawn in place (no `--position: NaN%`, none left invisible) on NOSE, CENTER, TAIL and back to NOSE (D-06)."
  artifacts:
    - path: "components/rails/rail-controls.tsx"
      provides: "RailControls' optional phoneSection prop; RailSectionControls' optional hiddenOnPhone flag putting max-shell:hidden on the two groups the switch is not showing"
      contains: "hiddenOnPhone"
    - path: "components/rails/rail-band-editor.tsx"
      provides: "the picked rail passed to RailControls only while VIEWER is open, with a house-style comment citing the founder's request and date"
      contains: "activePage === \"viewer\" ? phoneSection : undefined"
    - path: "e2e/phone-rails.spec.ts"
      provides: "two new describes tagged 261005-big: the upright-phone one-rail walk (NOSE → CENTER → TAIL → DATA → VIEWER) on iphone and android, and the beside-the-drawing checks (computer, phones held sideways, 810-wide window)"
      contains: "261005-big"
    - path: "e2e/prod/slider-dots.spec.ts"
      provides: "a production-build test that every visible slider dot on RAILS is positioned after each NOSE/CENTER/TAIL tap on an upright phone, and an updated header saying why"
      contains: "/design/rails"
    - path: ".planning/quick/261005-big-on-screens-that-put-the-rails-on-individ/pictures/rails-iphone-center.png"
      provides: "the founder's pictures: RAILS on an upright iPhone, NOSE (top and end of the controls), CENTER, TAIL and DATA"
  key_links:
    - from: "components/rails/rail-band-editor.tsx"
      to: "components/rails/rail-controls.tsx"
      via: "the phoneSection prop, set only while VIEWER is the active page"
      pattern: "phoneSection=\\{activePage === \"viewer\" \\? phoneSection : undefined\\}"
    - from: "components/rails/rail-controls.tsx"
      to: "app/globals.css"
      via: "the complete literal class max-shell:hidden on a hidden rail group's root — the same width-under-820 variant that draws the NOSE/CENTER/TAIL switch"
      pattern: "flex flex-col gap-3\\.5 max-shell:hidden"
---

<objective>
On RAILS, wherever the rails sit on their own NOSE / CENTER / TAIL tabs, show only the picked rail's controls under the
drawing.

The founder's words (2026-10-05): "on screens that put the rails on individual tabs, only show the controls for that tab at
a time under it (i.e. if on the nose rail, only show the nose rail controls)". Only one place in the app does that: RAILS'
VIEWER tab in the upright layout (under 820 dots wide — an upright phone, and an iPad held upright such as the founder's
iPad 9th gen at 810). There the drawing shows one rail at a time behind a NOSE/CENTER/TAIL switch, but the controls
underneath still list all three rails' groups, so a shaper looking at the nose scrolls through the center and tail
sliders too.

Purpose: the controls under the drawing match the rail on the drawing. Nothing is taken away: the other two rails are one
tap away on the switch, and DATA still lists every rail's controls.
Output: one optional prop through `RailControls`, browser tests that fail today and pass after, a production-build proof
that every slider dot is drawn when a hidden rail comes into view, and five pictures for the founder.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<decisions>
The orchestrator's rulings on the founder's request (R1–R5), written down as decisions so the executor does not reopen
them; the founder reviews the pictures before anything ships. D-06 to D-08 are the planner's, from reading the code.

- **D-01 Scope — the upright layout's VIEWER tab only.** There, only the picked rail's group (`RailSectionControls` for
  `phoneSection`) shows; the other two are hidden with the same width rule the switch itself uses (`max-shell:hidden` on
  their root), never a JavaScript width check, so the server's first paint is already right. Hidden means display:none —
  out of the tab order and the accessibility tree.
- **D-02 Unchanged elsewhere.** DATA (all open rails in one table → all three groups, as today); INSTRUCTIONS (the whole
  controls column is already hidden on an upright phone, 10-11); the desktop shell at any width (a computer, an iPad held
  sideways, a phone held sideways — all rails stacked, all three groups).
- **D-03 The shared controls stay wherever controls show.** The "Rail Band Calculator" title and subtitle, "Use Board's
  Rocker & Foil Thickness" and its note, "Include Rail Band Instructions in Print" and its note, and Back/Next.
- **D-04 The picked group shows exactly as it does today.** Its ▾ heading fold, sliders, Hard Edge on Tail, Advanced fold.
  No auto-expanding, no change to fold state, saved data, the design store or how `phoneSection` is seeded;
  `phoneSection` stays screen state only. VIEWER → DATA → VIEWER keeps the last picked rail (it already does: the state
  lives in `RailBandEditor`, which stays mounted across the three tabs).
- **D-05 Minimal, local change.** Pass the picked rail (only while VIEWER is active) from `rail-band-editor.tsx` into
  `RailControls` as one optional prop; `RailControls` hides the other two groups below the shell breakpoint. No new
  component, no geometry change, nothing under `lib/`.
- **D-06 A production-build proof for the slider dots.** With D-01, the Center and Tail sliders load display:none on an
  upright phone. That is exactly the case `components/ui/slider.tsx`'s remount guard exists for (a slider hidden at load
  gets no dot position until it is shown), and `e2e/prod/slider-dots.spec.ts`'s own header says the dev server's
  StrictMode hides that bug, so only a production build can prove it. Add a production test; do not touch the guard.
- **D-07 An iPad held upright is covered by width alone.** The one-rail rule is keyed to width (the layout switch), never
  to the pointer (CLAUDE.md's three switches), so it is proven on the desktop project — a mouse — at 810x1080.
- **D-08 No checkpoint inside this plan.** Every task is `type="auto"`; the founder judges the pictures after the merge.
</decisions>

<context>
@.planning/STATE.md
@CLAUDE.md
@components/rails/rail-band-editor.tsx
@components/rails/rail-controls.tsx
@e2e/phone-rails.spec.ts
@e2e/prod/slider-dots.spec.ts

What is already true (confirmed at plan time — do not re-explore):

- `rail-band-editor.tsx`: `phoneSection` (line ~91) is seeded once from `firstOpenSection(sectionOpen)` → "nose". The
  NOSE/CENTER/TAIL switch is the `role="tablist"` inside `<div data-rail-plot-row="phone" className="hidden ...
  max-shell:flex">` (~line 344), drawn only when `activePage === "viewer"`. The controls are passed to
  `DesignScreenShell` as `controls={<div className={activePage === "instructions" ? "max-shell:hidden" : undefined}>
  <RailControls .../></div>}` (~line 222).
- `rail-controls.tsx`: `RailControls` renders, inside one `flex flex-col gap-5` column: the title + subtitle; the foil
  checkbox + note; three `RailSectionControls` (nose, center, tail — tail alone gets `tailHardEdge`/`onToggleHardEdge`);
  the print checkbox + note. Each `RailSectionControls` root is `<div className="flex flex-col gap-3.5">` starting with a
  `SectionHeading` `<button>` whose text is "Nose Rail" / "Center Rail" / "Tail Rail" in a span followed by a ▾/▸ span.
  The file does not import `cn`. A display:none child takes no part in the column's `gap`, so hiding a group leaves no
  hole.
- `max-shell` is `@media (width < 820px)` in `app/globals.css`. Tailwind v4 only generates classes it finds as whole
  strings in source, so every class string must be a complete literal (no concatenation of variant fragments).
- With Advanced closed (the default) each rail group has exactly four sliders (Thickness, Deck Profile, Family, Ratio);
  12 on the screen.
- Back/Next is `<nav aria-label="Back and Next" data-step-nav>` inside `aside`, links named `Previous screen: Rocker` and
  `Next screen: Volume` on RAILS. The controls scroller on RAILS is `[data-design-controls-scroll]` inside `aside`.
- Playwright projects: `iphone` (iPhone 14, 390x664 upright, WebKit), `android` (Pixel 7, 412x839 upright, Chromium),
  `desktop` (1280x800). `e2e/phone-rails.spec.ts` already has `dismissSignInBanner`, `railsPageTabs` and
  `railSwitchTabs` helpers — reuse them.

Existing browser tests read at plan time, with why none of their assertions should change:

- `e2e/phone-rails.spec.ts` — the upright "exactly one full-width rail" test counts plots, not controls; the 10-11 test
  (~line 441) checks the shared "Rail Band Calculator" title, which stays (D-03); the sideways 844x340 test that closes
  Tail from `aside button` runs in the desktop shell, where all three groups stay (D-02); the desktop describe and the
  DATA fade test are untouched.
- `e2e/slider-touch.spec.ts` (~line 232, android upright) — `getByText(/^Deck Profile — /).first()` is Nose's row: first in
  the page and the visible one on the default NOSE tab. Assertion and comment both stay true.
- `e2e/step-nav.spec.ts` "the pair sits below the last of the screen's own controls" — skips zero-size boxes, and a
  hidden group's boxes are all zero.
- `e2e/prod/phone-controls-clear-undo.spec.ts` (production) — skips zero-size controls; the RAILS controls still end with
  the print checkbox and Back/Next and still scroll (one group plus the shared controls is far taller than the ~284-dot
  window under the drawing at 390x664).
- `e2e/undo-redo.spec.ts` (~260, ~317 — desktop project only), `e2e/touch-sizing.spec.ts` (~227, ~455 — INSTRUCTIONS'
  Flat/Domed pills), `e2e/phone-chrome.spec.ts` (RAILS frame and tab-row bands; the drawing is pinned, so the controls'
  length cannot move it), `e2e/viewer-toolbar.spec.ts` (toolbar button count), `e2e/phone-screen-tiles.spec.ts` (the
  menu tile picture is drawn from the board, not from this screen) — none reads the rail groups.
</context>

<execution_notes>
- You run in your own git worktree. If it has no `node_modules`, clone the main checkout's:
  `cp -Rc /Users/kontoes/Code/shaper/node_modules ./node_modules` (APFS clone, instant). If `npx tsc --noEmit` reports
  missing route types, run `npx next typegen` once first.
- Never `cd` into the main checkout to work, never start `next dev` in /Users/kontoes/Code/shaper, never touch
  `.next/dev/lock`. Port 3100 belongs to another project's server on this Mac — never use it, never kill it. Every
  browser run here uses `PW_PORT=3141 IS_WEBPACK_TEST=1` (the suite starts its own webpack dev server on 3141).
- `npm run build` and `npm run test:e2e:prod` cannot run in a worktree (no build there, and the production config needs
  the main checkout's environment file — never read, copy or name environment files). The orchestrator runs the
  production specs on main after the merge. Do not try them.
- Long Playwright runs: use `run_in_background` (or split the files across commands) rather than hitting the 10-minute
  foreground limit. If a lone test on an untouched screen fails under a cold webpack server, re-run that file alone
  before blaming the change.
- No human checkpoint inside this plan (D-08). Do not stop between tasks.
- Commit messages are for a shaper: what changed on the screen and why, in plain English, no component or function
  names in the subject. Every commit message ends with the trailer line
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` — never a different model name.
- Code comments match the surrounding files: `rail-band-editor.tsx` uses long explanatory comments that cite the decision
  and the date; `rail-controls.tsx` uses shorter JSDoc on props. Refer to the founder as they/them.
- Do not edit anything under `lib/`, `components/design/`, `components/ui/` (the slider remount guard stays exactly as
  it is) or `app/`.
- Last: write `.planning/quick/261005-big-on-screens-that-put-the-rails-on-individ/261005-big-SUMMARY.md` (frontmatter
  `status: complete`) at that path INSIDE your worktree (worktree-relative path) and commit it together with the
  pictures as your final commit. The worktree is force-removed after the merge, so anything uncommitted is lost.
</execution_notes>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Upright-phone RAILS shows only the picked rail's controls — failing browser test first, then the one-prop change</name>
  <files>e2e/phone-rails.spec.ts, components/rails/rail-controls.tsx, components/rails/rail-band-editor.tsx</files>
  <read_first>components/rails/rail-band-editor.tsx, components/rails/rail-controls.tsx, e2e/phone-rails.spec.ts (lines 1-110 for the helpers, 291-460 for the upright describe, 687-750 for the desktop describe)</read_first>
  <behavior>
    - iphone and android, upright: VIEWER opens with NOSE selected; the Nose Rail group's heading is visible; the Center
      Rail and Tail Rail headings are hidden (their title text still in the page, but not visible, and no button by that
      name in the accessibility tree); the shared controls (D-03) are visible.
    - Tap CENTER → only Center Rail's group; tap TAIL → only Tail Rail's group, with its Hard Edge checkbox visible.
    - DATA → all three headings visible. Back to VIEWER → TAIL still selected, only Tail Rail's group.
    - desktop 1280x800, iPhone held sideways 844x390, Pixel 7 held sideways 863x360: no NOSE/CENTER/TAIL switch, all three
      headings visible on VIEWER.
    - desktop project at 810x1080 (an iPad held upright, with a mouse): the switch shows, only Nose Rail's group; CENTER
      → only Center Rail's.
  </behavior>
  <action>
**Part A — the test, before any component change (RED).** Append two describes at the end of `e2e/phone-rails.spec.ts`,
both with "261005-big" in the describe title so `-g "261005-big"` selects exactly them, each with a short header comment
quoting the founder's request (2026-10-05) and naming D-01 to D-04 / D-07. Add small helpers beside them, in the file's
own doc-comment style:
- `railGroupHeading(page, rail)` for rail "Nose" | "Center" | "Tail": the `button` role inside `aside` whose name matches
  a RegExp anchored at the start on the rail's name followed by " Rail" (the button's name is the title plus the ▾/▸
  glyph) — the group's fold heading. `getByRole` leaves out anything display:none, so a count of 0 also proves a screen
  reader no longer reaches it (D-01).
- `railGroupTitle(page, rail)`: `getByText` inside `aside` for the rail's name plus " Rail", `exact: true` — the
  heading's text span, which stays in the page's markup while hidden.
- `expectOnlyRailGroup(page, shown)`: for the shown rail, heading `toBeVisible()`; for each other rail, title
  `toBeAttached()` and `toBeHidden()`, and heading `toHaveCount(0)`.
- `expectAllRailGroups(page)`: all three headings `toBeVisible()`.
- `expectSharedRailControls(page)` (D-03), all scoped to `aside`: "Rail Band Calculator" (exact), "Rail band calculator
  for shaping consistent rails", "Use Board's Rocker & Foil Thickness", its note (match either wording with a regex
  starting `Thickness comes from the ROCKER screen` or `You're typing your own thickness`), "Include Rail Band
  Instructions in Print", "Adds a third reference page", and the `[data-step-nav]` links `Previous screen: Rocker` and
  `Next screen: Volume`.

Describe 1, "RAILS on an upright phone — only the picked rail's controls under the drawing (quick 261005-big)":
beforeEach skips the desktop project, calls `dismissSignInBanner`, goes to `/design/rails`. One test walking the
behavior above: NOSE selected (`aria-selected="true"`) → `expectOnlyRailGroup(nose)` + `expectSharedRailControls`;
tap CENTER on `railSwitchTabs(page)`, wait for its `aria-selected="true"` (as the existing switch test does, so a tap
before hydration cannot pass silently) → only center + shared; tap TAIL → only tail, and `aside` text "Hard Edge" (exact)
visible; `railsPageTabs(page)` DATA → `expectAllRailGroups` + shared; VIEWER → TAIL still `aria-selected="true"`, only
tail.

Describe 2, "RAILS beside the drawing — every rail's controls stay on VIEWER (quick 261005-big)": beforeEach calls
`dismissSignInBanner`. Three tests: (a) desktop project only, 1280x800 as configured: `railSwitchTabs` count 0,
`expectAllRailGroups`. (b) phone projects only, held sideways — iphone `setViewportSize(844x390)`, android
`setViewportSize(863x360)`, before `goto` — `railSwitchTabs` count 0, `expectAllRailGroups`. (c) desktop project only,
`setViewportSize(810x1080)` before `goto` (D-07: an iPad held upright, with a mouse — width alone picks the layout):
switch visible with NOSE selected, `expectOnlyRailGroup(nose)`; click CENTER, wait for `aria-selected`, only center.

Run `PW_PORT=3141 IS_WEBPACK_TEST=1 npx playwright test e2e/phone-rails.spec.ts -g "261005-big"` on today's code.
Expected: describe 1 fails on iphone and android at the first hidden-heading assertion (Center Rail is visible), test (c)
fails on desktop the same way, tests (a) and (b) pass (they guard the side that must not change). Copy the failing
assertion lines per project into your notes for the SUMMARY. If anything else fails, fix the test before going on. Commit
the test alone, subject along the lines of "Browser test: on an upright phone, RAILS should show only the picked rail's
controls (fails until the next commit)".

**Part B — the change (GREEN), per D-01, D-04, D-05.** In `components/rails/rail-controls.tsx`:
- Add an optional `phoneSection?: RailSectionKey` to `RailControlsProps`, with a JSDoc saying: the rail the upright
  layout's NOSE/CENTER/TAIL switch is showing, passed only while VIEWER is open (quick 261005-big, the founder's request
  2026-10-05); when set, the other two rails' groups are hidden below the shell breakpoint and untouched at or above it;
  left out (DATA, INSTRUCTIONS), all three show.
- Add an optional `hiddenOnPhone?: boolean` to `RailSectionControlsProps` (JSDoc: true for the two rails the switch is
  not showing). Make the group's root class a ternary between the two complete literals `"flex flex-col gap-3.5
  max-shell:hidden"` and `"flex flex-col gap-3.5"` — never build the class by joining fragments (Tailwind v4 only finds
  whole strings).
- In `RailControls`, destructure `phoneSection` and give each of the three `RailSectionControls` `hiddenOnPhone={
  phoneSection !== undefined && phoneSection !== "<that rail's key>" }`. Change nothing else in the file: the title, the
  foil and print checkboxes, the fold handlers and every slider stay byte-identical.

In `components/rails/rail-band-editor.tsx`: pass `phoneSection={activePage === "viewer" ? phoneSection : undefined}` to
the existing `<RailControls>` inside the existing controls wrapper (leave the wrapper's INSTRUCTIONS class as it is), with a
comment block in this file's own voice: the founder's words and date (quick 261005-big); that while VIEWER is open the
rail on the switch above is passed down and `RailControls` hides the other two groups with the same `max-shell:` width
rule that draws the switch, so an upright phone (and an iPad held upright) sees only the picked rail's controls under the
drawing; that DATA passes nothing because its one table carries every open rail, INSTRUCTIONS already hides the whole
column on an upright phone (10-11, above), and the desktop shell — a computer, an iPad or a phone held sideways — never
reads `max-shell:`, so every rail's group stays beside the stacked plots; that it is decided in the server's markup, so
the first paint is right on every device; and that it is screen state only — fold state, the design and saved boards are
untouched. Append one sentence to the existing D-12 comment on the `phoneSection` state saying it now also picks which
rail's controls show under the drawing on VIEWER (261005-big). Do not touch `phoneSection`'s seeding, `sectionOpen`,
`advancedOpen`, the switch markup, the plot rows or the legend.

Re-run the same command: every 261005-big test passes on iphone, android and desktop. Commit, subject along the lines of
"On an upright phone, RAILS shows only the picked rail's controls under the NOSE, CENTER and TAIL tabs", with a short
plain-English body: what a shaper now sees on each tab, that DATA, INSTRUCTIONS and every computer or sideways view are
unchanged, and that nothing about a board changes.
  </action>
  <verify>
    <automated>PW_PORT=3141 IS_WEBPACK_TEST=1 npx playwright test e2e/phone-rails.spec.ts -g "261005-big"</automated>
    <automated>npx tsc --noEmit</automated>
    <automated>grep -c "flex flex-col gap-3.5 max-shell:hidden" components/rails/rail-controls.tsx</automated>
    <automated>grep -c 'phoneSection={activePage === "viewer" ? phoneSection : undefined}' components/rails/rail-band-editor.tsx</automated>
    <automated>! grep -nE "matchMedia|innerWidth|useMediaQuery" components/rails/rail-controls.tsx components/rails/rail-band-editor.tsx</automated>
  </verify>
  <done>
The test commit exists and, run on its own, fails on iphone and android (and the 810-wide desktop case) at a Center Rail
hidden assertion, with the failure lines recorded for the SUMMARY; the change commit follows it and every 261005-big test
passes on all three projects; both grep counts are at least 1; tsc is clean; no width-check code was added.
  </done>
</task>

<task type="auto">
  <name>Task 2: Production proof that every slider dot is drawn as a rail comes into view, and the regression gates</name>
  <files>e2e/prod/slider-dots.spec.ts</files>
  <read_first>e2e/prod/slider-dots.spec.ts, components/ui/slider.tsx (the remount guard's comment only — do not edit it)</read_first>
  <action>
**Part A — the production test (D-06).** In `e2e/prod/slider-dots.spec.ts` add a second test to the existing describe,
named along the lines of "RAILS on an upright phone: every dot in the rail that comes into view is drawn — NOSE, CENTER,
TAIL and back (261005-big)" — the name must contain "261005-big" (the listing check below greps for it). It skips the desktop project (all twelve dots show at load there). Add a helper beside
`dotPositions`, in the same style, that reads every `.slider-accent [data-slot="slider-thumb"]` whose bounding box has a
width above 0 (so the hidden rails' dots are left out) and returns, per dot, its `--position` (null for NaN or missing,
parsed the same way `dotPositions` does) and whether its computed `visibility` is "hidden". The test goes to
`/design/rails` with `waitUntil: "networkidle"`; then for NOSE (as opened), CENTER, TAIL and NOSE again — tapping the tab
on the NOSE/CENTER/TAIL tablist (the tablist that has "NOSE" among its tabs) and waiting for its `aria-selected="true"`
first — it polls (`expect.poll`) until there are exactly 4 visible dots, none null, none with hidden visibility, and each
between 0 and 100. Update the file's header comment so it stays true: the paragraph saying the last slider that ever
loaded hidden went away with the Fine adjust fold is no longer the whole story — since quick 261005-big an upright
phone's RAILS loads the Center and Tail rails' sliders hidden, so the remount guard in `components/ui/slider.tsx` is
live again and this second test is its standing production proof (the dev server's StrictMode would pass it either way).

This test cannot run in the worktree (see execution notes); prove it compiles and is collected instead:
`npx tsc --noEmit`, `npm run lint`, and `npx playwright test -c playwright.prod.config.ts --list` (checked at plan time:
this Playwright's list mode only loads the spec files — it skips global setup and the web server, so no build or
environment file is needed). Commit, subject
along the lines of "Production check: every slider dot on RAILS is drawn when a phone shaper switches between NOSE,
CENTER and TAIL". Say in the SUMMARY that the orchestrator must run `npm run test:e2e:prod` on main after the merge — it
covers this test and `e2e/prod/phone-controls-clear-undo.spec.ts`.

**Part B — the gates and the regression run.** Run the unit suite, tsc and lint. Then, on all three projects, the browser
specs that open RAILS or walk every design screen, split so no single command runs past the foreground limit:
`e2e/phone-rails.spec.ts`, `e2e/slider-touch.spec.ts`, `e2e/step-nav.spec.ts`, `e2e/undo-redo.spec.ts`,
`e2e/viewer-toolbar.spec.ts`, `e2e/phone-screen-tiles.spec.ts` in one; `e2e/touch-sizing.spec.ts`,
`e2e/phone-chrome.spec.ts` in another; and the desktop RAILS screenshot in `e2e/desktop-baseline.spec.ts` (desktop
project, `-g "RAILS"`) as pixel proof that nothing moved for a mouse. No existing assertion is expected to change (see
the context list). If one fails: re-run it alone; then check it against the plan's base commit by temporarily restoring
the two component files from `$BASE` (`git checkout "$BASE" -- components/rails/rail-controls.tsx
components/rails/rail-band-editor.tsx`, re-run, then `git checkout HEAD -- components/rails/`). A failure that also
happens on the base is pre-existing — report it, do not fix it here. A failure this change causes is fixed in the
component change, never by loosening a test — unless the assertion itself says all three rail groups show on an upright
phone's VIEWER, in which case update it to the new rule and name it, with its reason, in the SUMMARY. Finally confirm the
scope check below lists nothing.
  </action>
  <verify>
    <automated>npx vitest run</automated>
    <automated>npx tsc --noEmit</automated>
    <automated>npm run lint</automated>
    <automated>PW_PORT=3141 IS_WEBPACK_TEST=1 npx playwright test e2e/phone-rails.spec.ts e2e/slider-touch.spec.ts e2e/step-nav.spec.ts e2e/undo-redo.spec.ts e2e/viewer-toolbar.spec.ts e2e/phone-screen-tiles.spec.ts</automated>
    <automated>PW_PORT=3141 IS_WEBPACK_TEST=1 npx playwright test e2e/touch-sizing.spec.ts e2e/phone-chrome.spec.ts</automated>
    <automated>PW_PORT=3141 IS_WEBPACK_TEST=1 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop -g "RAILS"</automated>
    <automated>npx playwright test -c playwright.prod.config.ts --list | grep -c "261005-big"</automated>
    <automated>BASE=$(git log -1 --format=%H -- .planning/quick/261005-big-on-screens-that-put-the-rails-on-individ/261005-big-PLAN.md); test -z "$(git diff --name-only "$BASE"..HEAD -- lib app components/design components/ui components/outline components/rocker components/fins components/volume components/summary db)"</automated>
  </verify>
  <done>
The production test is written, type-checks, lints and is listed by the production config; the unit suite, tsc and lint pass; every listed browser spec passes on iphone, android and desktop with no
existing assertion changed (or each change named with its reason); the RAILS desktop screenshot matches its baseline; the
diff since the plan commit touches only the two rail components, the two spec files and this quick task's folder.
  </done>
</task>

<task type="auto">
  <name>Task 3: Pictures for the founder from a throwaway spec, then the SUMMARY</name>
  <files>.planning/quick/261005-big-on-screens-that-put-the-rails-on-individ/pictures/rails-iphone-nose.png, .planning/quick/261005-big-on-screens-that-put-the-rails-on-individ/pictures/rails-iphone-nose-end.png, .planning/quick/261005-big-on-screens-that-put-the-rails-on-individ/pictures/rails-iphone-center.png, .planning/quick/261005-big-on-screens-that-put-the-rails-on-individ/pictures/rails-iphone-tail.png, .planning/quick/261005-big-on-screens-that-put-the-rails-on-individ/pictures/rails-iphone-data.png, .planning/quick/261005-big-on-screens-that-put-the-rails-on-individ/261005-big-SUMMARY.md</files>
  <read_first>playwright.config.ts, playwright.prod.config.ts (for how a second config spreads the base and its webServer)</read_first>
  <action>
Make a scratch folder `.gsd/pictures-261005-big/` in the worktree (`.gsd/` is gitignored) holding a scratch Playwright
config and one spec; neither is ever committed. The config spreads `./playwright.config` the way
`playwright.prod.config.ts` does, sets `testDir` to its own folder and `testIgnore: []`, keeps only the `iphone` project
(390x664 upright), and sets the webServer's `cwd` to the worktree root — Playwright runs a webServer command from the
config file's own folder by default, and `npm run dev` there would find no package.json. The spec dismisses the sign-in
banner and toolbar tip with the same two storage keys `e2e/phone-rails.spec.ts` uses, opens `/design/rails`, waits until
the NOSE tab button is owned by React (a key starting `__reactFiber` on the element), then takes viewport screenshots
straight into this quick task's `pictures/` folder (absolute path to the worktree's copy):
- `rails-iphone-nose.png` — NOSE selected, the controls scroller (`[data-design-controls-scroll]`) scrolled so the Nose
  Rail heading sits at the top of the window under the drawing;
- `rails-iphone-nose-end.png` — NOSE, the controls scrolled to their end, showing the print checkbox and Back/Next come
  straight after the Nose group;
- `rails-iphone-center.png` and `rails-iphone-tail.png` — CENTER, then TAIL, each tapped and confirmed
  `aria-selected`, scrolled so that rail's heading sits at the top of the controls window;
- `rails-iphone-data.png` — the DATA tab, scrolled so the Nose Rail heading is at the top, with Center Rail following.
Wait two animation frames after every scroll before each screenshot. Run it with
`PW_PORT=3141 IS_WEBPACK_TEST=1 npx playwright test -c .gsd/pictures-261005-big/<config file>`.

Open every picture with the Read tool and check it: NOSE, CENTER and TAIL each show only that rail's group under the
drawing, with the drawing on the same rail; the DATA picture shows Nose Rail with Center Rail after it. Retake if a
picture caught a half-scrolled or mid-animation frame. Then delete `.gsd/pictures-261005-big/` and confirm with
`git status --short` that only the five pictures and the SUMMARY are new.

Write the SUMMARY (frontmatter `status: complete`) in plain English for the founder: what changed on the screen (one
rail's controls under the drawing on an upright phone's VIEWER; DATA, INSTRUCTIONS and every computer or sideways view
unchanged; an iPad held upright follows the phone rule); the RED evidence from Task 1 (the failing assertion per project
on the test-only commit); results of every gate and spec on all three projects; the existing assertions that changed —
expected "none", or each one with its reason; the five pictures with one line each (and that the "Copy preset values"
button, if it shows at the end of the controls, is development-only and not on the live site); and the orchestrator's
follow-ups: `npm run build` and `npm run test:e2e:prod` on main after the merge, the full browser suite, and the founder's
look at the pictures before anything is pushed. Commit the pictures and the SUMMARY together as the final commit:
`docs(quick-261005-big): summary and pictures — RAILS shows only the picked rail's controls on an upright phone`.
  </action>
  <verify>
    <automated>ls .planning/quick/261005-big-on-screens-that-put-the-rails-on-individ/pictures/ | grep -c "^rails-iphone-.*\.png$"</automated>
    <automated>test ! -e .gsd/pictures-261005-big</automated>
    <automated>test -z "$(git status --short)"</automated>
  </verify>
  <done>
Five pictures exist and each was looked at and matches its description; the scratch folder is gone; the SUMMARY carries
the RED evidence, every gate result, the changed-assertions list and the follow-ups; the pictures and SUMMARY are committed
as the final commit and `git status --short` shows nothing left over.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| none new | A display-only change inside one screen's client component; no input crosses a boundary, no network, no database, no storage |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-big-01 | Tampering | saved boards / design store | low | accept | Display only: the prop changes which controls are drawn, never a value; nothing is written to a board, the store, the database or a print (D-04, D-05) |
| T-big-02 | Denial of service | the two hidden rails' controls on an upright phone | low | mitigate | They stay one tap away on the NOSE/CENTER/TAIL switch pinned above, and DATA lists every rail's controls; the browser test walks both routes (D-02, D-04) |
| T-big-03 | Information disclosure | test pictures in the repo | low | accept | Pictures show the default board on a local dev server signed out; no account, email or saved-board data appears |
</threat_model>

<verification>
- On iphone and android upright: VIEWER shows only the picked rail's group (NOSE by default, then CENTER, then TAIL with
  Hard Edge), the shared controls always; DATA shows all three; VIEWER remembers TAIL.
- On desktop 1280x800 and phones held sideways (844x390, 863x360): no switch, all three groups on VIEWER.
- On desktop at 810x1080: the phone rule applies by width alone.
- The RED commit fails those upright/810 checks; the change commit passes them.
- Unit suite, tsc, lint and the eight browser spec files pass on all three projects; RAILS' desktop screenshot unchanged.
- The production dot test type-checks and is listed; the orchestrator runs it on main.
</verification>

<success_criteria>
The seven truths under must_haves hold, proven by the browser tests and (for the slider dots) the production test run on
main. The code change is one optional prop through `components/rails/rail-controls.tsx` and one line plus comments in
`components/rails/rail-band-editor.tsx`; tests live in `e2e/phone-rails.spec.ts` and `e2e/prod/slider-dots.spec.ts`;
nothing under `lib/` changes; nothing is pushed — the orchestrator merges, builds and runs the production specs on main,
and the founder judges the pictures.
</success_criteria>

<output>
Write `.planning/quick/261005-big-on-screens-that-put-the-rails-on-individ/261005-big-SUMMARY.md` (frontmatter
`status: complete`) inside the worktree and commit it, with the five pictures, as the final commit.
</output>
