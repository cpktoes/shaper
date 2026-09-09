# Phase 9: The Design Screens on a Phone - Context

**Gathered:** 2026-09-08
**Status:** Ready for planning

<domain>
## Phase Boundary

A shaper can shape a board on a phone. Concretely, on a phone each of the five design screens —
TEMPLATE (the outline), ROCKER (which is also where the foil lives), RAILS, FINS and VOLUME —
works end to end:

- the controls and the drawing stack on a narrow screen with nothing overlapping and nothing
  hidden: every control a shaper can reach on a desktop is reachable on the phone, either as the
  same control or, in the two named cases in D-05, as something that does the same job (PHON-01);
- the page fits the phone's visible area as Safari's toolbar comes and goes, with no clipped
  content and no trapped scrolling (PHON-02);
- sliders, buttons, tabs and typed fields are sized for a finger, and tapping a number field does
  not zoom the page (PHON-03);
- the outline's five points and the rocker's four curve handles drag under a thumb — hit zones
  sized for a finger that never fight each other, no long-press popup mid-drag, and a readout by
  the finger while it moves (PHON-04, as clarified in D-14);
- desktop mouse drag and keyboard operation are exactly what they are today on every viewer
  touched (PHON-05);
- the board drawings use the full phone width and follow the phone's own orientation (PHON-06);
- Playwright is installed, dev-only, with iPhone and Android device profiles, and automated tests
  prove the stacked layout and touch drag on at least the outline viewer (TEST-01).

**Not in this phase:** sign-in, sign-up and the account menu's own flows on a phone; the setup
screen, presets and the rack; the summary and the on-screen order form; the real-device
end-to-end pass (all Phase 10, PHON-07 to PHON-10). Pinch-zoom or pan on the viewers, a magnifier
or drag-with-offset aid, a calibrated actual-size view, printing from a phone (the requirements'
future list). Foil drag points (D-14, deferred below). Any new geometry: nothing under
`lib/geometry/` changes the numbers it produces.

</domain>

<decisions>
## Implementation Decisions

### Inherited constraints (settled before this discussion — not re-decided here)
These come from ROADMAP.md's "Settled findings that constrain this phase" and
`.planning/research/SUMMARY.md`. They are listed so nobody re-derives them:

- **One shared shell first.** The sidebar-and-canvas layout is duplicated with zero breakpoints
  across `outline-editor.tsx`, `rocker-editor.tsx`, `rail-band-editor.tsx`,
  `fin-placement-editor.tsx` and `volume-estimator.tsx`. Extract one
  `components/design/design-screen-shell.tsx`, desktop-pixel-identical, and add the phone layout
  there once. Fixing the layout five times is the phase's main risk.
- **The `dvh` root and Next 16's `viewport` export land early**, in `app/layout.tsx`, before any
  per-screen work.
- **Playwright is installed in this phase** (`@playwright/test`, dev dependency only) with iPhone
  and Android device profiles — the milestone's only new dependency. Until it lands, desktop
  regression protection is a disciplined manual mouse-and-keyboard pass that each plan's
  verification states explicitly.
- **Touch drag reuses the Pointer Events + `setPointerCapture` + `touch-action: none` pattern**
  already running in `outline-viewer.tsx` and `rocker-viewer.tsx`. No gesture library; no
  duplicate mouse handlers beside the pointer handlers.
- **A phone layout that "works" by hiding a control is a regression, not a fix.** The two
  deliberate exceptions and why they are not regressions are in D-05.
- **Station spacing is measured during planning** before a new hit-zone radius is chosen — today's
  `DRAG_HIT_PX = 15` gives a 30px target, under the 44px guideline.
- **Typed fields get 16px text on touch** so iOS stops zooming on focus (`measure-field.tsx` is
  14px today); the viewers get `select-none` and `-webkit-touch-callout: none` so the long-press
  popup cannot fire mid-drag.
- **No pinch-zoom**: the drawings fill the phone's width instead.
- **The units rules do not move.** Every number on the new phone surfaces reads through
  `lib/geometry/measure-display.ts` under the v1.1 dims-in-cm / marks-in-mm split, and new
  design-screen files join `lib/units-isolation.test.ts`.

### Where the drawing sits while you work
- **D-01: The drawing is pinned at the top and the controls scroll beneath it.** On an upright
  phone the drawing takes about two-thirds of the screen height and the controls region the
  remaining third; the controls region is the phone's one scroller, so a slider low in the list
  is thumbed while the board changes in view above it. The two-thirds figure is a ceiling, not a
  rule: a screen whose drawing needs less (a flat side profile, a rail cross-section) gives the
  rest to the controls. The alternatives — one long scrolling page, controls first, a
  Drawing/Controls switch — were set aside because each makes a shaper move a slider blind.
- **D-02: On the phone the drawing is the control wherever it can be.** The drag points and, where
  they do not clutter the small drawing, the construction lines are **on by default** on phones.
  Desktop keeps exactly what it has today: the construction overlay off by default behind its
  toolbar toggle (PHON-05). The toggle itself stays on the phone too, so a shaper can turn the
  overlay off; only its default flips. The founder's words: "no need to duplicate a slider for
  what a visual can do already."
- **D-03: Sliders that duplicate a draggable point fold into one closed "Fine adjust" group** at
  the bottom of the controls, so exact numbers stay reachable without cluttering the screen.
  Folding is not hiding: the control is one tap away and PHON-01 holds. Which sliders are
  duplicates is fixed by what the drag solvers actually set (`lib/geometry/outline-drag.ts`,
  `lib/geometry/rocker-drag.ts`):
  - **fold on TEMPLATE:** Width and Offset (the widepoint), Tail Rail and Nose Rail (the two rail
    handles), Tail Angle and Fullness, Nose Angle and Fullness (the two tip handles);
  - **fold on ROCKER:** Nose Angle, Nose Smoothness, Nose Flatness, Tail Flatness, Tail
    Smoothness, Tail Angle (the four curve handles);
  - **stay in the open:** Board Length (typed field and its Imperial feet/inch selects), Nose
    Rocker and Tail Rocker (tip lift is deliberately not draggable — a headline number a shaper
    quotes), all five foil thicknesses, every control on RAILS, FINS and VOLUME, and every
    non-slider control (tail shape, fin system, checkboxes).
  Whether the group starts open or closed is not saved with a board and never reaches the design
  snapshot; it is screen state like an open sidebar section. — **Reversibility:** reversible —
  un-folding is a layout change in the shell, no data moves.
- **D-04: Data tables keep their columns and scroll sideways inside their own box.** The rocker
  DATASHEET, the rails DATA table and the fins data panel are the sheets a shaper reads on paper;
  on a phone the table's box scrolls sideways and the page never does. No re-stacked per-station
  layout — that would be a second layout of every table to keep right in both systems.
- **D-05: The two deliberate exceptions to the no-hidden-controls rule**, recorded so the verifier
  does not flag them:
  1. the **rotate button is absent on phones** (D-11): turning the phone now does that job, so
     nothing a desktop shaper can do is unreachable — it is reached by turning the phone;
  2. the **View Full Sized dialog's on-screen check bar and 100%-zoom caveat are absent on
     phones** (D-13): the view is not true size there, so a true-size check would mislead; the
     Print button and the printed bar remain.
  Nothing else is removed on a phone. D-03's fold and D-12's one-at-a-time rails are not
  exceptions: the control or drawing is one tap away.

### Getting from screen to screen
- **D-06: A bottom tab bar holds the six screens** — TEMPLATE, ROCKER, RAILS, VOLUME, FINS,
  SUMMARY, in today's `NAV_LINKS` order — along the bottom of the phone, under the thumb, one tap
  away, with the current screen marked the way the desktop link is. It is bottom-anchored, so it
  carries the safe-area inset (`env(safe-area-inset-bottom)` with `viewportFit: "cover"`) — the
  roadmap expected Phase 10 to enumerate bottom-anchored controls once placement was known; this
  is that placement, decided now. A scrolling strip under the wordmark, a menu button and
  previous/next arrows were considered and set aside (far from the thumb, two taps per screen,
  four taps from TEMPLATE to FINS respectively).
- **D-07: Each tab is a label only**, in the app's small-caps heading treatment (the same tracked
  uppercase the nav links and `TabbedPanel` tabs carry). No screen icons are invented.
- **D-08: The top bar keeps the wordmark and Save; the gear and the account control go behind one menu button.** Save keeps its wording (Saved / Saving / Unsaved) so a shaper can read the save
  state at a glance. Units and Theme (today's `SettingsMenu`) and the account control (today's
  `NavAuthControl`) are reached from the one menu. Phase 9's job is that they are reachable there;
  the account menu's own flows on a phone are Phase 10's (PHON-07).

### Which way the board faces on a phone
- **D-09: The board follows the phone.** On both the TEMPLATE and ROCKER screens the board stands
  nose-up when the phone is upright and lies flat (nose left) when the phone is sideways. The
  founder's words, given twice: "vertical when phone vertical, horizontal when phone horizontal".
  Nose-up in portrait means the outline and the side profile both use the tall pinned area
  (D-01). Orientation is view state, not design data — never saved, never in the snapshot —
  exactly as today's `orientation` state on both editors.
- **D-10: Desktop orientation is untouched.** the desktop default and its rotate button behave
  exactly as today (PHON-05).
- **D-11: The rotate button is absent on phones.** The phone's own orientation is the only
  orientation control there (exception 1 in D-05). Considered and set aside: keeping it as a
  manual override.
- **D-18: ROCKER keeps D-09's nose-up reading and its pinned drawing area gets the same 66dvh ceiling as TEMPLATE; a rocker drawing narrower than the full phone width is accepted.** Measured during
  planning (2026-09-08) by running `rockerViewLayout()` from `components/rocker/rocker-view-frame.ts`
  at real phone sizes: nose-up, the rocker frame is about 0.55–0.64 wide for every 1.0 tall (the card
  rails reserve a fixed band on the cross axis), so it is height-bound on every phone. At the UI-SPEC's
  original 45dvh the 74" default drew 181px wide on a 375×667 iPhone SE (half the screen) and 229px on a
  390×844 iPhone 14; at 66dvh it draws 266 × 400px and 336 × 506px. Lying the rocker flat would have
  filled the width at about 20dvh (board 342–375px long) but the founder chose to keep the board
  standing with the phone. For ROCKER, PHON-06's "full width" is read as "the board's long axis fills
  the pinned area" — the verifier must not fail ROCKER because the drawing does not touch both edges.
  TEMPLATE, RAILS and FINS keep the full-width reading.
- **D-12: The RAILS screen shows one cross-section at a time on a phone**, with a Nose / Centre /
  Tail switch — the idiom Phase 8 built into the View Full Sized dialog (Phase 8 D-12). Each rail
  gets the full width and fits the pinned area. The existing per-section open/closed state in
  `rail-band-editor.tsx` (`sectionOpen`) can drive which rail shows first. Stacking all three
  inside the drawing area (a scroller inside the pinned area) and letting the width solver shrink
  them side by side (about 120px each) were set aside.
- **D-13: View Full Sized on a phone shrinks the rail to fit the width; Print still prints true size.** The founder: "no need to see full size on the phone since it'll almost always be too
  small, but printing full size is still required." On a phone the dialog shows one plain line —
  shown smaller than true size, Print for the full-sized rail — and neither the on-screen 2-inch
  check bar nor the 100%-zoom caveat (exception 2 in D-05). The print path is unchanged: it draws
  in CSS inches under `app/design/rails/actual-size.css` and does not depend on the screen size,
  so the printed rail stays ruler-true from a phone. Desktop keeps the true-size view, the bar and
  the caveat exactly as Phase 8 built them (RAIL-04).

### Dragging with a thumb
- **D-14: PHON-04's "foil points" are read as the rocker screen's existing points.** The foil has
  no drag points today — it is five sliders on the ROCKER screen — and the rocker's draggable
  points are its four Bezier curve handles (`SideProfileDragTarget`: tail tip, tail flat, nose
  flat, nose tip), not the tip lifts. The thumb-drag work therefore covers the outline's five
  points (`OutlineDragTarget`: widepoint, tail rail, nose rail, tail, nose handles) and the
  rocker's four handles. The foil stays slider-only on phone and desktop; adding foil drag is a
  new inverse-geometry capability and is deferred below. No new geometry, desktop unchanged.
- **D-15: When finger-sized hit zones would overlap, the nearest point to the touch wins.** One
  hit test picks the closest point within finger reach, so zones can be as big as a finger
  without fighting each other. It is the same rule for mouse and touch; at desktop scale the
  existing 15px circles do not overlap, so desktop behaviour is unchanged by construction. The
  nearest-point pick belongs beside the drag solvers in `lib/geometry/` with tests (Rule 1),
  since it decides which spec field a gesture changes. Shrinking the zones on crowded boards and
  drawing-order-wins were set aside.
- **D-16: A touch starts moving the point straight away**, exactly as a mouse press does — one
  pointer path for both. No movement threshold. The drawing is pinned (D-01), so a touch on it can
  never be mistaken for a page scroll, which is what makes `touch-action: none` on the whole
  drawing harmless on a phone.
- **D-17: While a finger drags a point, a temporary readout appears beside it** showing the same
  words and numbers as the slider(s) that point drives — the widepoint shows `Width — 19 1/4"`
  and `Offset — 2"`, a rocker tip handle shows `Nose Angle — 45°` and `Nose Smoothness — 60%`, in
  the shaper's chosen system through `measure-display.ts`. It sits clear of the finger (above it),
  appears on touch only — never for a mouse (PHON-05) — and goes when the finger lifts. Because
  it uses the sliders' own label text and formatting, it can never disagree with the Fine adjust
  group. This is a label, not the deferred magnifier or drag-with-offset aid: it changes nothing
  about where the point goes. Bare numbers without names were set aside (a handle that sets two
  things would show two unlabelled numbers).

### Claude's Discretion
- **Landscape layout.** The founder's rule covers the board (D-09); the layout around it on a
  sideways phone was not decided. Recommendation, to be followed unless the UI-SPEC finds a
  reason not to: when the viewport is wide enough for the desktop shell's own minimum (the
  340px sidebar beside the 480px canvas, about 820px), the screen returns to sidebar-beside-
  drawing with the board lying flat — an iPhone 14-class phone sideways is 844px and fits;
  a smaller phone sideways (an SE at 667px) stays stacked with a flat board. Touch sizing still
  applies in either layout because it follows the finger, not the width (next item). Where the
  six screen tabs sit in landscape — the bottom bar staying, or a compact row at the top if it
  fits — is the planner's, with one constraint: every screen stays one tap away.
- **What triggers what.** Recommendation: the stacked layout is a viewport-width breakpoint
  (declared once in `app/globals.css`'s `@theme static`), while finger-sized targets, 16px
  inputs, the enlarged hit zones, the on-by-default overlay and the drag readout follow the
  pointer (`@media (pointer: coarse)` / `hover: none`) so a touchscreen laptop gets the touch
  treatment and a desktop mouse never does.
- **The shell's exact numbers:** the pinned area's height per screen and orientation, how the
  `TabbedPanel` strip sits above the pinned drawing, the Fine adjust group's wording and
  position, the sideways-scroll affordance on the tables, what the VOLUME screen (a card, not a
  drawing) does with the pinned/scroll split (recommendation: one column, card then controls,
  nothing pinned), and how the rails INSTRUCTIONS tab — a long read-only page — scrolls
  (recommendation: it scrolls as a whole with the controls region collapsed, since no control
  applies to it).
- **"Construction lines where possible."** Which construction lines stay on by default on the
  small drawing without cluttering it is judged per screen; the drag points themselves are
  always on (D-02).
- **The one menu** behind the gear/account button: its shape, whether `SettingsMenu` and
  `NavAuthControl` render inside it or it opens each in turn; Phase 10 will test the account
  flows in it.
- **The drag readout's look**: its chip styling (`CalloutChip` in `callout-primitives.tsx` is the
  obvious idiom), its exact offset above the finger, and how it behaves at a drag limit.
- **The sign-in nudge banner** (`SignInBanner`, mounted for every design screen in
  `app/design/layout.tsx`) takes height above the pinned drawing; keep it compact and
  dismissable as it is, and let Phase 10 own sign-in itself.
- **The fins viewer and the rails INSTRUCTIONS figure** simply fit the phone's width; no
  orientation rule applies to them.
- **Proving "desktop-pixel-identical"** for the shell extraction: recommendation is Playwright
  desktop-viewport screenshots of all five screens before and after, diffed, the way Phase 7
  diffed PDFs — but the planner picks the mechanism.
- **Playwright and CI.** Not discussed; recommendation: the phone suite gates every push in the
  existing GitHub Actions workflow beside the geometry suites (browser install adds a minute or
  two), and a desktop mouse-drag test on the outline viewer joins the phone tests as PHON-05's
  standing proof. Device profiles: an iPhone and a Pixel-class Android from Playwright's
  `devices` list; exact models are the planner's.
- **Which rail shows first** on the phone's RAILS screen (D-12): the first open section, Nose
  when all are collapsed — the rule Phase 8's dialog already uses.

### Folded Todos
- **Mobile/phone-width layout polish for the design screens**
  (`.planning/todos/pending/2026-08-19-mobile-phone-width-layout-polish.md`, `resolves_phase: 9`)
  — the Phase 1 deferral: at about 375px the sidebar and viewer columns overlap instead of
  stacking, on every design screen, and the nav shrinks to its own minimum width and stops. This
  phase closes it: the shell extraction and D-01 replace the overlap with the stacked layout, and
  D-06 to D-08 replace the nav's minimum width with the bottom tab bar and compact top bar. Its
  suggested fix — a single breakpoint on a shared shell — is exactly the inherited constraint
  above.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap, requirements and research
- `.planning/ROADMAP.md` — Phase 9 goal, success criteria and the "Settled findings that
  constrain this phase" block (shell first, `dvh`/viewport early, Playwright now, the pointer
  pattern, hiding is a regression, measure spacing before choosing a radius); the Phase 10 block
  that says which phone work is *not* this phase's.
- `.planning/REQUIREMENTS.md` — PHON-01 to PHON-06 and TEST-01; the Future Requirements list
  (pinch-zoom, magnifier, calibrated view, printing from a phone) and Out of Scope (view-only mode,
  gesture libraries, auto-detecting screen size).
- `.planning/research/SUMMARY.md` — the v1.2 research: stack (no new runtime dependency,
  Playwright dev-only, Tailwind v4 breakpoints and container queries, Base UI touch handling),
  the architecture's named components, pitfalls 1, 4 and 5 for this phase, the phone-sizing
  guidance (44px-class targets).
- `.planning/research/STACK.md`, `.planning/research/PITFALLS.md`,
  `.planning/research/ARCHITECTURE.md` — the detail behind the summary: the iOS traps present
  today (`h-full`/`overflow-hidden` viewport chain, 14px inputs, missing `select-none`,
  `touch-action` coverage), the "What NOT to Use" table, the `DesignScreenShell` sketch.

### Prior decisions this phase inherits
- `CLAUDE.md` — Rule 1 (geometry pure and tested; the nearest-point pick in D-15 lives under it),
  Rule 2 (dims in cm, marks in whole mm, one display boundary; the readout in D-17 and the Fine
  adjust labels read through it), "Users are shapers, not developers".
- `.planning/phases/08-the-rails-screen-finished/08-CONTEXT.md` — D-12 (the single View Full
  Sized button and its Nose/Center/Tail tabs, the idiom D-12 here reuses), D-13 to D-16 (the
  1:1 drawing, the check bar, the print path and the caveat that D-13 here changes on phones
  only), D-06/D-07 (shaper preferences live outside the board — the model for keeping
  orientation, the overlay default and the Fine adjust state out of the snapshot).
- `.planning/milestones/v1.1-phases/06-the-design-screens-in-metric/06-CONTEXT.md` — D-01 (the
  cm/mm table), D-09/D-10 (units on standalone values and in table headers, which the readout
  and the sideways-scrolling tables must keep), the slider-stepping rules every folded slider
  keeps.
- `.planning/sketches/MANIFEST.md` — the callout grammar: labels are SVG text that scales with
  the drawing (decision 8), nothing inside the outline but faint lines (decision 5), outputs on
  the right rail and inputs in the left gutter (decision 6) — the readout in D-17 must not break
  these on the drawing itself; it is a transient chip beside the finger.
- `.planning/quick/` entries `260829-t47` and `260829-snm` (via `lib/geometry/rocker-drag.ts`'s
  header) — why the rocker's four handles, not its tip lifts, are what a shaper drags; the basis
  of D-14's reading of PHON-04.

### Folded todos
- `.planning/todos/pending/2026-08-19-mobile-phone-width-layout-polish.md`

### Follow-up filed during this discussion (Phase 8 surface, not Phase 9 work)
- `components/rails/view-full-sized-dialog.tsx` and `app/design/rails/actual-size.css` — the
  print bug in the deferred section below; read before touching D-13 so the phone note and the
  print fix do not collide.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **The five editor shells** — `components/outline/outline-editor.tsx`,
  `components/rocker/rocker-editor.tsx`, `components/rails/rail-band-editor.tsx`,
  `components/fins/fin-placement-editor.tsx`, `components/volume/volume-estimator.tsx` — share
  one markup: a root `flex min-h-0 w-full flex-1 flex-nowrap`, an `aside` of
  `max-w-[400px] flex-1 basis-[340px]` with a `p-10 overflow-y-auto` body, and a `main` of
  `basis-[480px] p-3 bg-surf-canvas` holding a `TabbedPanel`. This is what
  `design-screen-shell.tsx` extracts. Outline and rocker also carry a `wideView` sidebar toggle
  and `showConstruction` / `orientation` view state that the shell's phone mode reads (D-02,
  D-09).
- `components/viewer/tabbed-panel.tsx` — `TabbedPanel` with its `bare` prop and the lesson in
  its doc comment (keep the same component at the same tree position so a toggle never tears
  down the drawing). The rails Nose/Centre/Tail switch (D-12) can be a `TabbedPanel` or the
  two-option toggle's three-option sibling.
- `components/viewer/two-option-toggle.tsx`, `components/viewer/toolbar-button.tsx`
  (`ViewerToolbarButton`, slots 0–3) — the segmented toggle and the toolbar-button idiom; the
  rotate, construction and wide-view buttons on the viewers use the latter, and the phone shell
  decides which slots render (D-02, D-11).
- `components/design/slider-row.tsx` (`SliderRow`, `sliderValue`) and
  `components/design/measure-field.tsx` — every sidebar slider and typed field goes through
  these two, so finger sizing and 16px-on-touch land once. `SliderRow`'s `label — displayValue`
  text is exactly what the drag readout shows (D-17).
- `components/ui/slider.tsx` — the Base UI slider: a `size-3` thumb with an `after:-inset-2`
  pseudo-element (a 28px hit area today) and a `touch-none select-none` control; `.slider-accent`
  in `app/globals.css` styles it once for all fourteen call sites. `components/ui/button.tsx`
  sizes (`h-8` default, `size-8` icon) and `components/ui/input.tsx` (`text-base md:text-sm` —
  already 16px below `md`) are where PHON-03 sizing lives.
- `lib/geometry/outline-drag.ts` (`outlineDragPoints`, `solveOutlineDrag`,
  `OUTLINE_DRAG_LIMITS`) and `lib/geometry/rocker-drag.ts` (`sideProfileDragPoints`,
  `solveSideProfileDrag`) — enumerate every draggable point in board coordinates and hold the
  "every result is slider-representable" rule. The nearest-point pick (D-15) is a pure function
  beside them; the readout (D-17) reads the same spec fields they set.
- `components/outline/outline-viewer.tsx` and `components/rocker/rocker-viewer.tsx` — the
  Pointer Events drag path (`onPointerDown/Move/Up`, `setPointerCapture`, `touch-none` on the
  hit circle, `DRAG_HIT_PX = 15`, `handleUnit` scaling), the rotate/orientation support and the
  construction overlay both phone rules build on.
- `components/viewer/callout-primitives.tsx` — `CALLOUT_PX`, `useSvgFitScale`,
  `pinnedCalloutSizes`, `CalloutChip`: the label sizing that keeps callouts legible as the
  drawing shrinks to phone width, and the chip idiom for the readout.
- `components/rails/rail-band-editor.tsx` — `sectionOpen`, the `RailPage` tabs and the
  plot-width solver (`plotWidth`, `ResizeObserver`) that D-12 replaces on phones with one plot at
  a time; `components/rails/view-full-sized-dialog.tsx` — `max-w-[95vw] max-h-[90dvh]
  overflow-y-auto`, the check bar, the caveat and the Print button D-13 adjusts on phones.
- `components/template/export-preview-dialog.tsx` (`max-h-[85dvh]`) — the app's one existing
  `dvh` use; the precedent for the root fix.
- `components/site-nav.tsx` (`NAV_LINKS`, `data-print-hide`), `components/settings-menu.tsx`,
  `components/auth/nav-auth-control.tsx`, `components/design/save-button.tsx` — the pieces the
  bottom tab bar and the compact top bar (D-06 to D-08) rearrange.
- `app/layout.tsx` — `html.h-full`, `body.h-full overflow-hidden`, no `viewport` export yet; the
  documented height chain the `dvh` root replaces. `app/design/layout.tsx` — the
  `min-h-0 flex-1` passthrough and `SignInBanner`.
- `app/globals.css` — `@theme static` (breakpoints declared here, never inline), the four
  themes, `@media print`, `.slider-accent`.
- `lib/units-isolation.test.ts` — the ledger every new design-screen file joins.
- GitHub Actions already runs `npm test` on every push (Phase 3); the Playwright job joins it.

### Established Patterns
- **View state is local and never saved:** `orientation`, `showConstruction`, `wideView`,
  `sectionOpen`, the active tab — all `useState` in the editors, none in the design store or the
  snapshot. The phone's orientation rule, overlay default, Fine adjust fold and rails section
  switch all follow this; `DESIGN_SNAPSHOT_VERSION` does not change.
- **One pointer path:** the viewers handle mouse and touch through Pointer Events alone; adding
  touch means enlarging and reordering what that one path hits, not adding handlers.
- **One definition per formula:** drag solvers import bounds from `outline.ts`/`rocker.ts`,
  never restate them; the nearest-point pick and the readout inherit that discipline.
- **Say it once:** `SliderRow`, `TabbedPanel`, `.slider-accent` and `measure-field.tsx` exist
  because the codebase was bitten by copies drifting; the shell extraction is the same move for
  layout.
- **Untouched means unchanged:** every milestone has proven the unchanged path byte-for-byte or
  pixel-for-pixel (Phase 7's 68 identical PDF pages). Desktop-pixel-identical here is proven the
  same way, mechanism at the planner's discretion.
- **Two print pipelines:** the View Full Sized print is live React under `@media print` in CSS
  inches (`actual-size.css`); D-13 changes only the screen presentation on phones and leaves
  that path alone.

### Integration Points
- `components/design/design-screen-shell.tsx` (new) — the aside/main layout, the phone stack
  (D-01), the pinned area, the Fine adjust slot (D-03), the pointer/width switches.
- The five editors — replace their duplicated shell markup with the shared component; outline and
  rocker hand the shell their orientation and overlay state (D-02, D-09, D-11).
- `app/layout.tsx` — `dvh` root, `viewport` export (`viewportFit: "cover"`,
  `interactiveWidget`), the bottom tab bar and compact top bar mount (D-06 to D-08).
- `components/site-nav.tsx` — becomes the phone-aware nav or gains a sibling for the bottom bar.
- `components/ui/slider.tsx`, `components/ui/button.tsx`, `components/design/measure-field.tsx`,
  `components/design/slider-row.tsx` — PHON-03 sizing and 16px-on-touch.
- `components/outline/outline-viewer.tsx`, `components/rocker/rocker-viewer.tsx` — hit-zone
  radius on touch, nearest-point pick (D-15), readout (D-17), `select-none` and callout
  suppression, overlay default (D-02).
- `lib/geometry/outline-drag.ts`, `lib/geometry/rocker-drag.ts` (+ tests) — the nearest-point
  helper (D-15).
- `components/rails/rail-band-editor.tsx` — one-at-a-time rails on phones (D-12);
  `components/rails/view-full-sized-dialog.tsx` — the phone note and the absent bar/caveat
  (D-13), coordinated with the print follow-up below.
- `lib/units-isolation.test.ts` — new files join the ledger.
- `package.json`, a `playwright.config.ts`, an `e2e/` (or `tests/`) directory, the GitHub Actions
  workflow — TEST-01.

</code_context>

<specifics>
## Specific Ideas

- "Default to control points on and construction lines where possible, and the slider controls
  only for everything else — no need to duplicate a slider for what a visual can do already."
  The drawing is the phone's primary control; the sliders are for what a drawing cannot do.
- "Vertical when phone vertical, horizontal when phone horizontal" — said for the outline and
  again for the rocker: the phone's orientation is the board's orientation, and the rotate button
  has no job left on a phone.
- "No need to see full size on the phone since it'll almost always be too small, but printing
  full size is still required." — the screen may shrink; the paper may not.
- The readout by the finger uses the slider's own words and number, so what a thumb sees and what
  the Fine adjust group says can never disagree.

</specifics>

<deferred>
## Deferred Ideas

- **Phase 8 follow-up bug, reported during this discussion (fix via `/gsd-quick`, not this
  phase):** the View Full Sized rail print shows the check-bar caption but no bar, and nothing on
  the page names which rail printed. Diagnosis from the code: the bar is a plain `div` with a
  background colour (`bg-[var(--color-surf-ink)]` in
  `components/rails/view-full-sized-dialog.tsx`), which browsers drop on paper unless "Print
  backgrounds" is on — draw it as a border or an SVG rect instead; and the dialog title
  (`{Section} Rail — Actual Size`) is inside the `data-print-hide` header, so a print-only
  heading naming the rail is needed. The print output is a Phase 8 surface in the units ledger;
  re-prove the printed rail ruler-true in both systems after the fix.
- **Foil drag points** — five draggable deck-thickness stations on the ROCKER screen, on desktop
  and phone. New inverse geometry under Rule 1 (a `lib/geometry/foil-drag.ts` with tests and
  fixtures) and a desktop behaviour change, so its own requirement in a later phase (D-14).
- **Landscape phone tab placement and the exact landscape layout** — decided here only as a
  recommendation (Claude's Discretion); revisit if the UI-SPEC or real-device use in Phase 10
  finds it wrong.
- Already on the requirements' future list, restated so nobody re-derives them: pinch-zoom and
  pan on the viewers; a magnifier or drag-with-offset aid; a calibrated (credit-card) actual-size
  view; printing from a phone.

### Reviewed Todos (not folded)
- **Copy-spec-to-clipboard across the design screens**
  (`.planning/todos/pending/2026-08-21-copy-spec-to-clipboard.md`) — a new capability across four
  screens; the same verdict as Phases 5–8. When it lands, its buttons must be finger-sized on
  the phone shell.
- **Finished-board photo uploads with ratings**
  (`.planning/todos/pending/2026-08-19-add-finished-board-photo-uploads-with-ratings.md`) —
  unrelated capability.
- **Fins imported tail uses the generic polynomial curve**
  (`.planning/todos/pending/2026-08-21-fins-imported-template-width-branch.md`) — fins curve
  behaviour, unrelated.
- **Extend presets to rail bands and fin setups**
  (`.planning/todos/pending/2026-08-21-presets-for-rails-and-fins.md`) — its own capability.
- **Bottom contours**
  (`.planning/todos/pending/2026-08-23-build-in-bottom-contours-with-shading-and-selectable-shapes.md`)
  — new capability needing its own requirement and roadmap slot.
- **Brand the order form for paid shapers**
  (`.planning/todos/pending/2026-09-06-brand-the-order-form-for-paid-shapers.md`) — the first
  paid-tier candidate; waits on real shapers using the free version.

</deferred>

---

*Phase: 09-the-design-screens-on-a-phone*
*Context gathered: 2026-09-08*
