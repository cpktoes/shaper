# Phase 10: The Whole App on a Phone - Context

**Gathered:** 2026-09-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Everything AROUND the five design screens works on a phone too, and the whole trip is proven in a
shaper's hand on real devices: sign in, pick a preset, open a saved board from the rack, work
through the design screens, save, read the summary.

**In scope:** the setup screen (preset cards + the saved-board rack), the rack's card actions and
their dialogs, sign-in/sign-up and the account control, the top nav's menu, the bottom tab bar's
behaviour on the home route, the summary read on a phone, and one end-to-end sweep on a real
iPhone and a real Android with desktop mouse/keyboard behaviour unchanged.

**Out of scope:** the five design screens themselves (Phase 9 did those), the rails screen's own
surfaces (Phase 8), any new capability — see Deferred Ideas.

</domain>

<decisions>
## Implementation Decisions

### Picking a board on a phone

- **D-01:** **The preset cards shrink their drawing on a phone and stay one per row.** Measured
  today: a card is 343 x 693px on a 375 x 812 phone, the board drawing is 76% of it (529px tall),
  and the name + dims + descriptor + "Start Shaping" together are only 79px — so four-to-five
  boards cost 4.2 screens of scrolling. Cap the drawing on a phone so a card lands around
  280-320px and two-and-a-bit boards are visible at once. **The drawing must stay large enough to
  tell the outlines apart** — that is what a shaper is choosing on; planning measures the smallest
  drawing that still reads before fixing a number. Rejected: a two-up grid (drawings fall to
  ~150px wide, silhouettes only) and a sideways swipe carousel (biggest drawings, but you cannot
  compare two boards and it is a new interaction pattern this app does not have).

- **D-02:** **The saved-board rack cards follow the same rule as the presets.** One card system on
  the setup screen, not two stacked. Whatever D-01 settles applies to both.

### The rack's card actions

- **D-03:** **The five dialogs get touch sizing and stay centred.** `rename-dialog.tsx`,
  `board-name-prompt.tsx`, `delete-confirm-dialog.tsx`, `replace-board-dialog.tsx` and
  `sign-in-dialog.tsx` have zero touch handling today. Finger-sized buttons, **16px text inputs so
  iOS stops zooming on focus** (the rule `measure-field.tsx` already follows since Phase 9), and
  enough width on a narrow screen. Rejected: bottom sheets and full-screen dialogs — both are a
  second layout for five dialogs and a pattern the app does not have; a rename should not feel like
  a page you have to leave.
  **Measure, do not assume:** a centred dialog carrying a text input can be covered by the iOS
  keyboard. Planning measures this on a real device and only fixes it if it actually bites.

- **D-04:** **Deleting a board keeps exactly today's safety — the confirm dialog, thumb-sized.**
  It already names the board and says it cannot be undone. With a 44px target the mis-tap risk is
  the same as anywhere else in the app. No undo and no trash: that is a new capability, deferred.

### Signing in on a phone

- **D-05:** **Clerk's `<UserButton />` is measured before anything is written around it.** If it
  clears 44px on a phone, Clerk's component is left completely alone. If it does not, wrap it in a
  44px tap target **without changing how it looks** — the same trick the app already uses for small
  icon controls. Do not write a wrapper that might be doing nothing.

- **D-06:** **The signed-out "Sign in" row in the nav menu is sized for a finger.** Measured at
  **20px tall** today (`nav-auth-control.tsx` renders a bare `<button>` with text styling only) —
  the one control in that menu under the guideline.

### The gear menu and the bottom tab bar

- **D-07:** **The bottom tab bar is hidden on the home screen until a board is picked.** The six
  design tabs are noise while you are still choosing a board, and hiding them gives back roughly
  50px of screen to the cards D-01 is already shortening. Note the mount point: `app/page.tsx`
  mounts `PhoneTabBar` as the last child of a single returned fragment precisely so it mounts once
  across the signed-in and signed-out branches — whatever implements this must not reintroduce two
  copies.

### Claude's Discretion

- The exact card height and drawing cap in D-01, chosen from a measurement of the smallest drawing
  that still distinguishes the outlines.
- Whether the dims line, descriptor and "Start Shaping" all survive at the shorter card height, and
  in what order.
- Placement of the Delete button inside the confirm dialog relative to where the menu's Delete row
  sat (raised as an option, not chosen — the founder took plain thumb-sizing as sufficient).
- Everything not listed as a decision above: the researcher and planner read the code.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap, requirements and the phase's own settled findings
- `.planning/ROADMAP.md` §"Phase 10: The Whole App on a Phone" — goal, the four success criteria,
  and the five settled findings that constrain this phase (real-device verification, why the sweep
  sits last, safe-area handling enumerated at planning time, research skippable).
- `.planning/REQUIREMENTS.md` — PHON-07, PHON-08, PHON-09, PHON-10.

### Prior decisions this phase inherits (do not re-derive)
- `.planning/phases/09-the-design-screens-on-a-phone/09-CONTEXT.md` §"Inherited constraints" — the
  `dvh` root and Next 16 `viewport` export, Playwright with iPhone/Android profiles, the Pointer
  Events + `setPointerCapture` + `touch-action: none` drag pattern, 16px typed fields on touch,
  `select-none` / `-webkit-touch-callout: none` on viewers, no pinch-zoom, and **"a phone layout
  that works by hiding a control is a regression, not a fix"**.
- `CLAUDE.md` §Layout — the `shell` breakpoint (820px) decides which LAYOUT renders; the `coarse`
  pointer variant decides how BIG a control draws. **Width picks layout, pointer picks sizing, and
  the two are never conflated.** This phase's work is almost entirely `coarse:`, not `max-shell:`.
- `CLAUDE.md` §"Rule 2" — every number on these surfaces reads through
  `lib/geometry/measure-display.ts` under the dims-in-cm / marks-in-mm split.

### The print path, which moved under this phase's feet today
- `.planning/quick/260910-2ny-size-each-order-form-sheet-to-the-real-p/260910-2ny-PROBE-READING.md`
  and `-PROBE-READING-2.md` — two measured iPhone printouts establishing that iOS Safari resolves
  `vw`/`vh` against the screen, ignores `@page` margins, honours forced page breaks, fires
  `beforeprint`, and does not honour an absolute inch width.
- `.planning/quick/260910-2ny-.../260910-2ny-BROWSER-READING.md` — the shipped fix's measurements.

</canonical_refs>

<code_context>
## Existing Code Insights

### Already done — do not plan work for these (measured 2026-09-10)
- **`components/setup/rack-card-menu.tsx` is finished.** The trigger carries `coarse:size-11` (44px
  measured) and the Rename / Duplicate / Delete rows carry `coarse:min-h-11`.
- **The nav menu's units and theme rows are already 46px** — every one of the seven
  `menuitemradio` rows in `components/settings-menu.tsx`, despite that file containing no `coarse:`
  variant at all. Its height comes from its content. Measure before "fixing" it.
- **The hamburger trigger in `components/site-nav.tsx` is already 44 x 44.**
- **The summary screen reads on a phone**: no sideways scroll, the control row wraps, and the
  Print Order Form button sits fully on screen (verified repeatedly on 2026-09-10 during quick
  tasks 260910-0b1, -2ny, -jfp and -kz2).

### Reusable Assets
- `components/design/phone-tab-bar.tsx` — reads `usePathname()` and already knows the six design
  routes; D-07 needs a home-route rule here or at its mount point, not a new component.
- `components/setup/setup-screen.tsx` — its root is `min-h-0 flex-1 overflow-y-auto`, which is what
  lets the scroller shrink above the tab bar with no bottom padding anywhere.
- `components/setup/card-metadata-line.tsx` — the dims line, already shared between preset and rack
  cards, so D-01/D-02 change one shared piece rather than two.
- `components/outline/outline-viewer.tsx` — preset cards draw through the real outline geometry, not
  a cached image, so a smaller card is a smaller viewer, not a different picture.

### Established Patterns
- `coarse:min-h-11` / `coarse:size-11` on a hand-rolled interactive row or icon button — the idiom
  `volume-controls.tsx`, `fin-controls.tsx`, `rail-controls.tsx` and `rack-card-menu.tsx` all use.
- `app/page.tsx`'s single-fragment mount for `PhoneTabBar`, deliberately shaped so the bar cannot be
  mounted twice across the signed-in / signed-out branches.

### Integration Points
- `components/auth/nav-auth-control.tsx` — the one file holding both the 20px signed-out button
  (D-06) and Clerk's `<UserButton />` (D-05).
- `components/auth/sign-in-banner.tsx` — mounted once in `app/design/layout.tsx`, so it appears on
  every design screen; its dismiss control has not been measured for a finger.

</code_context>

<specifics>
## Specific Ideas

- **Success criterion 3 is already overtaken.** It reads "printing stays a desktop job", written
  before quick task 260910-2ny made the order form print correctly from the founder's own iPhone —
  confirmed by him on 2026-09-10. Planning should treat phone printing as WORKING, not as
  out-of-scope, and the criterion should be read as "the summary and the on-screen order form are
  readable on a phone" with the printing clause struck.
- **Phase 9 explicitly deferred landscape phone tab placement to here.** It settled the landscape
  layout only as a recommendation under Claude's Discretion and said to revisit "if the UI-SPEC or
  real-device use in Phase 10 finds it wrong". The end-to-end sweep should look at it deliberately
  rather than by accident.

</specifics>

<deferred>
## Deferred Ideas

- **Undo, or a trash you can restore a board from** — raised while deciding D-04. A new capability,
  not phone work; belongs on the roadmap backlog with its own requirement.
- **The order form's front sheet clips below ~320 dots of page area** (85-91px at 268 dots, 7-14px
  at 300, none from 330 up). Measured during quick task 260910-kz2. 320 dots is ~3.3in of paper,
  narrower than a 4x6 photo, so no real paper reaches it. Recorded so it is not mistaken for a
  regression; not worth a phase.
- **Drawing labels at the extremes of page width** — 7.56pt at a 560-dot page and 8.56pt at 900,
  against 10.5-12pt at every width actually printed. Measured 2026-09-10; the founder chose to
  leave it.
- Carried forward from Phase 9 and unchanged: **foil drag points** (needs its own inverse geometry
  under Rule 1 and a desktop behaviour change), **pinch-zoom and pan on the viewers**, **a
  magnifier or drag-with-offset aid**, **a calibrated actual-size view**, and
  **copy-spec-to-clipboard** across the design screens.

</deferred>

---

*Phase: 10-The Whole App on a Phone*
*Context gathered: 2026-09-10*
