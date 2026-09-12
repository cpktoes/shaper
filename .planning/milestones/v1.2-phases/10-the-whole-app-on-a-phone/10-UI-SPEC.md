---
phase: 10
slug: the-whole-app-on-a-phone
status: approved
shadcn_initialized: true
preset: base-nova (components.json — baseColor neutral, iconLibrary lucide, no third-party registries)
created: 2026-09-10
reviewed_at: 2026-09-10
---

# Phase 10 — UI Design Contract

> Visual and interaction contract for the app AROUND the five design screens: the setup screen's
> preset and rack cards, the rack's Rename/Duplicate/Delete dialogs, sign-in and the account
> control, and the bottom tab bar's behaviour on the home route (PHON-07..10). Phase 9 built the
> phone shell, the compact top bar and the one menu — this phase's surfaces sit downstream of that
> work, and a lot of what CONTEXT.md's decisions ask for turns out to be **already built**,
> confirmed below by reading the code rather than assumed from the discussion. Every remaining
> item is prescriptive so the executor needs no further design judgment. Desktop is unchanged
> everywhere this contract applies a phone-only rule — see "Desktop untouched."

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (already initialized — `components.json`) |
| Preset | `base-nova`, baseColor `neutral`, no third-party registries (`"registries": {}`) |
| Component library | Base UI (`@base-ui/react`) via shadcn's Base UI preset — not Radix |
| Icon library | lucide-react |
| Font | Inter (`--font-body`/`--font-display`, both aliased to `var(--font-inter)`) |

No new shadcn component is installed this phase. Every surface in scope is built from `Dialog`,
`AlertDialog`, `Button` and `Input` (already installed under `components/ui/`) plus the app's own
Base-UI-primitive menus (`RackCardMenu`, `PhoneMenu`, `SettingsMenu` — all already built). See
"Already done" below for exactly how much of this phase's touch-sizing work these shared
components already carry for free.

---

## Spacing Scale

No new spacing token. Every surface in scope reuses the app's existing 4pt scale and its
established half-steps — `p-3` (12px) on the card shells and thumbnail frames, `gap-1`/`gap-2`
(4/8px) inside cards, `p-1.5` inside menu popups, `px-4`/`py-2` on the sign-in banner. This phase
changes which box a control sits in, not the increments it's measured with.

| Token | Value | Usage in this phase's surfaces |
|-------|-------|-------|
| xs | 4px | Gap between a card's stacked text lines is `gap-2` (8px) — 4px does not appear here |
| sm | 8px | `gap-2` between a card's name/dims/descriptor/CTA lines |
| md | 16px | `max-shell:gap-4` between cards in the grid (already shipped); dialog field spacing |
| lg | 24px | `max-shell:pt-6` above the setup screen's content |
| xl | 32px | `max-shell:pb-8`/`max-shell:mb-8` below the setup content and the rack section |
| 2xl | 48px | Not used by this phase's surfaces |
| 3xl | 64px | Not used by this phase's surfaces |

**Exception, already shipped, not introduced here:** `p-3` (12px) is the card shell and thumbnail
frame's own padding, doubled by nesting (outer button `p-3` + inner window `p-3` = 24px per side)
— this is existing structure the phone card-sizing work below must **not** flatten, because it's
also the surface that carries the light/dark hairline separation (see Color). If the drawing box
itself needs its own inset once its frame is tightened for a phone (Interaction & Layout Contract,
The setup screen's cards), that inset stays a value from this table.

---

## Typography

Every size below is already set somewhere in the app — no new size is introduced by this phase.
Two weights: 400 (regular) and 600 (semibold) for the setup-screen family below (the cards,
dialogs and banner); the nav/menu/tab-bar family (700 bold, `Label`/`Label (dense)` roles) is
Phase 9's and is unchanged here.

| Role | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Card name | 20px (`text-[20px]`) | 600 (`font-semibold`) | 1.2 | Preset/rack/in-progress card's board name (`preset-card.tsx`, `board-rack-card.tsx`) |
| Card meta | 12px (`text-xs`) | 600 (`font-semibold`) | 1.4 | The dims line (`CardMetadataLine`) and every card's uppercase CTA (`Start Shaping`/`Open This Board`/`Continue This Board`) |
| Card meta (plain) | 12px (`text-xs`) | 400 | 1.4 | `Last touched {date}` and the in-progress tag `In progress — not saved` (that one is `font-bold`, an existing exception, unchanged) |
| Card descriptor | 14px (`text-sm`) | 400 | 1.5 | The preset card's one-line pitch |
| Dialog title | 16px (`text-base`, shadcn's own `DialogTitle`/`AlertDialogTitle`) | 500 (shadcn's own `font-medium`) | 1 (`leading-none`) | Unchanged shadcn default — this phase does not restyle dialog chrome |
| Dialog field label | 12px (`text-xs`) | 600 (`font-semibold`) | 1 | "Board name" in `rename-dialog.tsx`/`board-name-prompt.tsx` |
| Dialog body/error | 14px (`text-sm`) | 400 | 1.4–1.5 | `AlertDialogDescription`, inline error paragraphs (`text-destructive`) |
| Touch input | 16px (`text-base`), via `coarse:` | 400 | 1.5 | Text size already shipped on `components/ui/input.tsx`; its 44px HEIGHT is not — see Already done |
| Sign-in banner text | 14px (`text-sm`) | 400 | default | `SignInBanner`'s one line, `text-balance` |
| Sign-in link | 14px (`text-sm`) | 700 (`font-bold`) | default | The `Sign In` inline link inside the banner (existing, unchanged) |

---

## Color

No new color token. Every surface below draws from tokens already assigned in `app/globals.css`'s
theme contract.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--surf-ground` | Page background |
| Secondary (30%) | `--surf-canvas` (card sand-frame), `--surf-panel` (dialog surface, thumbnail well), `--surf-tab-active` (thumbnail window) | Cards, dialogs, the thumbnail's own three-layer stack |
| Accent (10%) | `--surf-accent-ink` | Reserved for, explicitly, below |
| Destructive | `--surf-warning-ink` (menu row), shadcn's `destructive` Button variant (dialog action) | The Delete menu row and the Delete/"Discard & …" dialog actions — both pre-existing, unchanged |

**Accent reserved for (nothing else on these surfaces takes it):**
- The card's hover/focus ring (`hover:border-surf-accent-ink hover:ring-2 hover:ring-surf-accent-ink`, already shipped) and its "Start Shaping"/"Open This Board"/"Continue This Board" CTA text.
- The card's active-menu icon (`RackCardMenu`'s `data-popup-open:text-surf-ink` — actually neutral; the accent stays reserved for hover/focus rings and CTA text only, not the menu trigger's resting or open state).
- The sign-in banner's `Sign In` inline link.
- The existing hairline pair inside the thumbnail stack (`--surf-line` / `--surf-line-faint`) is **not** accent — see `preset-card.tsx`'s own doc comment: those two lines carry all the visual separation between page, window and board in the Slate theme, and neither may be simplified away or recolored by this phase's card-sizing work.

**Not accent:** the Delete confirm dialog's title and body copy (neutral ink; only the Delete
action button and the rack menu's Delete row carry the destructive/warning color, unchanged); the
dialog close-X (neutral `surf-ink-muted`, matching every other icon-only control in the app).

---

## Copywriting Contract

**This phase introduces no new copy.** Every string below already exists in the codebase; the
work in this phase is sizing and layout, never new wording. Restated here so the executor has the
authoritative source strings in one place and never retypes one from memory.

| Element | Copy | Source |
|---------|------|--------|
| Preset card CTA | **Start Shaping** | `preset-card.tsx` |
| Saved-board card CTA | **Open This Board** | `board-rack-card.tsx` |
| In-progress card tag / CTA | **In progress — not saved** / **Continue This Board** | `board-rack-card.tsx` |
| Rename dialog title / field / action | **Rename board** / **Board name** / **Save** | `rename-dialog.tsx` |
| Name prompt title / field / action | **Name this board** / **Board name** (placeholder `e.g. 6'2 Fish`) / **Save** | `board-name-prompt.tsx` |
| Delete confirm title / body / actions | **Delete "{boardName}"?** / **This can't be undone.** / **Cancel**, **Delete Board** | `delete-confirm-dialog.tsx` |
| Replace-board confirm (preset mode) | **Start a new design?** / "This replaces your board in progress. It hasn't been saved — starting new will lose it." / **Keep Editing**, **Discard & Start New** | `replace-board-dialog.tsx` |
| Replace-board confirm (open-saved mode) | **Open this board?** / "…opening this board will lose it." / **Keep Editing**, **Discard & Open** | `replace-board-dialog.tsx` |
| Sign-in dialog title | **Sign in to save your boards** | `sign-in-dialog.tsx` (everything below the title is Clerk's own `<SignIn>`) |
| Nav "Sign in" control | **Sign in** | `nav-auth-control.tsx` |
| Sign-in banner | "Sign in and your boards are saved. **Sign In**" | `sign-in-banner.tsx` |
| Rack card menu rows | **Rename**, **Duplicate**, **Delete** | `rack-card-menu.tsx` (already touch-sized — see Already done) |
| Duplicate failure (per-card, no dialog) | **Couldn't duplicate — try again.** | `board-rack.tsx` |
| Rename/Save/Delete failure (in-dialog) | **Couldn't save — check your connection and try again.** / **Couldn't delete — try again.** | `rename-dialog.tsx`/`board-name-prompt.tsx`/`delete-confirm-dialog.tsx` |

---

## Already done — read this before planning any work

Confirmed 2026-09-10 by reading the files, not by re-running CONTEXT.md's own claims. Some of
these correct or add to what CONTEXT.md's `code_context` said; where they do, this section is the
one to trust, per the factual-drift checklist.

- **`components/setup/rack-card-menu.tsx`, the hamburger in `components/site-nav.tsx`, and the
  units/theme rows in `components/settings-menu.tsx` are finished** — 44×44 trigger, `coarse:min-h-11`
  rows, 46px content-driven rows respectively. **Plan no work for these three.**
- **The Summary screen and its on-screen order form already read correctly on a phone** — no
  sideways scroll, the control row wraps, Print is fully on screen (verified repeatedly
  2026-09-10). **Success criterion 3's printing clause is already overtaken too** (phone printing
  works, per CONTEXT.md's own Specific Ideas) — this phase's job on Summary is limited to the
  end-to-end real-device sweep (success criterion 4), not new layout work.
- **The compact top bar and the one menu already render on `/`, not only on `/design/*`.** Contrary
  to reading CONTEXT.md's domain boundary as "build a phone menu for the setup screen," that menu
  already exists and is already mounted there: `components/site-nav.tsx`'s `onPhoneShellRoute`
  includes `pathname === "/"`, and `components/design/phone-top-bar.tsx` already special-cases its
  wordmark for the home screen (plain text there, a link everywhere else — quick task 260909-hq9).
  **PHON-07's "use the account menu on a phone" is structurally already wired for `/`** — what
  remains is sizing the controls inside it (D-05/D-06, below), not building a menu.
- **`Button` (`components/ui/button.tsx`) already carries `coarse:h-11` (default size) and
  `coarse:size-11` (icon size); `Input` (`components/ui/input.tsx`) already carries `coarse:text-base`.**
  Every one of D-03's five dialogs is built from these two primitives (`rename-dialog.tsx`,
  `board-name-prompt.tsx` use `Button`+`Input`; `delete-confirm-dialog.tsx`,
  `replace-board-dialog.tsx` use `AlertDialogAction`/`AlertDialogCancel`, both thin wraps of
  `Button`). **This means D-03's "finger-sized buttons" and D-04's "thumb-sized confirm" are
  already true for all five dialogs, with zero code changes, inherited from the shared component
  layer**, and `coarse:text-base` already gives the text inputs the 16px that stops iOS zooming on
  focus. **Plan no touch-sizing work for the BUTTONS in any of the five dialogs.**

- **`Input`'s HEIGHT is a second gap, and it is a real one.** `components/ui/input.tsx` carries
  ONLY `coarse:text-base` — there is no `coarse:h-11`, so its height stays `h-8` (32px) on a touch
  pointer, under the 44px target. **This project enforces 44px for a typed field as its own
  standard**: `e2e/touch-sizing.spec.ts:92` asserts "every visible typed measure field is at least
  44px tall with 16px text", and `components/design/measure-field.tsx` — the design screens' own
  field, Phase 9's subject — carries BOTH `coarse:h-11` and `coarse:text-base`. Left alone, the
  rename and name-this-board fields ship at 32px while every field on the five design screens is
  44px. **Plan the `coarse:h-11` addition for the text inputs** (`rename-dialog.tsx`,
  `board-name-prompt.tsx`) — on the shared `Input` or at those two call sites, the planner chooses,
  but the 44px must land. Desktop is untouched either way: `coarse:` is pointer-gated.
- **One real gap remains inside the Dialog-based three of those five**, found by reading
  `components/ui/dialog.tsx`: `DialogContent`'s own built-in close button renders at
  `size="icon-sm"` (28px, `size-7`) with **no `coarse:` override** — `Button`'s `icon-sm` variant
  never got one, only `icon` (32→44) and `default` (32→44) did. This 28px close-X is live today on
  every `Dialog` in the app, including three of the five D-03 dialogs: `rename-dialog.tsx`,
  `board-name-prompt.tsx` and `sign-in-dialog.tsx` (the two `AlertDialog`-based ones —
  `delete-confirm-dialog.tsx`, `replace-board-dialog.tsx` — have no built-in close-X at all, only
  the already-sized Cancel/Confirm buttons). **Fix once, at the source:** add `coarse:size-11` to
  `DialogContent`'s close button (`components/ui/dialog.tsx`, the `className="absolute top-2
  right-2"` on the `Button render`), the same one-line idiom `Button`'s own `icon`/`default`
  variants already use. This is the one code change D-03 actually still needs.

---

## Interaction & Layout Contract

### What triggers what

Two switches carry over unchanged from Phase 9 (`app/globals.css`'s `--breakpoint-shell: 820px`
giving `max-shell:`/`shell:`, and the `coarse:` pointer variant) — see that phase's UI-SPEC for the
full statement. This phase adds a **third, route-based switch, used exactly once:**

3. **Which route → whether the bottom tab bar shows at all.** D-07's rule ("hidden on the home
   screen") is neither a width effect nor a pointer effect — a phone at any width and any pointer
   type gets the bar on `/design/*` and not on `/`. This is intentionally **not** expressed as a
   CSS variant (there is no `route:` custom variant, and inventing one for a single call site would
   be over-engineering); it's a plain `pathname === "/"` check, the same pattern
   `phone-top-bar.tsx`'s `onHomeScreen` and `site-nav.tsx`'s `onPhoneShellRoute` already use for
   their own route-conditional rendering. **This is this phase's one sanctioned exception to "width
   picks layout, pointer picks sizing"** — CLAUDE.md's rule is about not conflating those two axes
   with each other, and this is a third, independent axis, not a violation of it.

### The bottom tab bar on the home route (D-07)

**Where the fix lives:** inside `components/design/phone-tab-bar.tsx` itself, not at either of its
two mount points (`app/page.tsx`, `app/design/layout.tsx`). Add a `usePathname()` read (the
component already imports it) and return `null` when `pathname === "/"`. This keeps both mount
points byte-identical to today — `app/page.tsx`'s single-fragment mount (which CONTEXT.md
specifically warns not to duplicate) never has to be touched, and `app/design/layout.tsx`'s
unconditional mount continues to show the bar on every one of the six design routes exactly as
before. The component deciding its own visibility from the route it can already read is the same
shape `PhoneTopBar` already uses for its wordmark — one convention, not two.

Net effect: the setup screen's scroller gets back the full ~56px + safe-area the bar was
costing it, with no other layout change — `SetupScreen`'s root is already `min-h-0 flex-1
overflow-y-auto`, so it simply grows into the freed space on its own (no new padding to add or
remove anywhere).

### The setup screen's cards (D-01/D-02)

**The outline drawing is the card's focal point — it is what the shaper is choosing on.** Every
sizing decision below serves that: the drawing may shrink, but it may never shrink past the point
where a shortboard, a fish and a longboard stop being tellable apart at a glance. The name, dims,
descriptor and CTA are supporting text and stay supporting text at every width.

**Target, per D-08 (measured at plan time; supersedes D-01's 280-320px range):** on a phone
(`max-shell:`), the thumbnail box is **387px tall** and the card lands at **~550px** (preset) /
**~546px** (rack); the board draws **357px long and 74-110px wide** across the four presets
(shortboard 90, fish 110, mid-length 89, longboard 74). About 1.2 cards fit a screen instead of
1.0. The founder chose this from screenshots on 2026-09-10 over a 300px upright card (board 26-39px
wide, unreadable) and over a sideways board (294px card, board 278px long) — CONTEXT.md D-08
records the options. One card system, one column, unchanged from today — this only changes how tall
the drawing inside it is allowed to get.

**Kept unchanged:** all four text lines (name, dims line, descriptor, CTA) — cutting any of them
would be "a phone layout that works by hiding a control," the thing this whole milestone forbids.
Their sizes are fixed by the Typography table above. Their combined height today is ~79px on the
preset card and ~75px on the two rack-card variants (measured from the leading-height maths: 24 +
17 + 21 + 17, and 24 + 17 + 17 + 17) — call it a fixed ~75–80px budget that does not move.

**Kept unchanged:** the card's own visual stack — the sand frame, the structural hairline, the
window, the receding hairline, the well (`preset-card.tsx`'s own five-layer doc comment). Do not
flatten this nesting to reclaim padding; those two hairlines are load-bearing in the Slate theme
(Color, above).

**What has to change — and it IS a CSS-only job, contrary to this section's first draft:** cap the
thumbnail box's height on the phone shell (`max-shell:`, 387px) and leave the `340×620` viewBox
untouched. `preserveAspectRatio="xMidYMid meet"` then fits the frame by HEIGHT (387/620 = 0.624px
per unit, against 291/340 = 0.856 available by width), so the board draws 357px long, centred, with
white space either side — exactly the render the founder approved from the screenshot. Measured
and disproved at plan time: cropping the frame's *width* does nothing for a fixed-width,
height-capped box, and shrinking the frame's vertical pad (`PAD_Y` 24 → 6 units) buys under 3% of
board length. So: **no new `OutlineViewer` option and no `lib/geometry` change** for the cards.

**Legibility check, stated so it can be tested:** on the Playwright phone projects, the first
preset card's outline path (`[data-board-silhouette="outline"]`, `getBoundingClientRect()`)
measures at least 350px tall and at least 85px wide, the card itself is between 520 and 580px
tall, and on the desktop project the same path and card measure exactly what they measure on
`main` today (the desktop screenshot baselines under `e2e/*-snapshots/` are the proof).

**D-02, applied:** whatever frame/box change (1) settles on must be the *same* change for
`preset-card.tsx`'s `OutlineViewer` call and `board-rack-card.tsx`'s `CardThumbnail` (both render
today's identical `aspect-[340/620]` box via near-duplicated JSX). **Factor the thumbnail box into
one shared piece** (a `CardThumbnail` used by both files, or the constant/prop the frame change
introduces) rather than editing two copies in parallel — the two files already duplicate
`CARD_SHELL_CLASS`-equivalent button styling byte-for-byte, which is exactly the kind of drift risk
D-02 exists to close off.

### The rack's dialogs (D-03/D-04)

Per "Already done" above, `Button`'s shared `coarse:` rules already give every one of the five
dialogs finger-sized buttons, and `Input`'s `coarse:text-base` already gives the text fields the
16px that stops iOS zooming. **Two code changes remain**: the `icon-sm` close-X fix stated above,
and `coarse:h-11` on the text inputs — `Input` is 32px tall on touch today, against this project's
own 44px standard for a typed field (`e2e/touch-sizing.spec.ts:92`, and `measure-field.tsx`, which
carries both rules). Nothing else is required by this contract for the dialogs' own controls.

**Width on a narrow screen:** already fine, unchanged. `DialogContent` is
`w-full max-w-[calc(100%-2rem)] sm:max-w-sm` (16px clear margin on a 360px phone, well inside the
360–393px range this project targets); `AlertDialogContent` is `max-w-xs` (320px) below `sm:`. No
dialog in scope needs a width change.

**iOS keyboard covering a centred dialog (D-03's own caveat):** this is a real-device measurement,
not a number this contract can set from reading code — do not add scroll-into-view or
`max-h`/`overflow` handling speculatively. `rename-dialog.tsx` and `board-name-prompt.tsx` are the
two dialogs with a text input at risk; measure both with the keyboard up on a real iPhone during
plan-time or execution verification, and only add a fix (most likely `interactiveWidget:
"resizes-content"`'s existing effect already covers it, since it's already set app-wide in
`app/layout.tsx`) if the dialog is actually obscured.

**D-04, stated plainly:** the delete confirm dialog needs no code change at all — its Cancel and
Delete Board buttons are `AlertDialogCancel`/`AlertDialogAction` at default size, already 44px
under `coarse:`. This phase's job here is verification (does it actually measure 44px on a real
device, in the real-device sweep), not implementation.

### Sign-in (D-05/D-06)

**`nav-auth-control.tsx`'s "Sign in" text button — the one genuinely under-target control in the
account surfaces.** Measured at 20px tall today (a bare `<button>` with `text-sm` styling and no
height class). Fix: add `coarse:min-h-11 coarse:flex coarse:items-center` to the button — the
"enlarge the row, not the glyph" idiom this app already uses for checkbox rows and rack-card-menu
items, so the word "Sign in" keeps its current 14px size and only the tappable row around it grows
under a touch pointer.

**The loading placeholder needs the same treatment, or it will visibly jump.** The component's
third state — `<span aria-hidden className="block size-7" />` while Clerk resolves — is 28px
today, which is close to neither the 20px "Sign in" button nor a 44px-tall touch target. Once the
"Sign in" row above grows to 44px under `coarse:`, leaving this placeholder at 28px means a
visible height jump the instant Clerk settles on a touch device. Fix: give the placeholder
`coarse:size-11` too, so all three states of this control (loading, signed-out, signed-in) claim
the same footprint under a coarse pointer and nothing shifts when Clerk resolves.

**Clerk's `<UserButton />` — measure before writing anything (D-05's own instruction, not settled
by this contract).** No `appearance` prop is set anywhere in this codebase today
(`app/layout.tsx`'s `<ClerkProvider>` takes no `appearance`, and `nav-auth-control.tsx` renders
`<UserButton />` bare), so its avatar renders at Clerk's own unmodified default — commonly cited in
the 28–32px range, but this contract will not assert a number it hasn't measured. **The gate,
exactly as D-05 states it:**
- If a real-device (or Playwright coarse-pointer) measurement shows the rendered trigger already
  clears 44px, leave `<UserButton />` completely alone — no wrapper, no `appearance` prop.
- If it measures under 44px, grow its **hit area**, not its **visual size** — the distinction
  matters because a plain wrapping `<div>` around `<UserButton />` does not enlarge what's
  actually clickable (Clerk renders its own `<button>` inside, sized by its own internal CSS
  variables); a wrapper only adds inert padding around a still-small tap target. The correct lever
  is Clerk's `appearance.elements` prop, targeting the button element itself with an added
  `coarse:` padding class (e.g. `appearance={{ elements: { userButtonTrigger: "coarse:p-2" } }}`)
  so the actual interactive element grows under a touch pointer while the avatar image inside it
  stays the same visual size — "wrap it without changing how it looks," applied to the one element
  that's actually tappable rather than to a decorative box around it.

### The sign-in nudge banner's dismiss control

**A real gap, not a hypothetical one.** Phase 9's own UI-SPEC already called for this exact fix
("dismiss `X` button gets the same `coarse:size-11` touch-target treatment as the top bar's menu
button") but `sign-in-banner.tsx` as it stands today has no `coarse:` class on its dismiss button
at all — just `shrink-0` and the icon. CONTEXT.md's own `code_context` flags this file as
unaddressed ("its dismiss control has not been measured for a finger"), and this phase's domain
boundary ("sign-in/sign-up and the account control") is where it belongs. Fix: wrap the `XIcon` in
the same fixed-square trigger idiom `PhoneMenu`/`RackCardMenu` already use —
`flex size-8 coarse:size-11 items-center justify-center` on the button itself (currently just
`shrink-0`) — so the 16px icon stays put while its tappable square grows to 44px under a coarse
pointer.

### Desktop untouched

Every rule above is additive on top of an unchanged desktop base, gated on one of this phase's
three switches (`max-shell:`, `coarse:`, or the route check) exactly as Phase 9's own "Desktop
untouched" section states for its own rules. Concretely: the tab-bar route check only ever removes
the bar from `/`, never touches its rendering on any `/design/*` route or at `shell:` width where
the bar is already hidden by the width variant; the card's phone height cap is `max-shell:`-gated on the
thumbnail box alone (the viewer, its `hideCallouts` path and the order form's `fixedFrame` usage are
untouched); every touch-sizing fix in this contract is `coarse:`-gated, so a desktop mouse at any
width sees byte-identical markup and behaviour to what exists today.

---

## UI Considerations

**49 considerations across 11 surfaces — 49 resolved, 0 open** (26 answered explicitly by this contract, 23 resting on an existing app-wide behaviour).

Produced by `gsd-core/bin/lib/ui-consideration-probe.cjs` from the eleven surfaces listed during
research, with element kinds authored deliberately rather than inferred from prose. Following the
workflow's `--auto` convention, the orchestrator authored the kinds and resolved every row as
either **explicit** (this contract or its context answers the question outright) or **backstop**
(the state is unreachable, or an existing shipped behaviour already covers it). **Nothing was
dismissed** — every row below is a real answer the founder can revisit and overrule.

### Preset card grid

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | Cannot be empty: the four presets are compile-time constants in lib/geometry/presets.ts, not fetched data. The zero-item branch is unreachable, so no empty state is designed. | _backstop_ |
| **Loading / in-flight** | No loading state: the cards are rendered by SetupScreen from static presets and draw through buildOutline synchronously, with no fetch. A signed-out visitor gets this grid immediately. | _backstop_ |
| **Error / failure** | No error state: nothing can fail. The thumbnails are computed from the same pure geometry the click applies, so there is no image to 404 and no request to reject. | _backstop_ |
| **Populated / happy path** | The happy path IS the phase's subject: four cards, one per row, each about 550px tall on a phone per D-08 (D-01's 280-320px range was measured unreachable for an upright board). The outline drawing is the focal point and may never shrink past the point where a shortboard, fish and longboard stop being tellable apart. | _explicit_ |
| **Partial / incomplete** | No partial state: every preset carries a complete outline, name, dims, descriptor and CTA by construction. A preset missing a field would be a build-time type error. | _backstop_ |
| **Overflow / truncation** | The grid scrolls vertically inside SetupScreen's own min-h-0 flex-1 overflow-y-auto root, which shrinks to fit above the tab bar with no bottom padding. Shortening the cards per D-08 takes the scroll from 4.2 screens to about 3.3. | _explicit_ |
| **Zero / one / many** | Always exactly four. Zero and one are unreachable, so no singular/plural copy or spacing variant is needed. | _backstop_ |

### Saved-board rack

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | A signed-out visitor and a signed-in shaper with no boards both get the plain preset grid with no rack section at all - not an empty-state message. This is Phase 2's shipped behaviour and app/page.tsx's Suspense fallback deliberately renders the same view. | _explicit_ |
| **Loading / in-flight** | The Suspense fallback is SetupScreen with an empty model list - the exact plain preset grid the empty and signed-out cases produce, never a spinner. A slow query is visually indistinguishable from 'no boards yet' (app/page.tsx's own doc comment). | _explicit_ |
| **Error / failure** | A failed listModels read degrades to the same no-rack view and logs server-side; one corrupt snapshot drops that single card and keeps the rest. A board-list failure must never stop a shaper starting a new board. | _explicit_ |
| **Populated / happy path** | Saved boards plus the one in-progress card sort above the preset grid, sharing the preset cards' shortened phone geometry per D-02 - one card system on the page, not two. | _explicit_ |
| **Partial / incomplete** | One unparsable row is omitted rather than rendered broken (app/page.tsx's flatMap catch). The shaper sees a shorter rack, not a damaged card. | _explicit_ |
| **Overflow / truncation** | Same vertical scroller as the preset grid. A long rack simply scrolls; D-02's shorter cards mean more boards per screen than today. | _explicit_ |
| **Zero / one / many** | Zero renders no rack section at all. One and many use the identical card and heading; no singular/plural copy is introduced by this phase. | _explicit_ |

### Rack card menu

| State | How it resolves | |
|---|---|---|
| **Loading / in-flight** | No loading state: the menu's three actions are local callbacks, opened from data already on screen. | _backstop_ |
| **Error / failure** | Errors surface in the dialog each action opens (rename's own error line, delete's confirm), not in the menu itself. The menu closes on selection. | _backstop_ |
| **Long text** | The trigger names the board in its accessible name only; the three row labels are fixed words (Rename, Duplicate, Delete), so no board name can stretch this menu. Already touch-sized: trigger coarse:size-11 (44x44 measured), rows coarse:min-h-11. | _explicit_ |

### Rename dialog

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | Opens pre-filled with the board's current name, so the field is never empty on open. Clearing it and saving is the shaper's own doing and is handled by the form's validation, unchanged by this phase. | _explicit_ |
| **Loading / in-flight** | The save is a short server action; the dialog keeps today's in-flight treatment. This phase changes sizing only, not the save lifecycle. | _backstop_ |
| **Error / failure** | The dialog's existing error line renders below the field; the 16px input text (coarse:text-base) means an error never arrives alongside an iOS zoom, which is the phone-specific half of this. | _explicit_ |
| **Partial / incomplete** | A single-field form has no partial state: either the name is valid or the existing validation rejects it. | _backstop_ |
| **Long text** | The field scrolls its own text horizontally as any input does; DialogContent is w-full max-w-[calc(100%-2rem)] sm:max-w-sm, leaving a 16px clear margin on a 360px phone, so a long name never widens the dialog. | _explicit_ |

### Name this board dialog

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | Opens empty by design - this is the 'name it' moment. The placeholder and the Save action carry the intent; the field is 44px tall on touch once D-03's coarse:h-11 lands. | _explicit_ |
| **Loading / in-flight** | Same short server action and same in-flight treatment as rename; unchanged by this phase. | _backstop_ |
| **Error / failure** | Same below-field error line as rename, at 16px text so the keyboard and the message coexist without a zoom. | _explicit_ |
| **Partial / incomplete** | Single field; no partial state. | _backstop_ |
| **Long text** | Same input scroll and same dialog width cap as rename - a long name cannot widen the dialog on a phone. | _explicit_ |

### Delete confirm dialog

| State | How it resolves | |
|---|---|---|
| **Loading / in-flight** | The delete is a short server action behind the confirm; this phase adds no new in-flight state. | _backstop_ |
| **Error / failure** | A failed delete keeps the dialog open with its message rather than closing on a lie - the board is still there, and the shaper can tell. | _explicit_ |
| **Long text** | The title quotes the board name (Delete "{name}"?). A long name wraps inside the capped dialog width rather than widening it; the two actions stay on their own line beneath. | _explicit_ |

### Replace-board confirm dialog

| State | How it resolves | |
|---|---|---|
| **Loading / in-flight** | No loading state: the discard decision is local and immediate. | _backstop_ |
| **Error / failure** | No failure path: discarding in-progress work touches only the client store. | _backstop_ |
| **Long text** | Its two variants carry fixed strings - 'Discard & Start New' and 'Discard & Open' with their own titles - so no user text enters this dialog and nothing can stretch it. | _explicit_ |

### Sign-in / sign-up dialog

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | Clerk's own <SignIn> renders its empty form; the app's dialog supplies only chrome and the title 'Sign in to save your boards'. | _backstop_ |
| **Loading / in-flight** | Clerk owns the in-flight treatment of its own form. The app adds none. | _backstop_ |
| **Error / failure** | Clerk owns credential and network errors inside its form. The app's chrome does not intercept them. | _backstop_ |
| **Partial / incomplete** | Clerk owns partial-form state and field-level validation. | _backstop_ |
| **Long text** | The app's own title is a fixed string; Clerk's form manages its own text. The dialog's width cap (w-full max-w-[calc(100%-2rem)] sm:max-w-sm) is what this phase guarantees on a 360-393px phone. | _explicit_ |

### Nav auth control

| State | How it resolves | |
|---|---|---|
| **Loading / in-flight** | Renders a fixed-size placeholder (size-7, aria-hidden) until Clerk's useUser settles, so a signed-in shaper never sees a 'Sign in' flash and the nav does not reflow. | _explicit_ |
| **Error / failure** | Clerk owns session-load failure. The placeholder simply persists; the nav does not paint an error of its own. | _backstop_ |
| **Long text** | Signed out the label is the fixed string 'Sign in', sized to 44px on touch per D-06. Signed in it is Clerk's <UserButton/>, measured first per D-05 and wrapped to 44px only if it comes up short. | _explicit_ |

### Sign-in nudge banner

| State | How it resolves | |
|---|---|---|
| **Loading / in-flight** | Renders server-side as not-dismissed and hydrates against sessionStorage through useSyncExternalStore, taking its fixed one-line height in the first frame so the drawing below never jumps (Phase 9's own rule, inherited). | _explicit_ |
| **Error / failure** | No failure path of its own: it offers a dialog and a dismissal, both local. | _backstop_ |
| **Overflow / truncation** | The copy truncates to a single line rather than wrapping to two, so the banner's height cannot grow and crowd the drawing's ceiling. | _explicit_ |
| **Long text** | Fixed copy - 'Sign in and your boards are saved.' - so no variable text enters it. Its dismiss X is the outstanding item: Phase 9's UI-SPEC specified a 44px target and it never shipped (size-4 today), so Phase 10 owns it. | _explicit_ |

### Bottom tab bar on the home route

| State | How it resolves | |
|---|---|---|
| **Loading / in-flight** | No loading state: it reads usePathname() and renders six fixed links. | _backstop_ |
| **Error / failure** | No failure path: six static links. | _backstop_ |
| **Overflow / truncation** | Six columns are flex-1 min-w-fit with an 11px dense label - the arithmetic Phase 9 settled after six equal flex-1 columns clipped TEMPLATE at 375px. This phase changes only whether the bar renders on /, not how it lays out. | _explicit_ |
| **Long text** | Six fixed labels, already fitted at 375px by Phase 9. No variable text. | _backstop_ |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `Dialog`, `AlertDialog`, `Button`, `Input` (all already installed, no new `shadcn add`) | not required |
| Third-party | none declared | not applicable |

No third-party registry is introduced by this phase. `components.json`'s `"registries": {}` stays
empty. The one code change this contract calls for inside `components/ui/*`
(`DialogContent`'s close-X gaining `coarse:size-11`) is a one-line addition to an
already-shadcn-generated, already-project-customized file — the same file `Button` and `Input`
were already edited in for their own `coarse:` rules — not a new dependency or a new registry.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-09-10
