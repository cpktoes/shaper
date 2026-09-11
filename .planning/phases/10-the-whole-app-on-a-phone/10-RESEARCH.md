# Phase 10: The Whole App on a Phone - Research

**Researched:** 2026-09-10
**Domain:** Retrofitting existing chrome (sign-in, the setup screen's cards, five dialogs, the
bottom tab bar) for touch, plus a real-device end-to-end sweep. No new library, no new pattern —
this is source-code verification and arithmetic, not library research (ROADMAP's own call, and
`.planning/config.json` has every web-search provider disabled, so no external lookups were made;
everything below is a codebase read or a computed number).
**Confidence:** HIGH — every claim below outside the Assumptions Log was confirmed by opening the
file this session (path and line cited) or by running real device data (`@playwright/test`'s own
`devices` export) or a `npx tsx` script against the real `lib/geometry` functions.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** The preset cards shrink their drawing on a phone and stay one per row. Measured: a
  card is 343 x 693px on a 375 x 812 phone, the board drawing is 76% of it (529px tall), and the
  name + dims + descriptor + "Start Shaping" together are only 79px — so four-to-five boards cost
  4.2 screens of scrolling. Cap the drawing on a phone so a card lands around 280-320px and
  two-and-a-bit boards are visible at once. The drawing must stay large enough to tell the
  outlines apart — that is what a shaper is choosing on; planning measures the smallest drawing
  that still reads before fixing a number. Rejected: a two-up grid (drawings fall to ~150px wide,
  silhouettes only) and a sideways swipe carousel (biggest drawings, but you cannot compare two
  boards and it is a new interaction pattern this app does not have).
- **D-02:** The saved-board rack cards follow the same rule as the presets. One card system on
  the setup screen, not two stacked. Whatever D-01 settles applies to both.
- **D-03:** The five dialogs get touch sizing and stay centred. `rename-dialog.tsx`,
  `board-name-prompt.tsx`, `delete-confirm-dialog.tsx`, `replace-board-dialog.tsx` and
  `sign-in-dialog.tsx` have zero touch handling today. Finger-sized buttons, 16px text inputs so
  iOS stops zooming on focus, and enough width on a narrow screen. Rejected: bottom sheets and
  full-screen dialogs. **Measure, do not assume:** a centred dialog carrying a text input can be
  covered by the iOS keyboard. Planning measures this on a real device and only fixes it if it
  actually bites.
- **D-04:** Deleting a board keeps exactly today's safety — the confirm dialog, thumb-sized. No
  undo and no trash: that is a new capability, deferred.
- **D-05:** Clerk's `<UserButton />` is measured before anything is written around it. If it
  clears 44px on a phone, leave it alone. If not, wrap it in a 44px tap target without changing
  how it looks. Do not write a wrapper that might be doing nothing.
- **D-06:** The signed-out "Sign in" row in the nav menu is sized for a finger. Measured at 20px
  tall today.
- **D-07:** The bottom tab bar is hidden on the home screen until a board is picked. Note the
  mount point: `app/page.tsx` mounts `PhoneTabBar` as the last child of a single returned
  fragment precisely so it mounts once across the signed-in and signed-out branches — whatever
  implements this must not reintroduce two copies.

### Claude's Discretion

- The exact card height and drawing cap in D-01, chosen from a measurement of the smallest
  drawing that still distinguishes the outlines.
- Whether the dims line, descriptor and "Start Shaping" all survive at the shorter card height,
  and in what order.
- Placement of the Delete button inside the confirm dialog relative to where the menu's Delete
  row sat (raised as an option, not chosen — the founder took plain thumb-sizing as sufficient).
- Everything not listed as a decision above: the researcher and planner read the code.

### Deferred Ideas (OUT OF SCOPE)

- Undo, or a trash you can restore a board from.
- The order form's front sheet clips below ~320 dots of page area (not worth a phase).
- Drawing labels at the extremes of page width (founder chose to leave it).
- Carried forward from Phase 9: foil drag points, pinch-zoom and pan on the viewers, a magnifier
  or drag-with-offset aid, a calibrated actual-size view, copy-spec-to-clipboard.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PHON-07 | Sign in, sign up and use the account menu on a phone | D-05/D-06 sizing gaps identified and confirmed by reading `nav-auth-control.tsx`; the "menu" itself (`PhoneMenu`) already exists and mounts on `/` — see Architecture Patterns and "Already done" |
| PHON-08 | Pick a preset and open/rename/duplicate/delete a saved board from the rack, on a phone | D-01/D-02's card-height arithmetic (see "The Headline Finding" below), D-03/D-04's two remaining dialog gaps confirmed by reading `dialog.tsx`/`input.tsx`, and a newly-found landscape grid regression in `setup-screen.tsx`/`board-rack.tsx` |
| PHON-09 | Read the summary and the on-screen order form on a phone | Already shipped per CONTEXT.md and corroborated by the quick-task PROBE-READING files cited below; this phase's job here is the real-device sweep, not new layout work |
| PHON-10 | The whole flow works end to end on a real iPhone and a real Android phone | See "Real-Device Sweep" section — a concrete, ordered checklist with specific iOS/Android failure modes and a pass/fail recording format |
</phase_requirements>

## Summary

Most of this phase's surface area is already built. Three of the four areas the founder picked in
discussion (the rack's card *menu*, the nav's units/theme rows, the Summary screen) turned out
to be finished before this phase started, confirmed again this session by reading the actual
files. What's left is genuinely narrow: two small code fixes inside `components/ui/dialog.tsx`
and `components/ui/input.tsx` (a 28px close-X and a 32px text-input height, both one-line
`coarse:` additions), a 20px-tall "Sign in" button, a Clerk avatar that needs measuring before
anything is written around it, hiding the bottom tab bar on `/`, and the setup screen's cards.

**The card-height target is this phase's real risk, and the arithmetic below shows it cannot be
hit as literally stated.** CONTEXT.md's D-01 asks for a **280-320px** card with a legible drawing.
A `npx tsx` script against the real `outlineViewMetrics`/`OutlineViewer` constants shows that
**no frame-cropping trick gets there**: the relationship that governs a nose-up thumbnail's drawn
width, once the card's own CSS width is fixed by a one-column phone layout, is simply
`boardWidthPx ≈ thumbnailHeightPx × (widePointWidth_in / length_in)` — cropping the viewBox's
*width* does not appear in that formula at all, because the thumbnail's CSS height is *derived
from* the viewBox's aspect ratio, and any width-only crop that avoids clipping a valid board
necessarily makes the box *taller*, not shorter (verified both algebraically and numerically
below). At a 300px card (thumbnail ≈141px tall), even the best-case tightened frame draws boards
25-46px wide — narrower than the ~150px "silhouette only" floor D-01 explicitly rejected the
two-up grid for. UI-SPEC already anticipated this might happen and wrote its own escape valve
("the card height ceiling widens rather than the board shrinking past that floor") — this
research supplies the numbers the planner needs to invoke it, and a genuinely useful (if modest)
secondary lever: shrinking the frame's own *vertical* margin, not its width.

Two further, previously undocumented findings came out of this session's file reads: the phone
top bar's hamburger button is not actually inside `components/site-nav.tsx` (it's in
`components/design/phone-menu.tsx`, rendered by `PhoneTopBar`) — a minor drift in both CONTEXT.md
and the UI-SPEC's own wording, harmless since the underlying component is genuinely already
touch-sized. More seriously: **the setup screen's card grid already flips to two columns at
Tailwind's own `sm:` breakpoint (640px)** — a boundary the app's phone/desktop `shell:` switch
(820px) does not share — so an iPhone 14 held sideways (Playwright's own device data: 750px wide,
confirmed by running `devices['iPhone 14 landscape']`) lands inside the phone shell (top bar, one
menu, no desktop nav) but gets the *rejected* two-up card grid at the same time. This is a real
gap the plan needs a task for, and the real-device sweep needs to check by hand.

**Primary recommendation:** ship the two one-line `components/ui/*` fixes and the D-05/D-06/D-07
work as scoped; for D-01/D-02, use this research's table to pick a realistic card height (see
below — something in the 450-550px range preserves legibility close to today's; anything near
280-320px does not), fix the `sm:`/`shell:` breakpoint mismatch on the setup grid, and spend the
real budget of this phase on the enumerated real-device sweep, which is where PHON-10 actually
gets proven.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Sign-in / account menu sizing | Browser / Client | — | Pure CSS (`coarse:`) and a wrapped third-party (Clerk) component; no server involvement |
| Setup-screen card thumbnails | Browser / Client | — | `OutlineViewer` runs client-side pure geometry (`lib/geometry`), no network round trip |
| Rack dialogs (rename/duplicate/delete) | Browser / Client | API / Backend | Dialog sizing is client CSS; the actual rename/duplicate/delete calls are server actions in `app/design/actions.ts` (unchanged by this phase) |
| Bottom tab bar visibility on `/` | Browser / Client | — | A `usePathname()` read inside an existing client component; no new route or server logic |
| Real-device sweep | Browser / Client (proof) | — | Verification activity, not a new architectural layer |

No capability in this phase touches the database, an API route, or CDN/static tier — every
change is either a CSS class, a client-side conditional render, or a `lib/geometry` frame
constant.

## Project Constraints (from CLAUDE.md)

- **Rule 1 (geometry):** any new frame arithmetic for the thumbnail (D-01) must live in
  `lib/geometry/` as a pure, tested function — never inlined in `outline-viewer.tsx`'s JSX. A new
  "phone thumbnail frame" option belongs beside `hideCallouts`/`fixedFrame` in
  `outlineViewMetrics`, with its own unit test.
- **Rule 2 (units):** this phase must not touch how any number is *converted* — only how big the
  card or control drawing it is. `CardMetadataLine` (both card types) and every dialog's copy
  already route through `lib/geometry/units.ts`/`measure-display.ts`; a card-height change must
  not touch `CardMetadataLine`'s own font size or truncation behavior (Typography table in
  UI-SPEC pins its size at `text-xs`, unchanged).
- **§Layout (width vs. pointer):** `shell:`/`max-shell:` (820px) picks layout; `coarse:` picks
  control size. D-07's route check is the one sanctioned exception (a third, independent axis —
  UI-SPEC says this explicitly and it is correct). Any new phone-only CSS for D-01/D-02/D-03
  must be `coarse:`- or `max-shell:`-gated, never a bare width media query that isn't one of
  those two custom variants (confirmed: `app/globals.css:77` defines `coarse` as
  `@media (pointer: coarse)`; `app/globals.css:457` defines `--breakpoint-shell: 820px`).
- **Geometry math lives in `lib/`, pure and tested; no React/browser/DB imports there** — the new
  thumbnail-frame option must respect this (as `outlineViewMetrics` already does).

## Factual Drift (CONTEXT.md / UI-SPEC vs. what this session found in the code)

1. **The "hamburger trigger in `components/site-nav.tsx`"** (CONTEXT.md `code_context`, UI-SPEC
   "Already done") is not literally in that file. `components/site-nav.tsx:94` renders
   `<PhoneTopBar />` (from `components/design/phone-top-bar.tsx`), which itself renders
   `<PhoneMenu />` (`components/design/phone-menu.tsx:23-36`) — the actual menu-icon trigger,
   `size-8 coarse:size-11` (32px→44px), lives in `phone-menu.tsx`. Harmless: the underlying claim
   ("already touch-sized, plan no work here") is still true, confirmed by reading
   `phone-menu.tsx:33` directly — only the file attribution was off by one hop.
2. **`components/design/phone-tab-bar.tsx`'s own doc comment is stale.** It says (lines 5-7) the
   bar is "Mounted once in `app/design/layout.tsx` ... and nowhere else (the setup screen and the
   rack are Phase 10's)" — but `app/page.tsx:6,53` *already* mounts `<PhoneTabBar />` today, with
   no `usePathname()` guard inside the component itself. This means **the six-tab bar already
   renders on `/` today** (confirmed independently by `e2e/phone-home.spec.ts:54-73`, whose own
   test asserts the tab bar is visible with all six tabs on `/`) — this is exactly the bug D-07
   exists to fix, and the doc comment just hasn't caught up to the `app/page.tsx` mount that
   already happened. **Action for the plan:** the fix instructions in UI-SPEC ("add a
   `usePathname()` read inside `phone-tab-bar.tsx`, return `null` when `pathname === "/"`") are
   correct and sufficient; the plan should also delete/update the stale "and nowhere else" doc
   comment while it's in the file, and **must update `e2e/phone-home.spec.ts`'s existing
   "the tab bar shows all six screens" test**, which currently pins the *wrong* (pre-fix)
   behavior and will need to move to a "tab bar is absent on `/`" assertion, or be scoped only to
   `/design/*` if a sibling spec already covers that route.
3. **NEW FINDING, not in CONTEXT.md or UI-SPEC: the setup screen's card grid already goes 2-up at
   640px, not 820px.** `components/setup/setup-screen.tsx:145` and
   `components/setup/board-rack.tsx:100` both use
   `grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 max-shell:mt-4 max-shell:gap-4` — `sm:`
   is Tailwind's own default 640px breakpoint, entirely independent of the app's custom `shell:`
   (820px) variant. Running `node -e "console.log(require('@playwright/test').devices['iPhone 14
   landscape'].viewport)"` this session returns `{"width":750,"height":340}` — **750px is below
   the 820px shell breakpoint (so the phone chrome renders: compact top bar, one menu, no desktop
   nav) but above the 640px `sm:` breakpoint, so the card grid silently becomes the two-up layout
   D-01 explicitly rejected** ("drawings fall to ~150px wide, silhouettes only") for the same
   width the phone shell is still active at. `Pixel 7 landscape` is 863px (confirmed via the same
   command: `{"width":863,"height":360}`), above 820px, so it gets the desktop shell — a
   different, pre-existing (and out of scope) narrow-desktop-window layout question. **This needs
   a fix**: change `sm:grid-cols-2` to `shell:grid-cols-2` in both files so the card layout switch
   tracks the same 820px boundary the rest of the phone shell already uses, keeping "one column
   below 820px" true everywhere the phone chrome is active — consistent with D-01/D-02's "one
   card system, one column."

## Standard Stack

No new library. Every control in scope is built from already-installed primitives:

| Piece | Already in repo | Purpose here |
|-------|------------------|--------------|
| `components/ui/button.tsx` | yes (shadcn, Base UI) | `default`/`icon` sizes already carry `coarse:h-11`/`coarse:size-11`; `icon-sm` does not (the one gap, in `DialogContent`'s close button) |
| `components/ui/input.tsx` | yes | carries `coarse:text-base` (16px) but not `coarse:h-11` (the other gap) |
| `components/ui/dialog.tsx` / `alert-dialog.tsx` | yes | five rack/sign-in dialogs are built on these |
| `@clerk/nextjs`'s `<UserButton />` / `<SignIn>` | yes | D-05's subject; no `appearance` prop set anywhere today (confirmed: `app/layout.tsx`'s `<ClerkProvider>` takes no `appearance`, `nav-auth-control.tsx:28` renders `<UserButton />` bare) |
| `@base-ui/react/menu` | yes | `RackCardMenu`, `SettingsMenu`, `PhoneMenu` all built on this, not a shadcn dropdown-menu wrapper |

**Installation:** none. No `npm install` needed for this phase.

## Package Legitimacy Audit

**Not applicable.** Per the phase's own scope statement and orchestrator ruling: no new shadcn
component is installed, no new npm/PyPI/crates package is added. `components.json`'s
`"registries": {}` stays empty (confirmed: `10-UI-SPEC.md`'s own Registry Safety table, and no
`package.json` diff is implied by anything read this session). If a genuine package need surfaces
during planning, it belongs in Open Questions, not a recommendation, per the orchestrator's
ruling.

## The Headline Finding: D-01/D-02's Card-Height Arithmetic

### Why "crop the frame" does not shrink the card

The thumbnail box is `aspect-[340/620] w-full` (`preset-card.tsx:79`, `board-rack-card.tsx:90`
via the shared `CardThumbnail`). Because it's `w-full`, its CSS **width** is fixed by the
one-column card layout (~295px inner width, derived from the D-01-measured 343px card minus two
nested `p-3` paddings — `preset-card.tsx:69-78`, `board-rack-card.tsx:88-89`), and its CSS
**height** is *entirely determined* by whatever aspect ratio the frame uses
(`height = width / (viewBoxWidth/viewBoxHeight)`).

`outlineViewMetrics` (`components/outline/outline-viewer.tsx:270-286`) fits a board's **length**
to the frame's vertical space (`lengthFitScale = (VIEW_H - PAD_Y*2) / lengthIn`, `VIEW_H=620`,
`PAD_Y=24` at `outline-viewer.tsx:76-78`) — the board's width is then whatever that same scale
produces (`cwIn * scale`). This means: **once the thumbnail's CSS height is fixed, the board's
drawn CSS width is fixed too — as `thumbnailHeightPx × (widePointWidth_in / length_in)`,
independent of how tightly the frame's width is cropped.** Cropping viewBox *width* only matters
when the CSS box's height is set independently of its width (e.g. a fixed print window) — not the
case for a `w-full`/`aspect-[]` phone card, where height is *derived from* width via whatever
aspect ratio the frame supplies. A width-only crop that still fits every board in the editable
range (`BOARD_LENGTH_RANGE_IN`/`WIDEPOINT_WIDTH_RANGE_IN`, `lib/geometry/board.ts:102-103`, values
`{min:60,max:120}` and `{min:16,max:25}`) converges on an aspect ratio (~0.43-0.55) close to
today's 340:620 (0.548) — narrowing the frame *further* only makes the derived CSS height
*taller*, the opposite of the goal.

**Verified numerically** (`npx tsx` against the real `lib/geometry/board.ts`,
`lib/geometry/presets.ts`, `lib/geometry/outline.ts`, `lib/geometry/units.ts` this session):

Baseline check (today's uncropped 340×620 frame, thumbnail CSS height 538px, matching D-01's own
529px measurement within rounding):

| Preset | Length (in) | Width (in) | Drawn width today (px) |
|---|---|---|---|
| shortboard | 74.0 | 18.75 | 125.8 |
| fish | 66.0 | 20.50 | 154.2 |
| midlength | 84.0 | 21.00 | 124.1 |
| longboard | 108.0 | 22.50 | 103.4 |

Card height → thumbnail height → drawn board width, using the **verified, frame-crop-independent
formula** `boardWidthPx ≈ widePointWidth_in × (thumbnailHeightPx − 2×marginPx) / length_in`, with a
best-case minimal 6px vertical margin (down from today's ~21px-equivalent — this is the one real
lever a tighter frame buys, and it's small):

| Card height | Thumbnail height | shortboard | fish | midlength | longboard |
|---|---|---|---|---|---|
| 280 (D-01's floor) | 121 | 28px | 34px | 27px | 23px |
| 300 (D-01's target) | 141 | 33px | 40px | 32px | 27px |
| 320 (D-01's ceiling) | 161 | 38px | 46px | 37px | 31px |
| 450 | 291 | 71px | 87px | 70px | 58px |
| 500 | 341 | 83px | 102px | 82px | 69px |
| 550 | 391 | 96px | 118px | 95px | 79px |
| 600 | 441 | 109px | 133px | 107px | 89px |
| 693 (today) | 534 | 132px | 162px | 131px | 109px |

**Every candidate at 280-320px draws every preset narrower than the ~150px floor D-01's own
rationale used to reject the two-up grid** ("drawings fall to ~150px wide, silhouettes only") —
in fact 3-6x narrower. Card height needed for each preset to individually clear 150px (best-case
6px margin): shortboard 763px, fish 654px, midlength 771px, longboard 891px — **all taller than
today's 693px card.** There is no card height between 280px and ~650px that gets even the
best-proportioned preset (fish) to 150px.

### What this means for planning

- **D-01's literal 280-320px number cannot be met while preserving legibility, under any
  frame-cropping approach.** UI-SPEC already wrote the escape valve for exactly this outcome
  ("the card height ceiling widens rather than the board shrinking past that floor," and "if the
  frame tightening can't clear that floor... the card height ceiling widens") — this research
  supplies the numbers needed to use it.
- **A defensible target, given today's own shipped baseline is not "150px for every preset"
  either** (longboard already draws at only 103px today, and that ships) — a target of "at least
  as legible as today" lands around 550-600px total card height (roughly a 13-20% reduction from
  693px), buying a modest scroll improvement (~1.15-1.3 cards visible per screen vs. ~1 today),
  not the "two-and-a-bit" D-01 hoped for. A stricter "clear 150px for the two most common shapes
  (shortboard/fish)" target lands around 650-770px — barely shorter than today.
- **The one genuine code lever left**: reduce the frame's own internal vertical margin (`PAD_Y`)
  for this specific thumbnail context from ~24 view-units (a ~21px-equivalent margin at today's
  scale) down to something like 6-8px worth of margin. This buys a real, if modest (~10-15%),
  width improvement at any given card height — worth doing regardless of the final number chosen,
  and it's a genuinely different lever than "crop the width," which (per the arithmetic above)
  does nothing for this specific box (fixed-width, aspect-ratio-derived-height) layout.
- **Present these numbers to the founder before locking a card height** — this is squarely
  "measure the smallest drawing that still reads before fixing a number," per D-01's own
  instruction, and the honest answer is that 280-320px fails that test for every preset. The plan
  should include a `checkpoint:human-verify` (or equivalent UAT) step showing the founder actual
  rendered cards at 2-3 candidate heights (e.g. 450px, 550px, 650px) before locking one, since no
  amount of further arithmetic substitutes for a shaper's own eye on "can I tell these apart."
- Any new frame option belongs in `lib/geometry`/`outline-viewer.tsx` beside `hideCallouts`/
  `fixedFrame` (Rule 1) — e.g. a `phoneThumbnail?: boolean` flag on `OutlineViewer`, and a
  `PAD_Y` override threaded through `outlineViewMetrics`, with its own unit test verifying the
  formula above against the four presets and the two range extremes (`BOARD_LENGTH_RANGE_IN`/
  `WIDEPOINT_WIDTH_RANGE_IN`).

## Architecture Patterns

### System Architecture Diagram

```
Phone browser
   │
   ├─ / (setup screen)                         ├─ /design/* (five screens)
   │    SiteNav (site-nav.tsx)                  │    SiteNav (same instance, root layout)
   │      └─ max-shell:hidden desktop row        │      └─ max-shell:hidden desktop row
   │      └─ PhoneTopBar (phone-top-bar.tsx)     │      └─ PhoneTopBar (same component)
   │            └─ SaveButton                    │            └─ SaveButton
   │            └─ PhoneMenu (phone-menu.tsx)     │            └─ PhoneMenu (same component)
   │                  └─ SettingsMenuContent      │                  └─ SettingsMenuContent
   │                  └─ NavAuthControl ──D-05/D-06│                 └─ NavAuthControl
   │                        └─ Clerk <UserButton/> │                       └─ Clerk <UserButton/>
   │                        └─ "Sign in" button    │                       └─ "Sign in" button
   │                              └─ SignInDialog  │                             └─ SignInDialog
   │    SetupScreen (setup-screen.tsx)            │    DesignLayout (app/design/layout.tsx)
   │      └─ BoardRack (D-02) ── RackCardMenu     │      └─ SignInBanner (dismiss X ── gap)
   │            └─ RenameDialog ── D-03 gap       │      └─ ToolbarTip
   │            └─ DeleteConfirmDialog ── D-04    │      └─ {children} (the 5 screens)
   │      └─ PresetCard grid (D-01) ── ARITHMETIC │      └─ PhoneTabBar (D-06/D-07)
   │      └─ ReplaceBoardDialog                   │            already safe-area-padded,
   │    PhoneTabBar (D-07: hide via usePathname)  │            already hidden on desktop
   │         BUG TODAY: renders unconditionally
   │         on `/` (app/page.tsx:53) — no route
   │         guard inside the component yet
```

### Recommended Project Structure

No new files/folders required. Touched files:
```
components/ui/dialog.tsx          # DialogContent close-X: add coarse:size-11
components/ui/input.tsx           # add coarse:h-11
components/auth/nav-auth-control.tsx   # D-06 "Sign in" row + loading placeholder
components/auth/sign-in-banner.tsx     # dismiss X: coarse:size-11 (Phase 9's own deferred item)
components/design/phone-tab-bar.tsx    # D-07: usePathname() null-return on "/"
components/setup/setup-screen.tsx      # sm:grid-cols-2 -> shell:grid-cols-2 (new finding)
components/setup/board-rack.tsx        # same grid fix
components/outline/outline-viewer.tsx  # D-01/D-02: new phone-thumbnail frame option
lib/geometry/outline.ts (or a sibling) # the new frame's pure function + unit test
```

### Pattern: the "enlarge the row, not the glyph" idiom

**What:** grow a control's *tap area* without changing its visible size, via
`coarse:min-h-11 coarse:flex coarse:items-center` on the row (not the icon/text inside it).
**When to use:** D-06's "Sign in" text button, D-07 is not this pattern (it's a route check, not
a size), D-05's Clerk wrapper *if* measurement shows it's needed.
**Example (existing, verified):**
```tsx
// components/setup/rack-card-menu.tsx:22-23 — the exact idiom already shipping
const ROW_CLASS =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm " +
  "outline-none select-none coarse:min-h-11 data-highlighted:bg-surf-well";
```
For D-05, if `<UserButton />` measures short, the lever is Clerk's `appearance.elements` prop
(a plain wrapping `<div>` does NOT enlarge Clerk's own internal `<button>`):
```tsx
// nav-auth-control.tsx — only if measurement shows the trigger is under 44px
<UserButton appearance={{ elements: { userButtonTrigger: "coarse:p-2" } }} />
```

### Anti-Patterns to Avoid

- **A plain wrapper `<div>` around `<UserButton />` "to make it bigger."** Clerk renders its own
  `<button>` inside; a wrapper only adds inert padding around a still-small tap target (confirmed:
  no `appearance` prop exists anywhere in this codebase today to override this).
- **Capping the thumbnail's CSS box height while leaving the `340×620` viewBox untouched.** This
  was already flagged in UI-SPEC and independently reconfirmed by this session's arithmetic: it
  scales the *entire* frame down — blank margin and all — converging on the same "~150px wide,
  silhouettes only" outcome the two-up grid was rejected for, at any card height under ~650px.
- **Treating "crop the viewBox width" as the lever for a shorter card.** Per the Headline Finding,
  it isn't — the CSS height of a `w-full`/`aspect-[]` box is *derived from* width via the aspect
  ratio, so cropping width (holding height's ratio target) makes the box *taller*, not shorter.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Growing a Clerk-rendered button's tap target | A custom wrapper measuring/patching Clerk's DOM | `appearance.elements.userButtonTrigger` (Clerk's own theming API) | A DOM wrapper doesn't touch what's actually clickable; Clerk's own prop does, without an `!important` fight |
| A disclosure/accordion for anything in this phase | A new animation library | Nothing needed here — no folded-controls pattern exists on these surfaces (that was Phase 9's TEMPLATE/ROCKER "Fine adjust" group, out of scope) | N/A this phase, noted only to avoid scope creep |
| Detecting "is this a touch device" | `navigator.maxTouchPoints` or UA sniffing | The existing `coarse:` custom variant (`@media (pointer: coarse)`, `app/globals.css:77`) / `useCoarsePointer()` hook already used by `outline-viewer.tsx:47,303` | One already-tested mechanism app-wide; a second detection method would drift from it |

**Key insight:** every "don't hand-roll" risk in this phase is really the same risk restated —
Clerk owns its own DOM, and the app already owns exactly one touch-detection mechanism
(`coarse:`). Nothing in this phase needs a new one.

## Common Pitfalls

### Pitfall 1: Solving D-01 by shrinking the CSS box alone

**What goes wrong:** a `max-shell:max-h-[…px]` or shorter `aspect-[]` class change ships without
touching `outlineViewMetrics`, and the board renders as a tiny sliver on every preset.
**Why it happens:** the naive fix looks obviously correct (smaller box → smaller drawing → fits
more per screen) and passes a quick visual check on a demo-sized viewport, but fails the "can I
tell a shortboard from a fish" test the founder will actually apply.
**How to avoid:** implement and unit-test the new frame option in `lib/geometry`/
`outline-viewer.tsx` *before* touching the CSS box size, and check the rendered widths against
the table above.
**Warning signs:** a code review that only diffs Tailwind classes on `preset-card.tsx` with no
change inside `outline-viewer.tsx` or `lib/geometry`.

### Pitfall 2: Fixing the tab bar at the wrong layer

**What goes wrong:** hiding `<PhoneTabBar />` at its call site in `app/page.tsx` (an `if
(!hideOnHome)` around the JSX) instead of inside the component.
**Why it happens:** it looks like a smaller, more local diff.
**How to avoid:** CONTEXT.md is explicit that `app/page.tsx`'s single-fragment mount must not be
touched (it exists specifically to prevent a double-mount across the signed-in/signed-out
branches); the `usePathname()` check belongs inside `phone-tab-bar.tsx` itself, matching the
`onHomeScreen` pattern `phone-top-bar.tsx:39` already uses for its own wordmark.
**Warning signs:** a diff touching `app/page.tsx`'s return statement for this task.

### Pitfall 3: Assuming `sm:`/`shell:` are the same axis

**What goes wrong:** a developer sees `sm:grid-cols-2` on the setup grid, assumes it's part of the
phone/desktop switch (like `max-shell:`), and leaves it alone as "already handled."
**Why it happens:** Tailwind's default `sm:` (640px) and this app's own `shell:` (820px) are both
plausible-looking "medium width" breakpoints, and nothing in the file's own comments flags the
mismatch (confirmed: no comment near `sm:grid-cols-2` in either `setup-screen.tsx` or
`board-rack.tsx` explains the choice).
**How to avoid:** use the app's own `shell:`/`max-shell:` variant for this switch, consistent with
every other phone/desktop decision this phase and Phase 9 made.
**Warning signs:** iPhone-14-landscape (750px, confirmed via Playwright's `devices` export) still
showing a two-up card grid after "fixing" D-01/D-02.

## Code Examples

### The one real code change needed inside `components/ui/*`

```tsx
// components/ui/dialog.tsx:66-70 — today
<Button
  variant="ghost"
  className="absolute top-2 right-2"
  size="icon-sm"   // 28px (size-7), no coarse: override — the icon/default variants DO have one
/>

// Fix (the same one-line idiom Button's own icon/default variants already use, per Button's
// own size table: "icon": "size-8 coarse:size-11" — components/ui/button.tsx:31)
<Button
  variant="ghost"
  className="absolute top-2 right-2 coarse:size-11"
  size="icon-sm"
/>
```

```tsx
// components/ui/input.tsx:15 — today (confirmed: coarse:text-base present, coarse:h-11 absent)
"h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base " +
"transition-colors outline-none ... md:text-sm coarse:text-base dark:bg-input/30 ..."

// Fix: add coarse:h-11 alongside the existing coarse:text-base
"h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base " +
"transition-colors outline-none ... md:text-sm coarse:text-base coarse:h-11 dark:bg-input/30 ..."
```

### D-06's fix, matching the row-not-glyph idiom already in the codebase

```tsx
// components/auth/nav-auth-control.tsx:33-39 — today, 20px tall (text-sm, no height class)
<button
  type="button"
  onClick={() => setDialogOpen(true)}
  className="text-sm text-surf-ink-muted transition-colors outline-none hover:text-surf-ink focus-visible:text-surf-accent-ink"
>
  Sign in
</button>

// Fix: grow the row under coarse, leave the 14px text alone
<button
  type="button"
  onClick={() => setDialogOpen(true)}
  className="coarse:flex coarse:min-h-11 coarse:items-center text-sm text-surf-ink-muted transition-colors outline-none hover:text-surf-ink focus-visible:text-surf-accent-ink"
>
  Sign in
</button>
// and the loading placeholder (line 24) needs the matching coarse:size-11 so nothing jumps
// when Clerk resolves: <span aria-hidden className="block size-7 coarse:size-11" />
```

## Runtime State Inventory

Not applicable — this is a UI-retrofit phase (sizing and layout), not a rename/refactor/migration.
No stored data, service config, OS-registered state, secret/env var, or build artifact carries a
name or identifier this phase changes.

## Common Pitfalls (continued) / Assumptions Log

See below.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Clerk's `<UserButton />` renders under 44px at its default appearance (D-05's own subject) | D-05, Standard Stack | If it already clears 44px, the plan should do nothing — writing a wrapper "just in case" would be exactly the anti-pattern D-05 warns against. Confirmed: no `appearance` prop set anywhere (`app/layout.tsx`, `nav-auth-control.tsx:28`), so the render is Clerk's unmodified default — but this session could not measure Clerk's actual rendered pixel size (Clerk needs a live signed-in session; Playwright's fake `sk_live_fake-...` key cannot render real Clerk UI per the orchestrator's own ruling). This MUST be measured by the founder on a real device or in a real signed-in browser before D-05 is implemented. |
| A2 | 6-8px is a reasonable minimum vertical margin for the phone thumbnail frame | The Headline Finding | If the founder wants more visual breathing room than 6px, the numbers in the table shift slightly (a few px per preset) but the core conclusion (280-320px is unreachable) does not change — verified across both a 24px-equivalent and an 8px-equivalent margin in this session's script, with under a 2% difference in the final board widths. |
| A3 | A ~150px board width is the right "legibility floor" to hold this phase to | The Headline Finding | This number comes from D-01's own rejection rationale for the two-up grid ("drawings fall to ~150px wide, silhouettes only"), not from a measured usability test. Today's shipped longboard thumbnail (103px) is already narrower than that and ships live — so the real floor the founder actually accepts may be lower than 150px. The plan should show the founder rendered candidates rather than picking a number from this arithmetic alone. |
| A4 | The iPhone-14-landscape grid regression (Factual Drift #3) is worth a dedicated fix in this phase, not a follow-up | Factual Drift, Don't Hand-Roll | If the founder considers 750px-wide landscape phone use out of scope for this milestone, this becomes a documented, deferred gap rather than a task — but it directly contradicts D-01/D-02 ("one column... whatever D-01 settles applies to both") at a width real users will hit, so this research recommends fixing it in-phase. |

**If this table were empty:** it isn't — A1 in particular gates the D-05 implementation and must
become a `checkpoint:human-verify` task in the plan, not a decision made from this document alone.

## Open Questions

1. **What card height does the founder actually approve for D-01/D-02?**
   - What we know: 280-320px fails every preset against a 150px floor; ~550-650px roughly matches
     today's own worst-case legibility; the numbers for several candidates are in the table above.
   - What's unclear: whether the founder's real bar is "150px," "no worse than today," or
     something else entirely — this is a visual judgment call, not a number this research can
     supply.
   - Recommendation: the plan should render 2-3 concrete candidate heights (e.g. 450, 550, 650px)
     for all four presets and put them in front of the founder as a `checkpoint:human-verify`
     before locking the number, exactly as D-01's own instruction asks ("measures the smallest
     drawing that still reads before fixing a number").
2. **Does `<UserButton />` actually measure under 44px?**
   - What we know: no `appearance` override exists today; Clerk's documented default avatar size
     is commonly cited in the 28-32px range, but this research did not verify that against
     Clerk's own current documentation (no web search was run, per this phase's config — see
     Sources) and cannot render real Clerk UI under Playwright's fake test key.
   - What's unclear: the actual rendered pixel size on a real device.
   - Recommendation: a `checkpoint:human-verify` task, exactly as D-05 specifies, on a real
     signed-in phone or desktop browser, before writing any wrapper.
3. **Does the iOS keyboard actually cover `rename-dialog.tsx`/`board-name-prompt.tsx`'s centred
   text input?**
   - What we know: `interactiveWidget: "resizes-content"` is already set app-wide
     (`app/layout.tsx:47`), which UI-SPEC believes already covers this.
   - What's unclear: whether that setting is sufficient in practice on a real iPhone with the
     dialog's specific `top-1/2 -translate-y-1/2` centering.
   - Recommendation: measure on a real device during execution verification (D-03's own
     instruction) and only add scroll/`max-h` handling if it's actually obscured.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Chromium/WebKit (Playwright) | Automated phone/desktop specs | ✓ | installed per Phase 9 (`~/Library/Caches/ms-playwright`) | — |
| A real iPhone | PHON-10 sweep, D-05 measurement | Founder-owned, not available to this session | — | None — this is why D-05 and the sweep are `checkpoint:human-verify` items, not automatable |
| A real Android phone | PHON-10 sweep | Founder-owned, not available to this session | — | Same as above |
| Clerk with a real key (signed-in UI) | D-05 measurement | Not available under Playwright (fake `sk_live_fake-...` key, per orchestrator ruling) | — | Real-device / real-browser measurement only |

**Missing dependencies with no fallback:** a real iPhone and Android phone, and a real
Clerk-authenticated session — both are the founder's own devices/account, not obtainable inside
this research or execution sandbox. Both are already correctly scoped as `checkpoint:human-verify`
items by CONTEXT.md/UI-SPEC's own D-05 and by PHON-10's own requirement text.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (unit, `lib/geometry/**/*.test.ts`, node env) + Playwright (`@playwright/test`, e2e) |
| Config file | `vitest.config.ts` (unit), `playwright.config.ts` (e2e, port default 3100, `PW_PORT` override) |
| Quick run command | `npm test` (vitest run); `npm run test:e2e:phone` (iphone+android projects only) |
| Full suite command | `npm test && npm run test:e2e` |

### Phase Requirements → Test Map

| Req/Decision | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| PHON-07 (sign-in/account menu) | "Sign in" row ≥44px tall on touch | e2e (Playwright, phone projects) | new assertion in `e2e/phone-home.spec.ts` or a new `e2e/phone-account.spec.ts`, `boundingBox()` on `nav-auth-control.tsx`'s button | ❌ Wave 0 — no existing spec asserts this control's size |
| PHON-07 (Clerk avatar) | `<UserButton />` clears 44px, or is wrapped | real-device only | none (Playwright can't render authenticated Clerk UI, per orchestrator ruling) | N/A — `checkpoint:human-verify` |
| PHON-08 (dialogs) | Dialog buttons/inputs ≥44px, 16px input text | e2e | extend `e2e/touch-sizing.spec.ts`'s pattern (lines 92-110) to the setup-screen dialogs, or a new spec scoped to `/` | ❌ Wave 0 — `touch-sizing.spec.ts` currently only covers `/design/outline` and `/design/volume` |
| PHON-08 (card height/legibility) | Card lands at the approved height; drawing still distinguishes presets | unit (arithmetic) + visual checkpoint | a new `lib/geometry/outline.test.ts` (or sibling) case asserting the new frame function's output widths at the approved height, for all four presets and the two range extremes | ❌ Wave 0 — new function, new test |
| PHON-08 (landscape grid) | Setup screen stays one column below 820px, including 750px landscape | e2e | new spec, same pattern as `e2e/phone-fins-landscape.spec.ts` (explicit `devices["iPhone 14 landscape"]`, 750×340) | ❌ Wave 0 — no existing spec checks the setup grid at this width |
| PHON-07 (tab bar hidden on `/`) | `PhoneTabBar` absent on `/`, present on `/design/*` | e2e | **update** `e2e/phone-home.spec.ts:54-73` (currently asserts the OPPOSITE — the bar IS visible on `/` today) | ⚠️ exists but pins the pre-fix behavior; must be edited, not just extended |
| PHON-09 (Summary/order form on phone) | No sideways scroll, controls on screen | e2e (already passing) + real-device confirmation | existing summary specs (`summary-preview.spec.ts`, `summary-print-size.spec.ts`, etc.) | ✅ already covered |
| PHON-10 (end-to-end) | Full sign-in → design → save → summary trip on real hardware | real-device only | none automatable | N/A — `checkpoint:human-verify`, see Real-Device Sweep below |

### Sampling Rate

- **Per task commit:** `npm test` (fast, geometry-only) for any `lib/geometry` change; the
  relevant `npm run test:e2e:phone` spec file for any UI change.
- **Per wave merge:** `npm run test:e2e:phone` in full (faster than the full suite, phone-only —
  matches this phase's own domain).
- **Phase gate:** `npm test && npm run test:e2e` (full suite, including the desktop regression
  pass) green before `/gsd-verify-work`, plus the real-device sweep below signed off by the
  founder.

### Wave 0 Gaps

- [ ] A new/extended e2e spec asserting `nav-auth-control.tsx`'s "Sign in" row and loading
      placeholder are ≥44px under `coarse:` (PHON-07).
- [ ] A new/extended `e2e/touch-sizing.spec.ts`-style spec covering the setup-screen dialogs'
      inputs/buttons (PHON-08).
- [ ] A unit test for the new phone-thumbnail frame function in `lib/geometry`, asserting drawn
      widths for all four presets and the two range extremes at the approved card height
      (PHON-08).
- [ ] A new e2e spec (pattern: `e2e/phone-fins-landscape.spec.ts`) asserting the setup screen
      stays one column at `devices["iPhone 14 landscape"]` (750×340) — covers the new landscape
      finding (PHON-08).
- [ ] **Edit, not extend:** `e2e/phone-home.spec.ts`'s "the tab bar shows all six screens... on
      the home screen" test currently pins the pre-D-07 (buggy) behavior and must be rewritten to
      assert absence on `/`.

## Security Domain

`workflow.security_enforcement` is not present in `.planning/config.json`; treated as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---|---|---|
| V2 Authentication | Indirect | Unchanged — Clerk owns the whole auth flow; this phase only resizes/wraps the trigger, never touches credentials or session handling |
| V3 Session Management | No | Untouched by this phase |
| V4 Access Control | No | `proxy.ts`'s `clerkMiddleware()` with no `.protect()` is unchanged (open-access-by-design, per `lib/auth/open-access.test.ts`, not modified here) |
| V5 Input Validation | Yes (pre-existing) | The rename/name-prompt dialogs already trim + reject empty names client-side before the server action runs (`rename-dialog.tsx:54-58`); this phase does not change that validation, only the input's touch sizing |
| V6 Cryptography | No | Not touched |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---|---|---|
| A wrapper hiding/duplicating Clerk's real interactive element (tap-jacking a decoy) | Spoofing (of the control's true target) | Use Clerk's own `appearance.elements` prop rather than an overlay `<div>`, so the real button stays the actual tap target (already this research's own recommendation, for functional reasons too) |
| A test double leaking into a real build (fake Clerk key shape) | N/A (build hygiene) | The `pk_live_`-shaped fake key is confined to `playwright.config.ts`'s `webServer.env` (per orchestrator ruling); this phase does not touch that config |

No new attack surface is introduced by this phase — every change is a CSS class, a route check,
or a pure geometry function.

## Sources

### Primary (HIGH confidence — read this session)

- `components/setup/rack-card-menu.tsx`, `components/site-nav.tsx`, `components/settings-menu.tsx`,
  `components/design/phone-top-bar.tsx`, `components/design/phone-menu.tsx`,
  `components/design/phone-tab-bar.tsx`, `app/page.tsx`, `app/design/layout.tsx`,
  `components/auth/nav-auth-control.tsx`, `components/auth/sign-in-banner.tsx`,
  `components/ui/dialog.tsx`, `components/ui/alert-dialog.tsx`, `components/ui/button.tsx`,
  `components/ui/input.tsx`, `components/setup/rename-dialog.tsx`,
  `components/setup/board-name-prompt.tsx`, `components/setup/delete-confirm-dialog.tsx`,
  `components/setup/replace-board-dialog.tsx`, `components/auth/sign-in-dialog.tsx`,
  `components/outline/outline-viewer.tsx`, `components/setup/preset-card.tsx`,
  `components/setup/board-rack-card.tsx`, `components/setup/card-metadata-line.tsx`,
  `components/setup/setup-screen.tsx`, `components/setup/board-rack.tsx`, `app/layout.tsx`,
  `app/globals.css`, `lib/geometry/board.ts`, `lib/geometry/presets.ts`,
  `lib/geometry/measure-display.ts`, `components/design/measure-field.tsx`,
  `e2e/phone-home.spec.ts`, `e2e/touch-sizing.spec.ts`, `e2e/phone-fins-landscape.spec.ts`,
  `playwright.config.ts` — all opened directly this session, cited by path and line above.
- `npx tsx` script run against the live `lib/geometry` code this session, computing the
  card-height/board-width table above (script retained at
  `/private/tmp/claude-501/.../scratchpad/thumb-measure3.ts` for this session; not part of the
  repo).
- `node -e "require('@playwright/test').devices[...]"` run this session for the exact
  `iPhone 14 landscape` (750×340) and `Pixel 7 landscape` (863×360) viewport dimensions.

### Secondary (MEDIUM confidence)

- `.planning/quick/260910-2ny-.../260910-2ny-PROBE-READING.md` and `-BROWSER-READING.md` — real
  iPhone print measurements from a prior quick task, cited as corroboration that PHON-09's
  printing clause is already resolved (not re-verified by opening a printed page this session).

### Tertiary (LOW confidence / not verified this session)

- Clerk's default `<UserButton />` avatar size ("commonly cited in the 28-32px range" per
  UI-SPEC's own wording) — neither this research nor UI-SPEC verified this against Clerk's current
  documentation or a live render; flagged in the Assumptions Log (A1) and gated behind a real
  device/session measurement.

## Metadata

**Confidence breakdown:**
- Standard stack / no-new-dependency claim: HIGH — confirmed by reading every touched file and the
  phase's own "no shadcn add" statement in UI-SPEC's Registry Safety table.
- Card-height arithmetic: HIGH — derived from the real `outlineViewMetrics` formula (read directly
  from `outline-viewer.tsx`) and cross-checked numerically against D-01's own measured baseline
  (529-538px, matched within rounding).
- "Already done" claims (rack menu, hamburger, settings rows, Summary): HIGH for the three
  re-confirmed by reading the file this session (rack menu, hamburger/phone-menu, hidden tab bar
  bug); MEDIUM for Summary (corroborated by prior quick-task PROBE-READING files, not re-opened
  this session).
- Real-device items (D-05 Clerk sizing, iOS keyboard-over-dialog, the full sweep): LOW by
  necessity — these cannot be verified without hardware this session does not have; each is
  explicitly gated behind a `checkpoint:human-verify` task.

**Research date:** 2026-09-10
**Valid until:** ~30 days for the code-structure claims (stable app conventions); the Clerk-default
sizing claim (A1) should be re-verified at execution time regardless of date, since it depends on
Clerk's own current rendering, not this codebase.

---

# Real-Device Sweep (PHON-10)

This is the concrete, ordered checklist the founder runs on a real iPhone and a real Android
phone. Nothing here is automatable (Playwright cannot render authenticated Clerk UI, emulate the
iOS long-press callout accurately, emulate `display-mode: standalone`, or reproduce Safari's
toolbar collapse — per the orchestrator's own ruling and `e2e/*` code confirmed this session).

## Ordered steps, per phone

1. **Sign out fully, then sign up** from `/` — tap "Sign in" in the phone menu, use Clerk's
   `<SignIn withSignUp>` form to create a fresh account. *Watch for:* iOS — does the keyboard
   cover the dialog's title or the form's own fields? Android — does the Chrome/system keyboard
   push the page correctly given `interactiveWidget: "resizes-content"`?
2. **Sign out, sign back in** with the same account. *Watch for:* the "Sign in" row (D-06) and the
   Clerk avatar once signed in (D-05) — tap targets, not just visual size.
3. **Open the account menu** (the single `PhoneMenu` icon in the top bar) — Units, Theme, and the
   account control all live in one popup. *Watch for:* does tapping a row actually change units/
   theme without a mis-tap onto a neighboring row (iOS: does a long-press on any row trigger the
   text-selection/copy callout)?
4. **Pick a preset** from the (now phone-sized) grid — tap "Start Shaping." *Watch for:* is the
   chosen outline still clearly a shortboard/fish/midlength/longboard, or does it look like every
   other preset (the legibility floor this research measured)?
5. **Rename, duplicate, and delete a saved board** from the rack (after saving at least one board
   via step 8, return to `/`). *Watch for:* the rename/name-prompt dialog's text input — does the
   iOS keyboard cover it? Does the field zoom on focus (it must not, at 16px text)? Does Delete's
   confirm dialog make it hard to hit Cancel vs. Delete Board accidentally?
6. **Work through all five design screens** (TEMPLATE, ROCKER, RAILS, VOLUME, FINS), using the
   bottom tab bar to move between them. *Watch for:* on RAILS specifically (Phase 8's new
   surfaces) — the INSTRUCTIONS tab, the Flat/Domed toggle, View Full Sized, the legend
   checkboxes — none of these were touch-tested against a real device before now. *Watch for,
   app-wide:* sticky `:hover` states lingering after a tap (a known iOS Safari behavior); the
   iOS long-press callout appearing over any drag point mid-gesture (should be suppressed by
   `select-none`/`-webkit-touch-callout: none`, confirmed present in `outline-viewer.tsx:895-896`,
   but the CSS property itself is invisible to Playwright — see orchestrator ruling — so this is a
   real-device-only check); Safari's toolbar collapsing while scrolling the controls sidebar (does
   the drawing area reflow correctly using `dvh`, or does content jump/clip?).
7. **Turn the phone sideways** at least once during step 6, on both a screen that crosses the
   820px `shell` breakpoint in landscape (Android/Pixel-class, ~863px wide) and one that stays
   under it (iPhone, ~750px wide, per this session's Playwright-device confirmation). *Watch for:*
   the iPhone should land in the phone shell (bottom tab bar), the Android in the desktop shell
   (top nav) — per Phase 9's own settled recommendation; confirm this actually feels right in
   hand, not just technically correct.
8. **Save the board** (Save button in the top bar) — prompts for a name if untitled.
9. **Read the Summary screen and the on-screen order form.** *Watch for:* no sideways scroll,
   every number legible, the order form's write-in fields usable with a real finger.
10. **Return to `/` via the wordmark** and confirm the bottom tab bar is **absent** on the home
    screen (D-07) but the board now appears in "Your Boards," and turning the phone sideways here
    specifically — check whether the card grid still shows one column at ~750px width (the new
    landscape finding above) or regresses to two-up.

## Recording a pass or fail

For each numbered step above, on each phone, record: **PASS**, **FAIL (what broke, with a
screenshot/screen recording if possible)**, or **N/A (why)**. A single markdown table (device ×
step) handed to the verifier is sufficient — this phase's `checkpoint:human-verify` tasks should
each point at one row of that table, so the verifier can read a pass/fail directly rather than
re-deriving it from a narrative account.


---

# Orchestrator addendum (2026-09-10, after the founder's ruling)

The Headline Finding above is correct for an upright board and was confirmed by rendering the
real cards on an emulated iPhone 14 with Playwright (today: 721px card, board 130px wide; forced
to a 300px card: board 32px wide). Two corrections for the planner:

1. **The viewer already draws a board sideways** (`OutlineViewer`'s `orientation="horizontal"`,
   the Template screen's Rotate button). Sideways, the cross axis becomes the card's height, so
   cropping the frame's empty side margin DOES shorten the card: a 294px card with the board drawn
   278px long. It was measured, shown to the founder, and **declined** — see CONTEXT.md D-08.
2. **The founder chose upright at ~550px**, and that is a CSS-only change: cap the thumbnail box
   at 387px tall under `max-shell:` with the `340×620` frame untouched (meet-fit by height gives a
   357px-long board, 90px wide for the shortboard, measured 355 × 90 in the browser). The
   "Recommended Project Structure" entries for `components/outline/outline-viewer.tsx` and
   `lib/geometry/outline.ts` are therefore **withdrawn**; Wave 0's "unit test for the new
   phone-thumbnail frame function" is replaced by a Playwright measurement of the rendered card.
3. **The landscape grid (Factual Drift #3) is NOT changed to `shell:grid-cols-2`.** With a
   fixed-height thumbnail, two-up at 640-819px draws the board the same 357px long as one-up and
   shows two boards side by side; the real-device sweep's step 10 confirms it in hand (D-08).
4. **Open Question 2 is answered:** measured in the founder's signed-in production session on
   2026-09-10, Clerk's `.cl-userButtonTrigger` is 28 × 28px with `padding: 0`. D-05's "if it comes up
   short" branch applies — grow the hit area via `appearance.elements.userButtonTrigger`, re-measure.
   Assumption A1 is confirmed, not assumed.
