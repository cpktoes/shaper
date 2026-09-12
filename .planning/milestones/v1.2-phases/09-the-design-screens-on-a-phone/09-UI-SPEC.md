---
phase: 9
slug: the-design-screens-on-a-phone
status: approved
shadcn_initialized: true
preset: base-nova (components.json — baseColor neutral, iconLibrary lucide, no third-party registries)
created: 2026-09-08
reviewed_at: 2026-09-08
---

# Phase 9 — UI Design Contract

> Visual and interaction contract for putting the five design screens (TEMPLATE, ROCKER, RAILS,
> VOLUME, FINS) on a phone: the shared phone shell, the bottom tab bar and compact top bar, touch
> sizing, and thumb drag on the outline and rocker points (PHON-01..06, TEST-01). Every visual
> decision below is prescriptive so the executor needs no further design judgment; every
> "Claude's Discretion" item CONTEXT.md left open is settled here with a one-line rationale.
> Desktop is unchanged everywhere this contract applies a phone-only rule — see "Desktop untouched"
> in the Interaction & Layout Contract.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (already initialized — `components.json`) |
| Preset | `base-nova`, baseColor `neutral`, no third-party registries (`"registries": {}`) |
| Component library | Base UI (`@base-ui/react`) via shadcn's Base UI preset — not Radix |
| Icon library | lucide-react |
| Font | Inter (`--font-body`/`--font-display`, both aliased to `var(--font-inter)`) |

No new shadcn components are installed this phase. `Button`, `Slider`, `Checkbox` and `Input`
already exist under `components/ui/` and are reused, sized for touch by the rules below. The
phone's one menu button is built directly on Base UI's `Menu` primitives — the same way
`components/settings-menu.tsx` already is, not through a shadcn `dropdown-menu`/`popover`/`sheet`
wrapper (none of those three are installed, and this codebase deliberately keeps app-owned chrome
outside `components/ui/*` so it survives a shadcn regeneration). See Registry Safety below.

---

## Spacing Scale

Declared values (must be multiples of 4) — the app's existing scale, not a new one:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon/glyph gaps, chevron offsets |
| sm | 8px | Compact spacing (tab bar icon-to-label gap if any, legend gaps) |
| md | 16px | Default element spacing (top/bottom bar horizontal padding, card gaps) |
| lg | 24px | Section padding inside the controls scroller |
| xl | 32px | Layout gaps between major stacked blocks |
| 2xl | 48px | Not used by this phase's new surfaces |
| 3xl | 64px | Not used by this phase's new surfaces |

**Exceptions — already established in this codebase, not introduced here:** the app pervasively
uses Tailwind's half-steps inside control panels (`gap-3.5`, `px-1.5`, `mb-1.5`) and the design
sidebars' own `p-10` (40px) content inset. New phone-only surfaces in this phase — the bottom tab
bar, the compact top bar, the Fine adjust group, the drag readout chip — use **only** the 4pt
values above (`px-4` on the top bar, `px-2` on the tab bar with `px-1` per tab, `gap-4` between stacked screens on VOLUME). One
touch-only value is named here rather than left implicit: the slider thumb's hit-area inset grows
from `-inset-2` (8px, `sm`) to `-inset-4` (16px, `md`) under the coarse-pointer variant (see
Interaction & Layout Contract, Touch sizing) — both are steps in the table above, not a new
increment.

---

## Typography

Five rows: four roles plus one pointer-conditional touch variant of Body. Every size is one the app
already sets somewhere (14, 16, 12 and 11px) — no new size is introduced.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 14px (`text-sm`) | 400 | 1.5 — sidebar/controls copy, dialog captions, the phone View Full Sized note, print-note style text |
| Body (touch input variant) | 16px (`text-base`), via the `coarse:` custom variant | 400 | 1.5 — typed measure fields and any text input, so iOS never zooms on focus (PHON-03). Same role as Body, same weight, larger only where a finger is typing — see "What triggers what" below |
| Label | 12px (`text-xs`), `font-bold tracking-architectural uppercase` | 700 | 1 — the desktop nav links' own class string (`NAV_LINKS`), reused for the Fine adjust group's header text |
| Label (dense) | 11px (`text-[11px]`), `font-bold tracking-[0.1em] uppercase` | 700 | 1 — the bottom tab bar's six labels only: the nav's tracked-uppercase treatment one step denser so all six words fit a 360px phone (see The bottom tab bar). 11px bold is already an established UI size here — `TwoOptionToggle`'s option labels (`text-[11px] font-bold`, `components/viewer/two-option-toggle.tsx`) |
| Display | 12px (`text-xs`), `font-display font-bold tracking-architectural uppercase` | 700 | 1 — the `TabbedPanel`/Nose-Center-Tail tab strips carried onto the phone shell unchanged (VIEWER/DATA/INSTRUCTIONS, NOSE/CENTER/TAIL); these are `TabbedPanel`'s own tab classes byte-for-byte (`components/viewer/tabbed-panel.tsx`). Same size and weight as Label — the two roles differ only in `font-display`, which today resolves to the same Inter face |

No new callout-system sizes: the drag readout chip (D-17) is SVG text inside the drawing and reuses
the callout system's own pinned sizes — `CALLOUT_PX.value` (14px) for the number and
`CALLOUT_PX.name` (11px) for the label word (`components/viewer/callout-primitives.tsx`) — the same
two sizes every dimension callout on the board already uses. Those are drawing sizes scaled by
`useSvgFitScale`, not UI type roles, so the chip adds no size to the table above. Its words are
`SliderRow`'s own label and display value, so the text can never disagree with the Fine adjust group.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--surf-ground` / `--surf-canvas` | Page background, the pinned drawing's canvas |
| Secondary (30%) | `--surf-panel`, `--surf-sidebar` | The compact top bar, the bottom tab bar, the controls scroller's cards, the one menu's popup |
| Accent (10%) | `--surf-accent` / `--surf-accent-ink` | See reserved-for list below — never a default surface fill |
| Destructive | n/a | This phase introduces no destructive action |

**Accent reserved for, explicitly (nothing else in this phase's new surfaces takes it):**
- The bottom tab bar's active-screen indicator — a `border-t-2 border-surf-accent` rule above the
  active tab's label, the same accent the desktop nav already spends on its own active
  `border-b-2` underline (D-06's "marked the way the desktop link is").
- The drag readout chip's **value text** in `--surf-accent-ink`, drawn on the standard
  `CalloutChipFrame` surface (`var(--outline-page-bg)` fill, `var(--border)` stroke — the frame every
  dimension callout already uses, `components/viewer/callout-primitives.tsx`). The accent is in the
  ink, never the fill: a small, temporary, touch-only reading that marks itself as live UI rather
  than a permanent measurement on the board.
- The existing accent uses already proven in Phase 8 (the Print button, `ViewerToolbarButton`'s
  pressed state) are inherited unchanged wherever those components render inside the phone shell.

**Not accent:** the Fine adjust group's chevron and closed/open state (neutral `surf-ink-muted` /
`surf-ink`, not accent — folding a slider group is a layout convenience, not a call to action);
the sideways-scroll fade edge on data tables (a neutral gradient toward `--surf-panel`, not a
colour cue); the compact top bar's menu-button icon (neutral `surf-ink-muted`, matching the
desktop gear icon's own resting colour).

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Bottom tab bar labels | **TEMPLATE / ROCKER / RAILS / VOLUME / FINS / SUMMARY** — the words unchanged, byte-identical to today's `NAV_LINKS`, same order (D-06/D-07); set at the Label (dense) size so all six fit a phone (The bottom tab bar) |
| Top bar Save control | **Save / Saving… / Saved / Not saved** — unchanged: `SaveButton`'s own four strings (first save, in flight, settled, failed — tap to retry), reused as-is with no phone-specific rewording. CONTEXT.md's D-08 paraphrased these as "Saved / Saving / Unsaved"; the component has no "Unsaved" state, and this contract follows the component |
| Top bar menu button | Icon-only; accessible label **"Menu"** (`aria-label="Menu"`), lucide `MenuIcon` — a plain word for a control that now holds two unrelated things (units/theme and the account control), not "Settings" (which would undersell what's behind it) |
| Fine adjust group header | **"Fine adjust"** (D-03's own wording, verbatim) — closed by default, chevron indicates state, no further copy needed since the folded rows carry their own labels |
| Phone View Full Sized line (replaces the desktop check bar + caveat, D-13) | **"Shown smaller than actual size — tap Print for the full-sized rail."** One line, no calibration talk, ties directly to what a shaper can still do on the phone |
| Phone View Full Sized dialog title (D-13) | **"{Section} Rail"** (e.g. "Nose Rail") on a phone — the desktop title's "— Actual Size" suffix is dropped there along with the check bar and caveat, because on a phone the view is not actual size and the title must not say it is; desktop keeps "{Section} Rail — Actual Size" exactly as Phase 8 built it |
| Drag readout chip | **"{Slider label} — {displayValue}"** per driven field, one line each, stacked when a point drives two fields — e.g. the widepoint shows `Width — 19 1/4"` then `Offset — 2"`; a rocker tip handle shows `Nose Angle — 45°` then `Nose Smoothness — 60%`. Identical text to `SliderRow`'s own `label — displayValue` composition (D-17) — never a bare number |
| Sideways-scroll table hint | No copy — a visual fade edge only (Interaction & Layout Contract, Data tables), so the same affordance reads in both units systems without adding a string to translate per table |
| Empty/loading/error state | n/a — every phone surface in this phase renders the same design-store state its desktop counterpart already computes synchronously (proven in Phases 1–8); no new fetch, list, or fallible action is introduced. See UI Considerations below for the full per-surface state accounting |
| Destructive confirmation | n/a — no destructive action is introduced by this phase |

---

## Interaction & Layout Contract

*(Not a template row, but load-bearing enough to spec here rather than leave to the executor's
judgment — this is where CONTEXT's "Claude's Discretion" items are settled.)*

### What triggers what (the phase's one dispatching rule)

Two independent switches, declared once each, never inlined:

1. **Viewport width → the stacked-vs-desktop shell.** One breakpoint, `--breakpoint-shell: 820px`,
   declared in `app/globals.css`'s `@theme static` block. Tailwind v4 turns a `--breakpoint-*`
   token into two variants: `shell:` (`@media (width >= 820px)`) and `max-shell:`
   (`@media (width < 820px)`). **The desktop shell is the unprefixed base and stays byte-identical;
   every phone-only rule is written under `max-shell:`.** Below 820px: the phone shell — pinned
   drawing over a scrolling controls region, compact top bar, bottom tab bar. At 820px and above:
   today's `aside` (340px) + `main` (480px+) sidebar-beside-canvas shell, completely unmodified.
   Both the desktop nav row and the phone bars are in the server-rendered tree; the width variant
   alone decides which is shown (`hidden max-shell:flex` on the phone bars, `max-shell:hidden` on
   the desktop link row), so the first paint is right on every device with no JavaScript media
   query and no flash between layouts. 820px is chosen because it is exactly the desktop shell's
   own minimum width (340 + 480), so the same one number answers both "when does a narrow phone
   stack" and "when does a rotated phone stop stacking" (see Landscape, below) — one token, two
   jobs, never two numbers to keep in sync.
2. **Pointer type → touch sizing.** A new custom variant, `coarse`, declared beside the existing
   `@custom-variant dark` in `app/globals.css`:
   ```css
   @custom-variant coarse (@media (pointer: coarse));
   ```
   Every finger-sized rule below — the 44px targets, the 16px input text, the enlarged drag hit
   zones, the on-by-default construction overlay, the drag readout chip — is gated on `coarse:`,
   not on the width breakpoint. A touchscreen laptop at desktop width gets full touch sizing; a
   desktop mouse at any width, including inside the phone-width shell in a resized browser
   window, never does. Width and pointer are independent axes and this phase never conflates them.

### The phone shell (D-01)

**Pinned drawing height, per screen** — expressed as a share of the phone shell's own available
vertical space (screen height minus the compact top bar, the bottom tab bar, and the
`SignInBanner` when it is showing), computed with `dvh` so Safari's toolbar coming and going never
clips or traps scroll (PHON-02). The two-thirds figure is a ceiling, not a fixed height — screens
whose drawing needs less give the rest to the controls:

| Screen | Pinned area | Reasoning |
|---|---|---|
| TEMPLATE | up to 66dvh (the ceiling) | The nose-up outline is the tallest drawing on a phone; it needs the most room |
| ROCKER | up to 66dvh (the same ceiling as TEMPLATE) | Nose-up in portrait (D-09) the side profile's frame is about 0.6 wide for every 1.0 tall, because the card rails reserve a fixed band either side of the board — so it is height-bound on every phone. Measured with `rockerViewLayout()` during planning: at 45dvh the 74" default drew 181px wide on a 375px iPhone SE (half the screen); at 66dvh it draws 266px wide × 400px tall there and 336 × 506px on an iPhone 14. The founder chose the taller ceiling over lying the rocker flat (D-18, 2026-09-08); a rocker drawing narrower than the full width is accepted on ROCKER |
| RAILS (VIEWER/DATA tabs) | up to 50dvh | One cross-section at a time (D-12), roughly square |
| RAILS (INSTRUCTIONS tab) | none — collapses to one scroller | No control applies to a read-only page (Claude's Discretion, settled: it scrolls as a whole) |
| FINS | up to 55dvh | The fin diagram fits the width; no orientation rule (Claude's Discretion) |
| VOLUME | none — one column, card then controls | Not a drawing; nothing needs to stay in view while a slider moves (Claude's Discretion, following CONTEXT's own recommendation) |

**Structure inside the pinned region:** the `TabbedPanel` tab strip (VIEWER/DATA/INSTRUCTIONS, or
RAILS' NOSE/CENTER/TAIL switch) sits as the *first* row inside the same pinned flex column as the
drawing, immediately above it — not floating separately above the pinned area — so switching tabs
never moves the drawing's position on screen. The strip keeps its existing Display-role styling
(12px `text-xs font-display font-bold`, `TabbedPanel`'s own tab classes) unchanged.

**Controls region** is the phone's single scroller (`overflow-y-auto`, `min-h-0 flex-1` below the
pinned region), `p-4` inset, sliders/fields stacked `gap-4` apart, matching the sidebar's existing
`SliderRow`/`measure-field.tsx` components (touch-sized per the rules below) with no new layout
component per control.

**Fine adjust group (D-03):**
- Label: **"Fine adjust"**, Label role (12px, `font-bold tracking-architectural uppercase`,
  matching the nav's own label treatment so it reads as a section header, not a slider).
- Position: last item in the controls scroller, below every other control on TEMPLATE and ROCKER
  — the two screens with folded sliders. RAILS, FINS and VOLUME have no folded sliders and
  therefore render no Fine adjust group at all (nothing to fold).
- Default state: **closed**. Screen-only state (`useState`, not the design store), matching
  `orientation`/`showConstruction`/`sectionOpen`'s existing pattern — never saved, never in the
  snapshot, resets to closed on every navigation to the screen.
- Disclosure idiom: a full-width row button, `min-h-11` (44px, meets the touch minimum without a
  `coarse:` override needed since 44px is its resting height), `rounded-md border
  border-surf-line-faint bg-surf-well px-4`, the label left-aligned, a lucide `ChevronDownIcon`
  (16px, `text-surf-ink-muted`) right-aligned that rotates 180° on open via a CSS transition. When
  open, the folded `SliderRow`s render directly beneath inside the same scroll flow, separated by
  a single `border-t border-surf-line-faint` — no accordion animation library, a plain conditional
  render is sufficient (Rule "one pointer path" spirit: no new dependency for a disclosure).
- Contents by screen, exactly as D-03 lists them — fold on TEMPLATE: Width and Offset, Tail Rail
  and Nose Rail, Tail Angle and Fullness, Nose Angle and Fullness; fold on ROCKER: Nose Angle,
  Nose Smoothness, Nose Flatness, Tail Flatness, Tail Smoothness, Tail Angle. Every other control
  (Board Length, Nose/Tail Rocker, the five foil thicknesses, everything on RAILS/FINS/VOLUME,
  every non-slider control) stays in the open list above the group, unchanged in position.

### Landscape (Claude's Discretion — settled)

Followed as recommended: at `shell:` width (≥820px) the screen returns to the desktop
sidebar-beside-canvas shell with the board lying flat, regardless of whether that width comes from
a landscape phone or an actual desktop — one breakpoint answers both. An iPhone 14-class phone
sideways (844px) crosses it and gets the full desktop shell, including the desktop's own top nav
(`NAV_LINKS`, Settings gear, Save, auth control) — no separate landscape tab placement is needed,
because the existing desktop nav already answers "where do the six screens live" above 820px. A
smaller phone sideways (an SE-class device at 667px) stays under the breakpoint and keeps the
phone shell exactly as portrait does, just with a flat board per D-09 — the bottom tab bar
continues to hold the six screens there, satisfying the "every screen stays one tap away"
constraint at every width. Touch sizing (the `coarse:` variant) applies identically in both
layouts since it follows the pointer, never the width.

### The bottom tab bar (D-06/D-07)

- Shown only below the `shell` breakpoint (820px): `hidden max-shell:flex`. At and above it the
  desktop top nav is the only navigation and the bottom bar is hidden by that same CSS rule — no
  JavaScript width check, so the server render and the first paint agree on every device.
- Height: 56px content (`h-14`) plus `padding-bottom: env(safe-area-inset-bottom)` as additional
  space beneath that content — the 56px tap targets never sit inside the home-indicator area. This
  requires `viewportFit: "cover"` on the `Viewport` export in `app/layout.tsx` (already an
  inherited constraint; named here because it's what makes this bar's safe-area padding do
  anything).
- Background `bg-surf-panel`, top edge `border-t border-surf-line-faint` — the bottom-bar mirror
  of the desktop nav's own `border-b`.
- Six tabs, `flex` row, label-only (D-07 — no icons are invented). Each tab is `flex-1 min-w-fit`
  (`flex: 1 1 0%` with `min-width: fit-content`): the bar's width is shared equally, but a tab is
  never narrower than its own word, so the long words (TEMPLATE, SUMMARY) take what they need and
  the short words (RAILS, FINS) inherit the rest. Not equal `flex-1` columns alone — six equal
  columns on a 375px phone are 62px each and would clip TEMPLATE. Bar padding `px-2`; each tab
  `px-1`.
- Label typography: **Label (dense)** — 11px `font-bold tracking-[0.1em] uppercase` (Typography).
  Stated so nobody puts the nav's 12px/0.15em classes back: at that setting the six words need
  about 350px of label, which does not fit a 360px phone at all and leaves 375px with no margin;
  at 11px/0.1em they need about 300px and fit every phone from 360px up. Labels never wrap, clip
  or truncate. If a held-out check at 360px still clips a word, the tracking comes down (to
  0.08em) before the size or the words do (D-07's words are fixed).
- Active state: `border-t-2 border-surf-accent text-surf-ink` on the active tab (the accent rule
  sits at the *top* edge of the tab, since this bar is bottom-anchored — the mirrored version of
  the desktop nav's `border-b-2` underline, "marked the way the desktop link is," D-06).
  Inactive: `border-transparent text-surf-ink-muted`.
- Each tab's tappable area is its whole column at the bar's full 56px height; with the `flex-1
  min-w-fit` rule the narrowest column (FINS) is about 53px wide on a 360px phone and wider on every
  larger one — over the 44px minimum without a `coarse:` override.

### The compact top bar (D-08)

- Height `h-14` (56px), `px-4`, `bg-surf-ground`, `border-b border-surf-line-faint` — same border
  treatment as the desktop nav, at phone density.
- Left: **SHAPER** wordmark, unchanged styling (`text-sm font-extrabold tracking-architectural`),
  links to `/` exactly as today.
- Right cluster, in this order: **Save** (`SaveButton`, unchanged component and wording), then a
  `h-4 w-px bg-surf-line-faint` divider (matching the desktop nav's own chrome-separator idiom),
  then the **one menu button**.
- Menu button: icon-only, lucide `MenuIcon`, `aria-label="Menu"`. Visual size follows Button's
  `icon` variant (`size-8`, 32px) at rest; under `coarse:` it becomes `coarse:size-11` (44px) so a
  finger gets the full target without the icon looking oversized to a mouse user who happens to be
  at phone width (Interaction & Layout Contract, Touch sizing, applies here too).
- **The one menu's shape (Claude's Discretion, settled):** a single Base UI `Menu.Root` — the same
  primitives-not-shadcn-wrapper pattern `components/settings-menu.tsx` already uses, styled with
  the identical `Menu.Popup` classes (`min-w-64 rounded-lg border border-surf-line-faint
  bg-surf-panel p-1.5 shadow-lg`). Both existing components render **inside one popup**, stacked,
  rather than the button opening each in turn: `SettingsMenu`'s existing Units/Theme content
  first, a `Menu.Separator` (or a `border-t border-surf-line-faint` divider row), then
  `NavAuthControl` rendered as the last row. Reasoning: `NavAuthControl` is either a plain "Sign
  in" button or Clerk's own self-contained `UserButton` popover — both are safe to mount inside
  another popup's content, and this avoids a second tap to reach account settings, keeping D-08's
  "one menu" promise literal rather than "one button that opens a chooser of two menus." Phase 10
  owns testing the account flows that open from inside it.

### Which way the board faces (D-09/D-10/D-11)

No new visual spec beyond what D-09–D-11 already state as locked: TEMPLATE and ROCKER read the
phone's own orientation via the existing `orientation` view-state pattern; the rotate button is
hidden inside the phone shell (`max-shell:hidden` on `ViewerToolbarButton`'s rotate slot, D-11);
desktop's rotate button and default orientation are unmodified at and above the `shell` breakpoint.

### RAILS on a phone (D-12)

- One cross-section at a time. The Nose/Center/Tail switch reuses `TabbedPanel` (non-bare mode)
  with three tabs labelled **NOSE / CENTER / TAIL** — the exact idiom Phase 8's View Full Sized
  dialog already built for the same three-way choice, not a new toggle component. Spelled
  **Center**, as the existing dialog, `RailSectionPlot` and the DATA table already spell it —
  CONTEXT.md's "Centre" is the discussion's prose, not the product's word.
- Which rail shows first: the first section with `sectionOpen[key] === true` in Nose → Center →
  Tail order; **Nose** if every section is collapsed — the same rule Phase 8's dialog already uses
  (Claude's Discretion, settled per CONTEXT's own stated answer).
- Each rail gets the full pinned-area width, scaled to fit the way `RailSectionPlot`'s own `fit`
  prop already does elsewhere in this codebase — no new scaling math.

### Sideways-scrolling data tables (D-04)

Applies to the rocker DATASHEET, the rails DATA table and the fins data panel. Each table's box
gets `overflow-x-auto` and keeps every column (no re-stacking). The visual hint (Claude's
Discretion, settled): **a fade edge, not a caption** — a 24px-wide gradient overlay on the
trailing edge of the table's scroll box, fading from `--surf-panel` (opaque) to transparent,
applied via `mask-image: linear-gradient(to right, black calc(100% - 24px), transparent)` on the
box's own background layer (or an equivalent absolutely-positioned gradient div at the box's
right edge). Chosen over a caption because it needs no new string to translate per table and reads
identically as a "there's more, keep going" affordance in both unit systems without adding text
that would have to be re-authored per table.

### View Full Sized on a phone (D-13)

- The dialog's phone body: the one plain line from Copywriting Contract above, then the rail
  drawn shrunk to fit the dialog's available width (never at 1:1 — that would misrepresent a
  screen size no shaper is measuring against). **Removed** on a phone: the 2-inch/50.8mm check
  bar and the 100%-zoom caveat sentence — both would mislead once the drawing is no longer true
  size (exception 2 in D-05) — and, for the same reason, the title's "— Actual Size" suffix
  (Copywriting Contract: the phone title is just "{Section} Rail"). **Kept** on a phone: the Nose/Center/Tail tabs, and the **Print**
  button (accent-filled, unchanged styling from Phase 8) — the print path stays CSS-inch-sized and
  ruler-true regardless of the screen it was triggered from.

### VOLUME on a phone

One column: the volume card, then the controls, in that order, nothing pinned (Claude's
Discretion, following CONTEXT's own recommendation exactly — there's no drawing to keep in view
while a slider moves, so pinning would just steal screen height for nothing). The whole screen is
one `overflow-y-auto` scroller.

### RAILS INSTRUCTIONS tab on a phone

Scrolls as a whole with the controls region collapsed (Claude's Discretion, settled per CONTEXT's
own recommendation): when a shaper is on the INSTRUCTIONS tab specifically, the pinned/scroll
split from the table above does not apply — the entire tab (the example rail card, the
instructional copy, the legend, the plan/side figure, the closing note) is one `overflow-y-auto`
column, because no control on this screen ever targets read-only reference content. Switching back
to VIEWER or DATA restores the normal pinned-drawing split.

### Thumb drag (D-14–D-17)

**Hit-zone radius on coarse pointers.** Target: **22px radius (44px-diameter target)**, up from
today's `DRAG_HIT_PX = 15` (30px target) — meeting PHON-03's 44px-class guideline exactly rather
than merely approaching it. This is a target, not a final number: CONTEXT requires station
spacing to be measured during planning before the radius is locked. Constraint for the planner:
using the tightest realistic board — the shortest length paired with the widest widepoint, from
`BOARD_LENGTH_RANGE_IN`/`WIDEPOINT_WIDTH_RANGE_IN` in `lib/geometry/board.ts` — check that no two
of the five outline points' or four rocker handles' 22px circles overlap at the phone's rendered
scale. If any pair does, shrink the radius only as far as necessary to separate them, station by
station, down to a floor of **18px radius (36px target)** before leaning further on the
nearest-point-wins rule (D-15) than radius alone should. Desktop's 15px circles are unaffected —
this is a `coarse:`-gated value, not a width-gated one, so a desktop mouse never sees it change.

**Nearest-point-wins (D-15).** One hit test per pointer-down picks the closest drag point to the
touch location among all points whose enlarged circle contains it; ties (equidistant) resolve to
the point earlier in each file's own enumeration order (`outlineDragPoints`/
`sideProfileDragPoints`), so the rule is deterministic. Lives beside the drag solvers in
`lib/geometry/` with tests, per Rule 1.

**No movement threshold (D-16).** A touch starts moving the point immediately on `pointerdown`,
identical to today's mouse behaviour — one code path for both, no `touch-action` conflict since
the drawing is pinned and can never be mistaken for a page scroll.

**`select-none` + `-webkit-touch-callout: none`** on every draggable point's hit circle (and,
defensively, the drawing's root SVG), so the iOS long-press text-selection popup can never
interrupt a drag (PHON-04).

**The drag readout chip (D-17), its look (Claude's Discretion, settled):**
- Idiom: `CalloutChipFrame` + SVG `<text>`, the same primitives `CalloutChip` already uses in
  `callout-primitives.tsx` — not a new HTML overlay component. It renders inside the same SVG
  coordinate space as the drawing, so it scales and positions exactly where the drawing's own
  scale math already puts things.
- Typography: `CALLOUT_PX.name` (11px, Label role) for each field's name, `CALLOUT_PX.value` (14px,
  Body role) for its number — one line per driven field (widepoint and the rocker tip handles each
  drive two fields, so those chips are two lines tall; every other draggable point drives one).
- Colour: the standard `CalloutChipFrame` (fill `var(--outline-page-bg)`, stroke `var(--border)`,
  exactly as `CalloutChip` draws it today); the field name in `var(--outline-callout-label)` as
  `CalloutChip` already renders names; the value in `--surf-accent-ink` instead of `CalloutChip`'s
  usual `var(--outline-ink)` — the one deliberate difference, so a live reading is told apart from
  the board's permanent callouts by its ink, not by a new surface colour (see Color, "Accent
  reserved for").
- Offset above the finger: the chip's bottom edge sits **24 user-space units above the touched
  point**, scaled by the same `handleUnit`/fit-scale factor the hit circles already use — so the
  gap between chip and fingertip stays visually consistent (about 24px on screen) at any drawing
  scale, and the chip never sits directly under the finger where it would be hidden by the hand.
  Where 24 units above would put any part of the chip outside the drawing's viewBox — the nose
  handle near the top of a portrait board, a rail handle near a side — the chip is clamped back
  inside the box (moved down or sideways by the minimum needed) so it is never clipped; it still
  keeps at least the hit circle's radius clear of the fingertip.
- Behaviour at a drag limit: when the dragged point is clamped against its solver's bound (e.g. the
  widepoint's offset range, `OUTLINE_DRAG_LIMITS`), the chip keeps showing the clamped value —
  never a stale pre-clamp number — so what a shaper reads always matches where the point actually
  is. No visual "you've hit the limit" treatment beyond the number itself simply stopping.
- Visibility: `coarse:`-gated only — appears while a finger is dragging (`pointerType ===
  "touch"`), never for a mouse (PHON-05), and unmounts immediately on `pointerup`/`pointercancel`.
  It never persists after the finger lifts.

### The sign-in nudge banner on a phone (Claude's Discretion, settled)

Stays mounted in `app/design/layout.tsx` exactly as today, above the pinned drawing (its height is
subtracted from the "available vertical space" the pinned-area percentages in the shell table are
computed against). Compact, single line: `py-2 px-4`, the banner's text truncates to one line
rather than wrapping to two (`truncate` on the copy, not on the dismiss control), dismiss `X`
button gets the same `coarse:size-11` touch-target treatment as the top bar's menu button. Height
budget: roughly 40–44px total including padding — small enough that it never meaningfully eats
into the pinned drawing's ceiling. Dismissal behaviour (`sessionStorage`, one click away) is
unchanged; Phase 10 owns the sign-in flow it opens.

### Fins viewer and the rails INSTRUCTIONS figure

Both simply scale to fit the phone's available width, using each component's own existing `fit`
prop/container-measurement pattern (`RailSectionPlot`'s `fit="width"`, the fin viewer's own
viewBox scaling) — no orientation rule applies to either (Claude's Discretion, settled per
CONTEXT's own statement).

### Touch sizing (PHON-03) — the 44px rule and how each control meets it

All of the following are `coarse:`-gated (pointer, not width), per "What triggers what" above:

| Control | Default | Under `coarse:` |
|---|---|---|
| `Button` default size | `h-8` (32px) | `coarse:h-11` (44px) |
| `Button` icon size | `size-8` (32px) | `coarse:size-11` (44px) |
| Slider thumb hit area (the `after:-inset-2` pseudo-element on the `Thumb` in `components/ui/slider.tsx`, 28px total on a 12px `size-3` thumb; `.slider-accent` in `app/globals.css` only colours track, range and thumb) | 28px | `coarse:after:-inset-4` (16px each side) → 44px total, added to that same `Thumb` class string so all fourteen call sites get it at once |
| Bottom tab bar tab | 56px height (already over target) | unchanged — no override needed |
| Fine adjust disclosure row | `min-h-11` (44px, already over target) | unchanged — no override needed |
| Checkbox rows (legend ticks, print-style toggles) | checkbox glyph unchanged size | the row's own tap target (label + box) gets `coarse:min-h-11`, matching the "enlarge the row, not the glyph" pattern already used for the slider thumb |
| `measure-field.tsx` typed fields | `h-7` (28px), `text-sm` (14px) | `coarse:h-11` (44px), `coarse:text-base` (16px — the touch-input variant of Body, prevents iOS zoom-on-focus) |
| `Input` (`components/ui/input.tsx`) | `h-8`, `text-base md:text-sm` | its existing width-based `md:text-sm` step is untouched; `coarse:` forces `text-base` (16px) regardless of width, since a touchscreen laptop at desktop width still needs it |
| Drag hit zones (outline/rocker points) | 15px radius (30px target) | 22px radius target, see Thumb drag above |

**16px-on-touch, stated plainly:** the touch-input size is not a fifth type size — it is Body's
existing 14px promoted to 16px specifically where a finger is about to type, gated by the same
`coarse:` variant as everything else in this table. Nothing about Body's weight, line-height or
role changes; only its size, and only on touch.

### Which construction lines are on by default on a phone (D-02)

Drag points are always on (locked by D-02, not a discretion item). In both viewers the drag points
are part of the construction overlay: `showConstruction` gates one group — the guide chords from
each control point to its anchor, the knot dots, and the drag targets with their hit circles
(`components/outline/outline-viewer.tsx`, `components/rocker/rocker-viewer.tsx`) — and the drag
handlers are only reachable while that overlay is on. "Drag points on" therefore means "overlay
on", and this contract does not split the overlay: separating chords from points would change the
shared viewer code path desktop draws with (PHON-05) for a gain the small drawing does not need.
Settled per screen (Claude's Discretion):

- **TEMPLATE:** the construction overlay — the five drag targets with their guide chords and knot
  dots — is **on by default** on a touch device. The dashed station lines and the widepoint's dotted
  station line are part of the base drawing today, drawn whether or not the overlay is on, so they
  need no default of their own. Nothing further is added: the overlay already carries the most
  lines this screen can show, and the toolbar toggle (still present, D-02) turns it off in one tap.
- **ROCKER:** the same — the overlay with its four handles, the Bezier chords from each curve point
  to its handle, and the three knot dots is **on by default** on a touch device. On the side
  profile the chords are what tells a shaper which handle bends which end of the curve, so there is
  no crowding reason to want them off.

The default is decided by the pointer, not the width (`pointer: coarse`), and only for the two
editors' own viewers — the Summary and preset cards pass no drag handler and are unaffected. Because
`showConstruction` is React state rather than a CSS rule, the server cannot know the pointer type:
the contract accepts that on a touch device the overlay may appear one frame after hydration (the
board itself is never late), and the planner picks the mechanism — a `pointer: coarse` media-query
subscription with a server default of off, the way `SignInBanner` already treats its dismissal.
Desktop's off-by-default-behind-the-toolbar-toggle behaviour is completely unchanged (PHON-05).

### Desktop untouched (PHON-05)

Every rule in this contract that changes phone behaviour is gated on one of the two switches in
"What triggers what" — the `max-shell:` width variant or the `coarse:` pointer variant — and every
gate is additive (a `max-shell:`/`coarse:` override on top of the unchanged desktop base), never a
default flip that a desktop mouse user at any width could trigger. Concretely, for each phone-only
rule above: the bottom tab bar and compact top bar are hidden at or above the `shell` breakpoint;
the pinned/scroll split, the Fine adjust fold, the rotate button's absence, and the on-by-default
construction overlay are all read only inside the phone shell's own layout branch, which itself only
shows below the `shell` breakpoint; touch
target sizing, 16px inputs, drag hit-zone radius and the readout chip are all `coarse:`-gated and
never trigger for a mouse pointer regardless of viewport width. A desktop mouse at desktop width
sees byte-identical markup and behaviour to what exists today; a mouse-driven browser resized to
phone width sees the stacked shell (a width effect) but none of the touch-sizing effects (a
pointer effect) — exactly the split CONTEXT's own recommendation asks for.

---

## UI Considerations

> Populated by the ui-phase UI-consideration probe (Step 9.5) and lifted by plan-phase's
> `## UI Considerations` lift rule via the identical rule as SPEC `## Edge Coverage`. Shape-rooted UI *state*
> coverage (empty / loading / error / populated / partial / overflow / zero-one-many / long-text).
> Empty-state and error-state COPY live in `## Copywriting Contract` above — this section covers
> state coverage and REFERENCES those rows rather than restating the copy (de-dup).

Probe run 2026-09-08 over 13 surfaces with authored element kinds (non-interactive session: kinds
confirmed and considerations resolved under the workflow's `--auto` convention; nothing was dismissed).
The orchestrator identified the element kinds from each surface's description and resolved every
consideration with a concrete truth or a held-out check — a shaper reviewing this can revisit any row.

Surfaces probed:

- **Bottom tab bar (nav, control)** — the six always-visible screen tabs TEMPLATE, ROCKER, RAILS, VOLUME, FINS, SUMMARY fixed along the bottom edge of the phone shell, 56px tall plus the safe-area inset, each a full-width tappable column, the current screen marked with a top accent rule; shown only below the 820px shell breakpoint.
- **Compact top bar (nav, control, text)** — the phone-width header holding the SHAPER wordmark, the Save control with its four fixed strings (Save, Saving…, Saved, Not saved), a hairline divider and the one icon-only menu button; replaces the desktop nav's full link row below the shell breakpoint.
- **The one menu (control, nav, form)** — the Base UI Menu popup opened by the top bar's menu button, stacking the Units and Theme choices from SettingsMenu, a separator, and the account control (a plain Sign in button or Clerk's own UserButton) in one surface.
- **Fine adjust group (control, list)** — the closed-by-default group at the bottom of the TEMPLATE and ROCKER controls scroller that folds the sliders a drag point already sets (Width and Offset, the rail handles, the tip angle, fullness and smoothness pairs) behind one 44px chevron row; screen-only state, never saved.
- **Outline drawing + readout (media, control, text)** — the pinned TEMPLATE drawing on a phone, nose-up in portrait: five draggable points with enlarged touch hit zones, the construction overlay on by default, and the transient finger-side readout chip showing the driven slider's own label and value while a finger drags.
- **Rocker drawing + readout (media, control, text)** — the pinned ROCKER drawing on a phone: four draggable Bezier handles with the same touch treatment and readout chip; the foil's five thickness sliders stay slider-only and unaffected.
- **RAILS one-rail switch (control, media, nav)** — the NOSE, CENTER, TAIL three-way tab strip showing one rail cross-section at a time in the pinned area in place of the desktop's three plots at once, opening on the first open section or Nose.
- **View Full Sized on a phone (media, text, control, nav)** — the rail drawing shrunk to fit the dialog width with the Nose, Center, Tail tabs kept, the 2-inch check bar and the 100%-zoom caveat removed, one plain line in their place, and the accent Print button unchanged.
- **Sideways-scrolling tables (list, text)** — the rocker DATASHEET, the rails DATA table and the fins data panel, each keeping every column inside its own horizontally scrolling box with a 24px fade edge on the trailing side; the page itself never scrolls sideways.
- **VOLUME phone layout (text, media, control)** — the single-column layout with the volume calculation card first and the volume controls beneath, nothing pinned, one vertical scroller, replacing the desktop's sidebar-beside-card shell.
- **RAILS INSTRUCTIONS on a phone (text, media, list)** — the long read-only reference page (example rail card, three-step copy, nine-item legend, plan and side figure, closing note) scrolling as one column with the pinned and scroll split collapsed, since no control targets it.
- **Sign-in nudge banner (text, control)** — the one-line dismissable SignInBanner above the pinned drawing, copy truncated to a single line, 44px dismiss target, about 40 to 44px tall so it never crowds the drawing's ceiling.
- **Controls scroller (form, list, control)** — the phone's single vertical scroller beneath the pinned drawing holding every sidebar control in desktop order: sliders with 44px thumbs, typed measure fields at 16px and 44px tall, checkboxes, tail-shape and fin-system choices, and the Fine adjust group last.

Applicable state considerations resolved: 80 applicable — 74 covered, 6 backstop, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| loading | Bottom tab bar (nav, control) | ✅ covered | The bar is part of the server-rendered page with its six fixed labels and the active mark decided from the route on the server, so it is complete in the first frame; nothing is fetched and no placeholder or spinner exists. |
| error | Bottom tab bar (nav, control) | ✅ covered | Each tab is a plain link to one of the six design routes, all of which always exist; tapping cannot fail inside the app, so no error state or copy is defined (Copywriting Contract, empty/loading/error row). |
| overflow | Bottom tab bar (nav, control) | 🧪 backstop | Tabs are flex-1 min-w-fit at the Label (dense) size, so the six words share the bar but never shrink below their own width and the page never scrolls sideways (The bottom tab bar). Held-out check: Playwright screenshots at 360px, 375px and 393px wide show all six labels whole on one line with no wrap, clip or ellipsis, and the narrowest tab at least 44px wide. |
| long-text | Bottom tab bar (nav, control) | ✅ covered | The labels are the six fixed NAV_LINKS words, the longest being TEMPLATE; no user text reaches the bar, so there is no truncation rule beyond the fit rule above. |
| loading | Compact top bar (nav, control, text) | ✅ covered | The wordmark and menu button are static; the Save control paints in whatever state the design store already holds (Save before the first save), the same first-frame behaviour it has on the desktop nav today, with no skeleton. |
| error | Compact top bar (nav, control, text) | ✅ covered | A failed save shows SaveButton's own Not saved string in warning ink, tappable to retry, the component's existing fourth state unchanged on the phone; nothing else in the bar can fail. |
| overflow | Compact top bar (nav, control, text) | ✅ covered | The bar is one non-wrapping row: wordmark left, Save in its fixed-width slot so its four strings never shift the layout, a divider and the 44px menu button right; at 360px the row uses well under 250px, so nothing wraps or clips. |
| long-text | Compact top bar (nav, control, text) | ✅ covered | Every string is fixed and short: SHAPER and the four Save strings, of which Not saved is the longest, so no wrapping or truncation rule is needed. |
| empty | The one menu (control, nav, form) | ✅ covered | The menu always has content: the Units and Theme choices always hold a current value (Imperial and the system theme by default) and the account row is always either Sign in or the signed-in account button, so there is no zero-item state. |
| loading | The one menu (control, nav, form) | ✅ covered | Units and Theme read the already-hydrated preference SettingsMenu reads today, and the account row is Clerk's own control which paints its resting state itself; the popup opens fully drawn with no placeholder rows. |
| error | The one menu (control, nav, form) | ✅ covered | Choosing a unit or theme takes effect at once in the browser and the account write goes through the same background queue units already use (retried, never blocking), so a failed write never reverts the choice and shows no message, exactly as SettingsMenu behaves today; sign-in failures are Clerk's own dialogs and Phase 10's to test (PHON-07). |
| partial | The one menu (control, nav, form) | ✅ covered | Units and Theme are independent single-choice groups that each always have exactly one selected value; there is no half-filled state and nothing to submit. |
| overflow | The one menu (control, nav, form) | ✅ covered | The popup is the existing Menu.Popup (min-w-64) anchored below the button and kept inside the viewport by Base UI's positioner; its rows stack vertically and the popup grows with them, and at three groups it is far shorter than any phone screen, so it never scrolls or clips. |
| long-text | The one menu (control, nav, form) | ✅ covered | All menu rows are fixed short strings (Imperial, Metric, Light, Dark, System, Sign in) and the signed-in account row is Clerk's own compact button, so no long text reaches the popup. |
| empty | Fine adjust group (control, list) | ✅ covered | The group renders only on TEMPLATE and ROCKER, where its folded set is fixed by D-03 (eight sliders on TEMPLATE, six on ROCKER); on RAILS, FINS and VOLUME there is nothing to fold and no group renders, so an empty group can never appear. |
| loading | Fine adjust group (control, list) | ✅ covered | The group and its sliders read the design store synchronously; it paints closed on the first frame with no placeholder, and opening it renders the folded SliderRows immediately. |
| error | Fine adjust group (control, list) | ✅ covered | Opening or closing flips a local boolean and moving a folded slider is the same store update the desktop sidebar makes today; nothing can fail and no error copy exists. |
| populated | Fine adjust group (control, list) | ✅ covered | Open, the group shows exactly the D-03 list for that screen in the sidebar's existing order, each row the same SliderRow with the same label and value as the desktop sidebar. |
| partial | Fine adjust group (control, list) | ✅ covered | The folded set is fixed per screen, so every listed slider is always present; a folded slider that a drag has just changed shows its new value like any other. |
| overflow | Fine adjust group (control, list) | ✅ covered | The open group is part of the controls scroller's normal flow and grows to its rows; the scroller scrolls vertically, so nothing clips at any phone height. |
| zero-one-many | Fine adjust group (control, list) | ✅ covered | The count is fixed (eight or six) and never zero or one, so there is no singular copy and no count-dependent layout. |
| long-text | Fine adjust group (control, list) | ✅ covered | Row labels are the sliders' own fixed names (Nose Smoothness is the longest) with their display values, rendered by SliderRow exactly as the sidebar does; they wrap within the row rather than truncate, as today. |
| empty | Outline drawing + readout (media, control, text) | ✅ covered | The drawing always has a board: the design store always holds a complete outline spec, so the pinned area is never blank, and the five drag points are always present because the construction overlay is on by default on a touch device (D-02). |
| loading | Outline drawing + readout (media, control, text) | ✅ covered | The outline is computed synchronously from the store and painted in the first frame at the phone width; the overlay's touch default is decided from the pointer on the client, so on a phone the overlay may appear one frame after hydration while the board itself is never late. |
| error | Outline drawing + readout (media, control, text) | ✅ covered | A drag that pushes a point past its solver limit clamps to the bound (OUTLINE_DRAG_LIMITS) and the readout shows the clamped value; a drag cannot fail, and a cancelled pointer ends the drag and removes the chip with the board left where it was. |
| populated | Outline drawing + readout (media, control, text) | ✅ covered | The normal state is the nose-up outline filling the pinned width with its callouts, the dashed station lines, the construction overlay and five drag targets; in landscape the board lies flat (D-09). |
| overflow | Outline drawing + readout (media, control, text) | 🧪 backstop | The drawing scales to the pinned area with callouts pinned by useSvgFitScale so nothing clips, and the readout chip is clamped inside the drawing's viewBox (Thumb drag, offset rule). Held-out check: dragging the nose handle and a rail handle to their limits at 360px wide in portrait, the chip stays fully inside the drawing's box and is never clipped at the top or a side edge. |
| long-text | Outline drawing + readout (media, control, text) | ✅ covered | The chip's lines are SliderRow's own fixed labels and formatted values (the longest is Nose Smoothness at 100%), in the shaper's chosen system through measure-display; the chip frame is sized to its longest line so nothing truncates. |
| empty | Rocker drawing + readout (media, control, text) | ✅ covered | The side profile always draws from the store's complete rocker spec; the four handles are always present with the overlay on by default on a touch device. |
| loading | Rocker drawing + readout (media, control, text) | ✅ covered | Computed synchronously and painted in the first frame; as on TEMPLATE the overlay's touch default may arrive one frame after hydration while the curve itself is never late. |
| error | Rocker drawing + readout (media, control, text) | ✅ covered | A handle drag clamps at the solver's bounds with the chip showing the clamped angle or smoothness, and a cancelled pointer ends the drag cleanly; the foil sliders are ordinary sliders with no failure path. |
| populated | Rocker drawing + readout (media, control, text) | ✅ covered | The flat side profile with its rocker rails and callouts, the four handles with their chords and knot dots, in the pinned area at up to 66dvh (D-18 — narrower than full width is accepted on ROCKER); nose-up in portrait and flat in landscape (D-09). |
| overflow | Rocker drawing + readout (media, control, text) | 🧪 backstop | The profile scales to the pinned width with pinned callout sizes so nothing clips, and the chip is clamped inside the viewBox. Held-out check: dragging the nose tip handle to its limit at 360px wide in portrait, the two-line readout chip (Nose Angle and Nose Smoothness) stays wholly inside the drawing's box. |
| long-text | Rocker drawing + readout (media, control, text) | ✅ covered | Chip lines are the fixed rocker slider labels and values (Nose Smoothness at 100% the longest), two lines for a tip handle and one for a flat handle; the chip is sized to the longest line and never truncates. |
| empty | RAILS one-rail switch (control, media, nav) | ✅ covered | There are always three rails to show: the store always holds a complete rail spec, so the switch always has its three tabs and the pinned plot is never blank. |
| loading | RAILS one-rail switch (control, media, nav) | ✅ covered | The switch opens on the first open section (Nose if none is open) with that rail's plot drawn synchronously in the first frame; switching is local state with no spinner. |
| error | RAILS one-rail switch (control, media, nav) | ✅ covered | Switching rails sets a local value and redraws from already computed outputs; nothing fetches or submits, so no error state exists. |
| populated | RAILS one-rail switch (control, media, nav) | ✅ covered | One RailSectionPlot filling the pinned width with grid, bands and dots exactly as the desktop VIEWER draws it, the three-tab strip above it in TabbedPanel's own styling with the active rail marked. |
| overflow | RAILS one-rail switch (control, media, nav) | ✅ covered | The plot fits the pinned width through RailSectionPlot's own fit prop, so it never clips or scrolls, and the three short tab labels fit one row at every phone width. |
| long-text | RAILS one-rail switch (control, media, nav) | ✅ covered | The three labels are fixed words and the plot's axis ticks are pinned callout sizes; nothing truncates. |
| empty | View Full Sized on a phone (media, text, control, nav) | ✅ covered | The dialog always has its three rails and opens on the first open section or Nose (Phase 8's rule); it is never empty. |
| loading | View Full Sized on a phone (media, text, control, nav) | ✅ covered | The dialog opens with the fitted plot already drawn from the store and no spinner; Print hands off to the browser's own print dialog. |
| error | View Full Sized on a phone (media, text, control, nav) | ✅ covered | Cancelling the browser print dialog returns to the open dialog unchanged; nothing in the dialog fetches, so no error copy exists. |
| populated | View Full Sized on a phone (media, text, control, nav) | ✅ covered | On a phone: the title without its Actual Size suffix, the one plain line, the three rail tabs, the rail shrunk to the dialog width, and the accent Print button; no check bar and no zoom caveat (D-13). |
| overflow | View Full Sized on a phone (media, text, control, nav) | ✅ covered | The plot is shrunk to fit the dialog's width on a phone (never 1:1), so the dialog never scrolls sideways; it keeps its max-h-[90dvh] overflow-y-auto so a tall rail scrolls vertically inside it. |
| long-text | View Full Sized on a phone (media, text, control, nav) | ✅ covered | The note is one fixed sentence that wraps within the dialog width; the title and the tab words are fixed and short, and the desktop caveat sentence is not rendered on a phone. |
| empty | Sideways-scrolling tables (list, text) | ✅ covered | Each table is computed from the store's complete spec and always has its full set of rows (the datasheet's stations, the rails table's bands, the fins panel's rows); an empty table cannot occur. |
| loading | Sideways-scrolling tables (list, text) | ✅ covered | Computed synchronously and painted with the screen; no skeleton rows. |
| error | Sideways-scrolling tables (list, text) | ✅ covered | Nothing fetches; the tables re-derive on every store change and cannot fail, so no error row or copy exists. |
| populated | Sideways-scrolling tables (list, text) | ✅ covered | Every desktop column is present in the same order with the same headers and unit rules (v1.1 D-09 and D-10); the box shows as many columns as fit the phone width and a 24px fade at the trailing edge signals the rest. |
| partial | Sideways-scrolling tables (list, text) | ✅ covered | Rows are derived, never entered, so a row is never half-filled; a value the current spec makes inapplicable renders exactly as it does in the desktop table. |
| overflow | Sideways-scrolling tables (list, text) | 🧪 backstop | Only the table's own box scrolls sideways (overflow-x-auto) behind the fade edge; the page never scrolls horizontally (D-04). Held-out check: on a 360px viewport with the rocker DATASHEET open, the document's scrollWidth equals the viewport width and the table box scrolls to reveal its last column. |
| zero-one-many | Sideways-scrolling tables (list, text) | ✅ covered | Row counts are fixed by the geometry (station, band and fin counts) and never zero or one, so there is no count-dependent copy. |
| long-text | Sideways-scrolling tables (list, text) | ✅ covered | Headers and cells are fixed labels and formatted numbers; columns keep their desktop widths and the box scrolls rather than wrapping or truncating any cell. |
| empty | VOLUME phone layout (text, media, control) | ✅ covered | The volume card always has a number: volume is computed from the store's complete spec, so the card is never blank. |
| loading | VOLUME phone layout (text, media, control) | ✅ covered | Computed synchronously; the card and controls paint in the first frame in one column. |
| error | VOLUME phone layout (text, media, control) | ✅ covered | Volume derives from the spec and cannot fail; the controls are the same sliders and fields as the desktop sidebar with no failure path. |
| populated | VOLUME phone layout (text, media, control) | ✅ covered | One column: the volume calculation card first, then the volume controls in the desktop sidebar's order, gap-4 apart, the whole screen one vertical scroller (VOLUME on a phone). |
| overflow | VOLUME phone layout (text, media, control) | ✅ covered | Nothing is pinned, so the column grows and the screen scrolls vertically; the card fits the phone width and nothing scrolls sideways. |
| long-text | VOLUME phone layout (text, media, control) | ✅ covered | The card's labels and the litres figure are fixed strings and formatted numbers; the card wraps its lines within the phone width and truncates nothing. |
| empty | RAILS INSTRUCTIONS on a phone (text, media, list) | ✅ covered | The tab is fixed reference content (Phase 8): the example rail, the copy, the nine-item legend and the figure are always present, so there is no data-dependent empty state. |
| loading | RAILS INSTRUCTIONS on a phone (text, media, list) | ✅ covered | As in Phase 8, all content is in the first painted frame and the figure reserves its aspect ratio before the PNG paints. |
| error | RAILS INSTRUCTIONS on a phone (text, media, list) | ✅ covered | If the figure's PNG fails to load, the SVG overlays and labels still draw in the reserved box with the alt text, as Phase 8 specified; nothing else can fail. |
| populated | RAILS INSTRUCTIONS on a phone (text, media, list) | ✅ covered | The tab reads top to bottom as one column at the phone width: example rail card, three-step copy, legend grid, plan and side figure, closing note, the same cards Phase 8 built, each fitted to the width. |
| partial | RAILS INSTRUCTIONS on a phone (text, media, list) | ✅ covered | The legend's mix of ticked and unticked boxes shows exactly the ticked line families over the figure, as on desktop; the other cards have no partial state. |
| overflow | RAILS INSTRUCTIONS on a phone (text, media, list) | ✅ covered | The whole tab is one overflow-y-auto column with the pinned split collapsed, so the long page scrolls vertically and the figure and example rail scale to the width; nothing scrolls sideways. |
| zero-one-many | RAILS INSTRUCTIONS on a phone (text, media, list) | ✅ covered | The legend is fixed at nine items and the copy at three steps; there is no count-dependent layout or copy. |
| long-text | RAILS INSTRUCTIONS on a phone (text, media, list) | 🧪 backstop | All copy is fixed English with the units through the display boundary. Held-out check: view the tab at 360px in both systems and confirm the three steps, the legend labels and the closing note wrap without clipping and the Metric figures read in cm. |
| loading | Sign-in nudge banner (text, control) | ✅ covered | The banner renders on the server as not dismissed and hydrates against sessionStorage through useSyncExternalStore exactly as today; on a phone it takes its fixed one-line height in the first frame so the pinned drawing below it never jumps. |
| error | Sign-in nudge banner (text, control) | ✅ covered | Dismissing writes to sessionStorage and has no failure the shaper can see; if storage is unavailable the banner simply shows again next load, as today. The sign-in it opens is Phase 10's to test. |
| overflow | Sign-in nudge banner (text, control) | ✅ covered | The copy is held to one line (truncate on the text, never on the dismiss control), so the banner is always one row of about 40 to 44px and never wraps into the drawing's ceiling. |
| long-text | Sign-in nudge banner (text, control) | 🧪 backstop | The nudge sentence is fixed. Held-out check: at 360px the banner is one line, the sentence is whole or ellipsised inside the text and never inside the dismiss button, and the dismiss target measures 44px. |
| empty | Controls scroller (form, list, control) | ✅ covered | Every design screen has controls, so the scroller is never empty; on the INSTRUCTIONS tab, where no control applies, the scroller is collapsed rather than shown empty (RAILS INSTRUCTIONS tab on a phone). |
| loading | Controls scroller (form, list, control) | ✅ covered | The controls read the store synchronously and paint with the screen; typed fields show their current value in the first frame with no placeholder. |
| error | Controls scroller (form, list, control) | ✅ covered | A typed value outside a field's range shows measure-field's existing inline warning text in warning ink under the field and is not applied, the desktop behaviour unchanged; sliders cannot fail. |
| populated | Controls scroller (form, list, control) | ✅ covered | The scroller holds every desktop sidebar control in the desktop's order at 44px targets and 16px typed text, sections stacked gap-4, the Fine adjust group last on TEMPLATE and ROCKER. |
| partial | Controls scroller (form, list, control) | ✅ covered | Controls are always fully populated from the spec; a field mid-edit shows the shaper's typed text until it is committed, as on desktop, and nothing else is ever missing. |
| overflow | Controls scroller (form, list, control) | ✅ covered | The scroller is the phone's one vertical scroller (min-h-0 flex-1 overflow-y-auto) and the pinned drawing never scrolls; the controls never scroll sideways because each row is fitted to the width. |
| zero-one-many | Controls scroller (form, list, control) | ✅ covered | The control set per screen is fixed by the design; there is no zero or one state and no count copy. |
| long-text | Controls scroller (form, list, control) | ✅ covered | Labels are the sidebar's fixed names; SliderRow wraps a long label and value line within its row rather than truncating, and typed values are formatted numbers that fit the field's fixed width. |

<!-- Status vocabulary (locked by probe-core projectTruths):
     ✅ covered   → a plain truth string lifted into must_haves.truths
     🧪 backstop  → a flat scalar { statement, verification: backstop }; at verify time, no explicit
                    evidence → insufficient_spec → human_needed (never a silent pass, #1154)
     ⚠ unresolved → an explicit planner assumption (surfaced, never silently dropped)
     Rows are REPLACED (not appended) on a probe re-run — idempotent. -->

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `Button`, `Slider`, `Checkbox`, `Input` (all already installed, no new `shadcn add`) | not required |
| Third-party | none declared | not applicable |

No third-party registry is introduced by this phase. `components.json`'s `"registries": {}` stays
empty. The one menu button is built on Base UI's own `Menu` primitives (already a project
dependency via `@base-ui/react`, already used the same way by `components/settings-menu.tsx`), not
a new shadcn `dropdown-menu`/`popover`/`sheet` component — none of those three exist under
`components/ui/` today and none is required by this contract.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-09-08
